import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 크리에이터 CSV 익스포트 — 외부 이메일 수집용. key=handle 을 첫 컬럼에 포함(매핑용).
// 인증: 관리자 쿠키(브라우저) 또는 ?token=<CREATORS_EXPORT_TOKEN|PARTNER_ADMIN_TOKEN>(프로그램).
// 옵션: ?missing=1(이메일 없는 것만) · ?limit=N
function tokenOk(url: URL): boolean {
  const t = process.env.CREATORS_EXPORT_TOKEN || process.env.PARTNER_ADMIN_TOKEN || "";
  const got = url.searchParams.get("token") || "";
  return !!t && got.length === t.length && got === t;
}
const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!(await isAdminAuthed()) && !tokenOk(url)) return new Response("unauthorized", { status: 401 });
  if (!isConfigured()) return new Response("DB 미설정", { status: 503 });
  await ensureSchema();
  const missing = url.searchParams.get("missing") === "1";
  // 기본 전량(잘림 방지). ?limit=N 축소, ?offset=N 건너뛰기(예: offset=20000 = 앞 2만 제외 나머지).
  const limit = Math.min(500000, Math.max(1, Number(url.searchParams.get("limit")) || 500000));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  // 정렬 안정화(total_views 동률 시 handle) → offset 페이지네이션이 일관됨.
  const r = await sql<{ handle: string; videos: number; total_views: string | number; avg_views: string | number; followers: string | number | null; verified: boolean | null; email: string | null; bio: string | null; brands: string[] | null; region: string | null; updated_at: string }>`
    SELECT handle, videos, total_views, avg_views, followers, verified, email, bio, brands, region, updated_at
    FROM creators
    WHERE handle IS NOT NULL AND handle <> ''
      AND handle NOT IN (SELECT value FROM blocklist WHERE kind='handle')
      AND (${missing} = false OR email IS NULL OR email = '')
    ORDER BY total_views DESC NULLS LAST, handle ASC LIMIT ${limit} OFFSET ${offset}`;

  // 컬럼: handle(=KEY) 먼저. profile_url은 외부에서 이메일 찾을 때 사용.
  const headers = ["handle", "profile_url", "followers", "videos", "total_views", "avg_views", "verified", "email", "bio", "brands", "region", "updated_at"];
  const lines = [headers.join(",")];
  for (const c of r.rows) {
    lines.push([
      csvCell(c.handle),
      csvCell(`https://www.tiktok.com/@${c.handle}`),
      csvCell(c.followers ?? ""),
      csvCell(c.videos ?? ""),
      csvCell(c.total_views ?? ""),
      csvCell(c.avg_views ?? ""),
      csvCell(c.verified ? "TRUE" : ""),
      csvCell(c.email ?? ""),
      csvCell(c.bio ?? ""),
      csvCell(Array.isArray(c.brands) ? c.brands.filter(Boolean).join(" | ") : ""),
      csvCell(c.region ?? ""),
      csvCell(c.updated_at ? String(c.updated_at).slice(0, 10) : ""),
    ].join(","));
  }
  const csv = "﻿" + lines.join("\n"); // BOM: 엑셀 한글 깨짐 방지
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="creators-${new Date().toISOString().slice(0, 10)}.csv"`,
      "X-Total-Count": String(r.rows.length), // 전량 확인용
      "Cache-Control": "no-store",
    },
  });
}

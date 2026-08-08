import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { partnerAuthed, partnerToken } from "@/lib/partner-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// glovek→admin 폴링(요청서 §4 옵션 B). 공유 브랜드 프로필을 변경분만 제공.
// 인증: Authorization: Bearer <PARTNER_ADMIN_TOKEN>
// ?since=<ISO> → profile_updated_at > since 인 레코드만. ?limit=(<=500)
export async function GET(req: Request) {
  if (!partnerToken()) return NextResponse.json({ ok: false, error: "연동 미설정(PARTNER_ADMIN_TOKEN)" }, { status: 503 });
  if (!partnerAuthed(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const url = new URL(req.url);
  const since = url.searchParams.get("since");
  const sinceD = since ? new Date(since) : null;
  const sinceIso = sinceD && !isNaN(sinceD.getTime()) ? sinceD.toISOString() : "1970-01-01T00:00:00Z";
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 200));

  const r = await sql<{ id: string; email: string; brand: string | null; name: string | null; phone: string | null; biz_no: string | null; category: string | null; brand_url: string | null; profile_updated_at: string }>`
    SELECT id, email, brand, name, phone, biz_no, category, brand_url, profile_updated_at
    FROM users WHERE profile_updated_at > ${sinceIso}
    ORDER BY profile_updated_at ASC LIMIT ${limit}`;

  const records = r.rows.map((u) => ({
    id: u.id,
    updated_at: u.profile_updated_at,
    fields: {
      brand_name: u.brand || "",
      contact_name: u.name || "",
      email: u.email,
      phone: u.phone || "",
      biz_no: u.biz_no || "",
      category: u.category || "",
      brand_url: u.brand_url || "",
    },
  }));
  // 다음 폴링 커서(마지막 레코드 시각). 없으면 요청 since 유지.
  const nextSince = records.length ? records[records.length - 1].updated_at : sinceIso;
  return NextResponse.json({ ok: true, count: records.length, nextSince, records });
}

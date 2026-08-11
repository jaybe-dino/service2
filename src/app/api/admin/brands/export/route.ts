import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 브랜드 CSV 익스포트 — 라이브 DB. key=brand_name. 영상 통계(brand_stats) + 샵 통계(brand_shop_stats) 병합.
// 인증: 관리자 쿠키 또는 ?token=. 옵션: ?limit=N (기본 전량)
function tokenOk(url: URL): boolean {
  const t = process.env.CREATORS_EXPORT_TOKEN || process.env.PARTNER_ADMIN_TOKEN || "";
  const got = url.searchParams.get("token") || "";
  return !!t && got.length === t.length && got === t;
}
const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!(await isAdminAuthed()) && !tokenOk(url)) return new Response("unauthorized", { status: 401 });
  if (!isConfigured()) return new Response("DB 미설정", { status: 503 });
  await ensureSchema();
  const limit = Math.min(100000, Math.max(1, Number(url.searchParams.get("limit")) || 100000));

  // brand_stats 기준 좌조인 brand_shop_stats(대소문자 무관). 둘 중 하나만 있어도 노출.
  const r = await sql<{
    brand_name: string; videos: number | null; influencers: number | null; total_views: string | number | null; avg_views: string | number | null; shop_count: number | null;
    products: number | null; avg_commission: string | number | null; total_sold: string | number | null; shop_gmv: string | number | null; last_collected: string | null;
  }>`
    SELECT coalesce(bs.brand_name, ss.brand_name) AS brand_name,
           bs.videos, bs.influencers, bs.total_views, bs.avg_views, bs.shop_count,
           ss.products, ss.avg_commission, ss.total_sold, ss.est_gmv AS shop_gmv,
           bt.last_collected_at AS last_collected
    FROM brand_stats bs
    FULL OUTER JOIN brand_shop_stats ss ON lower(ss.brand_name) = lower(bs.brand_name)
    LEFT JOIN brand_tracking bt ON lower(bt.brand_name) = lower(coalesce(bs.brand_name, ss.brand_name))
    WHERE coalesce(bs.brand_name, ss.brand_name) IS NOT NULL
      AND coalesce(bs.brand_name, ss.brand_name) NOT IN (SELECT value FROM blocklist WHERE kind='brand')
    ORDER BY coalesce(bs.total_views,0) DESC NULLS LAST LIMIT ${limit}`;

  const head = ["brand_name", "videos", "influencers", "total_views", "avg_views", "shop_count", "products", "avg_commission", "total_sold", "shop_est_gmv", "last_collected"];
  const lines = [head.join(",")];
  for (const b of r.rows) {
    lines.push([
      cell(b.brand_name), cell(b.videos ?? ""), cell(b.influencers ?? ""), cell(b.total_views ?? ""), cell(b.avg_views ?? ""), cell(b.shop_count ?? ""),
      cell(b.products ?? ""), cell(b.avg_commission ?? ""), cell(b.total_sold ?? ""), cell(b.shop_gmv ?? ""),
      cell(b.last_collected ? String(b.last_collected).slice(0, 10) : ""),
    ].join(","));
  }
  const csv = "﻿" + lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="brands-${new Date().toISOString().slice(0, 10)}.csv"`,
      "X-Total-Count": String(r.rows.length),
      "Cache-Control": "no-store",
    },
  });
}

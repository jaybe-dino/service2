import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 크리에이터 랭킹 — creators 집계 + '유도 GMV'(태그한 제품들의 추정 GMV 합).
// 유도 GMV: 영상 product_ref ↔ products(국가 프리픽스 제거) 매칭, (핸들,제품) 중복 제거 후 제품 GMV 합.
// 신규(롤백 가능): /creators 페이지 전용. GMV는 추정치.
export async function GET(req: Request) {
  if (!isConfigured()) return NextResponse.json({ configured: false, creators: [] });
  try {
    await ensureSchema();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const sort = url.searchParams.get("sort") || "induced"; // induced | views | videos
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 200)));

    const r = await sql<{
      handle: string; videos: number | string; total_views: string | number; avg_views: string | number;
      brands: string[] | null; induced_gmv: string | number | null; tagged_products: number | string | null;
    }>`
      SELECT c.handle, c.videos, c.total_views, c.avg_views, c.brands,
             coalesce(ig.induced_gmv, 0) AS induced_gmv, coalesce(ig.tagged_products, 0) AS tagged_products
      FROM creators c
      LEFT JOIN (
        SELECT v.handle,
               sum(pp.gmv)::bigint AS induced_gmv,
               count(distinct pp.product_id)::int AS tagged_products
        FROM (SELECT DISTINCT handle, product_ref FROM videos WHERE product_ref IS NOT NULL AND product_ref <> '' AND handle IS NOT NULL AND handle <> '') v
        JOIN (SELECT product_id, split_part(product_id, ':', 2) AS raw, coalesce(price,0)*coalesce(sold_count,0) AS gmv FROM products) pp
          ON pp.raw = v.product_ref
        GROUP BY v.handle
      ) ig ON ig.handle = c.handle
      WHERE c.handle IS NOT NULL AND c.handle <> ''
        AND c.handle NOT IN (SELECT value FROM blocklist WHERE kind='handle')
        AND (${q} = '' OR lower(c.handle) LIKE ${"%" + q + "%"})
      LIMIT 3000`;

    const creators = r.rows.map((c) => ({
      handle: c.handle,
      videos: Number(c.videos) || 0,
      totalViews: Number(c.total_views) || 0,
      avgViews: Number(c.avg_views) || 0,
      brands: Array.isArray(c.brands) ? c.brands.filter(Boolean).slice(0, 6) : [],
      inducedGmv: Math.round(Number(c.induced_gmv) || 0),
      taggedProducts: Number(c.tagged_products) || 0,
    }));
    creators.sort((a, b) =>
      sort === "views" ? b.totalViews - a.totalViews
        : sort === "videos" ? b.videos - a.videos
        : b.inducedGmv - a.inducedGmv || b.totalViews - a.totalViews,
    );

    const summary = {
      count: creators.length,
      totalInducedGmv: creators.reduce((s, c) => s + c.inducedGmv, 0),
      withInduced: creators.filter((c) => c.inducedGmv > 0).length,
    };
    return NextResponse.json({ configured: true, summary, creators: creators.slice(0, limit) });
  } catch (e) {
    return NextResponse.json({ configured: true, creators: [], error: String(e).slice(0, 160) });
  }
}

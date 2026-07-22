import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 크리에이터 상세 — 영상 집계 + 태그한 제품(유도 GMV) + 영상 리스팅.
// 신규(롤백 가능): /creator/[handle] 전용. GMV는 추정치.
export async function GET(_req: Request, ctx: { params: Promise<{ handle: string }> }) {
  if (!isConfigured()) return NextResponse.json({ configured: false }, { status: 503 });
  try {
    await ensureSchema();
    const { handle: raw } = await ctx.params;
    const handle = decodeURIComponent(raw);

    const base = await sql<{ videos: string | number; total_views: string | number; avg_views: string | number; max_views: string | number; brands: string[] | null; shop_videos: string | number; ad_videos: string | number }>`
      SELECT count(*)::int AS videos, coalesce(sum(views),0)::bigint AS total_views,
             coalesce(avg(views),0)::bigint AS avg_views, coalesce(max(views),0)::bigint AS max_views,
             array_agg(DISTINCT brand_name) FILTER (WHERE brand_name IS NOT NULL) AS brands,
             sum(CASE WHEN is_shop THEN 1 ELSE 0 END)::int AS shop_videos,
             sum(CASE WHEN is_ad THEN 1 ELSE 0 END)::int AS ad_videos
      FROM videos WHERE handle = ${handle}`;
    if (!base.rows.length || Number(base.rows[0].videos) === 0) {
      return NextResponse.json({ error: "크리에이터를 찾을 수 없습니다." }, { status: 404 });
    }
    const b = base.rows[0];

    // 태그한 제품(유도 GMV) — 영상 product_ref ↔ products(국가 프리픽스 제거).
    const prods = await sql<{ product_id: string; title: string | null; brand_name: string | null; price: string | number | null; sold_count: string | number | null; country: string | null }>`
      SELECT p.product_id, p.title, p.brand_name, p.price, p.sold_count, p.country
      FROM (SELECT DISTINCT product_ref FROM videos WHERE handle = ${handle} AND product_ref IS NOT NULL AND product_ref <> '') v
      JOIN products p ON split_part(p.product_id, ':', 2) = v.product_ref
      ORDER BY coalesce(p.price,0) * coalesce(p.sold_count,0) DESC
      LIMIT 24`;
    const products = prods.rows.map((p) => {
      const price = Number(p.price) || 0, sold = Number(p.sold_count) || 0;
      return { id: p.product_id, title: p.title || "", brand: p.brand_name || "", price, sold, gmv: Math.round(price * sold), country: (p.country || "US").toUpperCase() };
    });
    const inducedGmv = products.reduce((s, p) => s + p.gmv, 0);

    // 영상 리스팅
    const vids = await sql<{ video_id: string; brand_name: string | null; views: string | number; likes: string | number; url: string | null; country: string | null; is_ad: boolean; is_shop: boolean; posted_at: string | null; product_ref: string | null }>`
      SELECT video_id, brand_name, views, likes, url, country, is_ad, is_shop, posted_at, product_ref
      FROM videos WHERE handle = ${handle} ORDER BY views DESC LIMIT 30`;
    const videos = vids.rows.map((v) => ({
      id: v.video_id, brand: v.brand_name || "", views: Number(v.views) || 0, likes: Number(v.likes) || 0,
      url: v.url || "", country: (v.country || "US").toUpperCase(), isAd: !!v.is_ad, isShop: !!v.is_shop,
      postedAt: v.posted_at ? String(v.posted_at).slice(0, 10) : "", hasProduct: !!v.product_ref,
    }));

    return NextResponse.json({
      configured: true,
      creator: {
        handle,
        videos: Number(b.videos) || 0,
        totalViews: Number(b.total_views) || 0,
        avgViews: Number(b.avg_views) || 0,
        maxViews: Number(b.max_views) || 0,
        brands: Array.isArray(b.brands) ? b.brands.filter(Boolean) : [],
        shopVideos: Number(b.shop_videos) || 0,
        adVideos: Number(b.ad_videos) || 0,
        inducedGmv,
        taggedProducts: products.length,
      },
      products,
      videos,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 160) }, { status: 500 });
  }
}

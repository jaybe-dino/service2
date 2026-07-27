import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 바이럴 영상 랭킹 — videos + video_snapshots(조회수 증분). 국가/광고·샵/브랜드 필터.
// 신규(롤백 가능): /videos 페이지 전용.
export async function GET(req: Request) {
  if (!isConfigured()) return NextResponse.json({ configured: false, videos: [] });
  try {
    await ensureSchema();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const sort = url.searchParams.get("sort") || "views"; // views | growth
    const country = (url.searchParams.get("country") || "").trim().toUpperCase();
    const onlyShop = url.searchParams.get("shop") === "1";
    const period = Math.max(1, Math.min(90, Number(url.searchParams.get("period") || 7)));
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 100)));

    const r = await sql<{
      video_id: string; handle: string | null; brand_name: string | null; views: string | number; likes: string | number;
      url: string | null; country: string | null; is_ad: boolean; is_shop: boolean; posted_at: string | null;
      product_ref: string | null; views_past: string | number | null;
    }>`
      SELECT v.video_id, v.handle, v.brand_name, v.views, v.likes, v.url, v.country, v.is_ad, v.is_shop, v.posted_at, v.product_ref,
             (SELECT vs.views FROM video_snapshots vs
              WHERE vs.video_id = v.video_id AND vs.snap_date <= CURRENT_DATE - ${period}::int
              ORDER BY vs.snap_date DESC LIMIT 1) AS views_past
      FROM videos v
      WHERE (v.brand_name IS NULL OR v.brand_name NOT IN (SELECT value FROM blocklist WHERE kind='brand'))
        AND (v.handle IS NULL OR v.handle NOT IN (SELECT value FROM blocklist WHERE kind='handle'))
        AND (${country} = '' OR upper(coalesce(v.country,'US')) = ${country})
        AND (${onlyShop} = false OR v.is_shop = true)
        AND (${q} = '' OR lower(coalesce(v.handle,'')) LIKE ${"%" + q + "%"} OR lower(coalesce(v.brand_name,'')) LIKE ${"%" + q + "%"})
      ORDER BY v.views DESC
      LIMIT 1500`;

    const videos = r.rows.map((v) => {
      const views = Number(v.views) || 0;
      const past = v.views_past != null ? Number(v.views_past) : null;
      const growth = past != null ? views - past : null;
      return {
        id: v.video_id, handle: v.handle || "", brand: v.brand_name || "",
        views, likes: Number(v.likes) || 0, url: v.url || "", country: (v.country || "US").toUpperCase(),
        isAd: !!v.is_ad, isShop: !!v.is_shop, postedAt: v.posted_at ? String(v.posted_at).slice(0, 10) : "",
        hasProduct: !!v.product_ref,
        engage: views > 0 ? Math.round((Number(v.likes) / views) * 1000) / 10 : 0,
        growth, growthPct: growth != null && past && past > 0 ? Math.round((growth / past) * 1000) / 10 : null,
      };
    });
    if (sort === "growth") videos.sort((a, b) => (b.growth ?? -1) - (a.growth ?? -1));

    return NextResponse.json({ configured: true, count: videos.length, videos: videos.slice(0, limit) });
  } catch (e) {
    return NextResponse.json({ configured: true, videos: [], error: String(e).slice(0, 160) });
  }
}

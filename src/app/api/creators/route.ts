import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 크리에이터 발굴 — creators + videos 파생지표(참여율·최근활동·국가·샵/광고) + 유도 GMV + 적합도 스코어.
// 필터: tier·country·minViews·minEngage·recentDays·hasTag. 정렬: fit(적합도)·induced·views·videos·recent.
const tierOf = (avg: number) => (avg >= 1_000_000 ? "mega" : avg >= 100_000 ? "macro" : "micro");

export async function GET(req: Request) {
  if (!isConfigured()) return NextResponse.json({ configured: false, creators: [] });
  try {
    await ensureSchema();
    const u = new URL(req.url);
    const q = (u.searchParams.get("q") || "").trim().toLowerCase();
    const sort = u.searchParams.get("sort") || "fit"; // fit | induced | views | videos | recent
    const tier = (u.searchParams.get("tier") || "").trim(); // mega|macro|micro
    const country = (u.searchParams.get("country") || "").trim().toUpperCase();
    const minViews = Number(u.searchParams.get("minViews") || "") || 0; // 평균 조회 하한
    const minEngage = Number(u.searchParams.get("minEngage") || "") || 0; // 참여율(%) 하한
    const recentDays = Number(u.searchParams.get("recentDays") || "") || 0; // 최근 N일 내 활동
    const hasTag = u.searchParams.get("hasTag") === "1"; // 제품태그 경험 有
    const limit = Math.min(500, Math.max(1, Number(u.searchParams.get("limit") || 200)));

    // 핸들별 영상 파생지표 + 유도 GMV 조인.
    const r = await sql<{
      handle: string; videos: number | string; total_views: string | number; avg_views: string | number; brands: string[] | null;
      induced_gmv: string | number | null; tagged_products: number | string | null;
      avg_likes: string | number | null; last_posted: string | null; countries: string[] | null;
      shop_cnt: number | string | null; ad_cnt: number | string | null; vcount: number | string | null;
      email: string | null; bio: string | null; followers: string | number | null; verified: boolean | null;
    }>`
      SELECT c.handle, c.videos, c.total_views, c.avg_views, c.brands, c.email, c.bio, c.followers, c.verified,
             coalesce(ig.induced_gmv, 0) AS induced_gmv, coalesce(ig.tagged_products, 0) AS tagged_products,
             va.avg_likes, va.last_posted, va.countries, va.shop_cnt, va.ad_cnt, va.vcount
      FROM creators c
      LEFT JOIN (
        SELECT handle, avg(likes)::bigint AS avg_likes, max(posted_at) AS last_posted,
               array_agg(DISTINCT country) FILTER (WHERE country IS NOT NULL) AS countries,
               sum(CASE WHEN is_shop THEN 1 ELSE 0 END)::int AS shop_cnt,
               sum(CASE WHEN is_ad THEN 1 ELSE 0 END)::int AS ad_cnt, count(*)::int AS vcount
        FROM videos WHERE handle IS NOT NULL AND handle <> '' GROUP BY handle
      ) va ON va.handle = c.handle
      LEFT JOIN (
        SELECT v.handle, sum(pp.gmv)::bigint AS induced_gmv, count(distinct pp.product_id)::int AS tagged_products
        FROM (SELECT DISTINCT handle, product_ref FROM videos WHERE product_ref IS NOT NULL AND product_ref <> '' AND handle IS NOT NULL AND handle <> '') v
        JOIN (SELECT product_id, split_part(product_id, ':', 2) AS raw, coalesce(price,0)*coalesce(sold_count,0) AS gmv FROM products) pp ON pp.raw = v.product_ref
        GROUP BY v.handle
      ) ig ON ig.handle = c.handle
      WHERE c.handle IS NOT NULL AND c.handle <> ''
        AND c.handle NOT IN (SELECT value FROM blocklist WHERE kind='handle')
        AND (${q} = '' OR lower(c.handle) LIKE ${"%" + q + "%"})
      LIMIT 5000`;

    const now = Date.now();
    let list = r.rows.map((c) => {
      const avgViews = Number(c.avg_views) || 0;
      const avgLikes = Number(c.avg_likes) || 0;
      const engage = avgViews > 0 ? Math.round((avgLikes / avgViews) * 1000) / 10 : 0;
      const inducedGmv = Math.round(Number(c.induced_gmv) || 0);
      const taggedProducts = Number(c.tagged_products) || 0;
      const vcount = Number(c.vcount) || 0;
      const shopRatio = vcount ? Math.round((Number(c.shop_cnt) || 0) / vcount * 100) : 0;
      const adRatio = vcount ? Math.round((Number(c.ad_cnt) || 0) / vcount * 100) : 0;
      const lastPosted = c.last_posted ? String(c.last_posted).slice(0, 10) : "";
      const daysSince = lastPosted ? Math.floor((now - new Date(lastPosted).getTime()) / 86_400_000) : 9999;
      // 적합도 스코어(0~100): 성과(조회) + 참여율 + 태그이력 + 최근활동 (설명가능)
      const sViews = Math.min(1, avgViews / 1_000_000);          // 100만=만점
      const sEng = Math.min(1, engage / 12);                     // 12%=만점
      const sTag = taggedProducts > 0 ? 1 : 0;
      const sRecency = daysSince <= 14 ? 1 : daysSince <= 30 ? 0.7 : daysSince <= 90 ? 0.4 : 0.1;
      const fit = Math.round((sViews * 40 + sEng * 30 + sTag * 20 + sRecency * 10));
      const reasons = [
        avgViews >= 100_000 ? `평균 조회 ${avgViews >= 1_000_000 ? (avgViews / 1e6).toFixed(1) + "M" : Math.round(avgViews / 1000) + "K"}` : null,
        engage >= 6 ? `참여율 ${engage}%` : null,
        taggedProducts > 0 ? `제품태그 ${taggedProducts}건 경험` : null,
        daysSince <= 30 ? "최근 활동" : null,
      ].filter(Boolean) as string[];
      return {
        handle: c.handle, videos: Number(c.videos) || 0, totalViews: Number(c.total_views) || 0, avgViews,
        brands: Array.isArray(c.brands) ? c.brands.filter(Boolean).slice(0, 6) : [],
        inducedGmv, taggedProducts, engage, shopRatio, adRatio, lastPosted, daysSince,
        tier: tierOf(avgViews), countries: Array.isArray(c.countries) ? c.countries.filter(Boolean) : [],
        fit, reasons,
        email: c.email || "", hasEmail: !!c.email, followers: Number(c.followers) || 0, verified: !!c.verified,
        bio: c.bio ? String(c.bio).slice(0, 200) : "",
      };
    });

    // 필터
    list = list.filter((c) =>
      (!tier || c.tier === tier) &&
      (!country || c.countries.includes(country)) &&
      (minViews <= 0 || c.avgViews >= minViews) &&
      (minEngage <= 0 || c.engage >= minEngage) &&
      (recentDays <= 0 || c.daysSince <= recentDays) &&
      (!hasTag || c.taggedProducts > 0),
    );
    list.sort((a, b) =>
      sort === "views" ? b.totalViews - a.totalViews
        : sort === "videos" ? b.videos - a.videos
        : sort === "recent" ? a.daysSince - b.daysSince
        : sort === "induced" ? b.inducedGmv - a.inducedGmv || b.fit - a.fit
        : b.fit - a.fit || b.inducedGmv - a.inducedGmv, // fit(기본)
    );

    const summary = {
      count: list.length,
      totalInducedGmv: list.reduce((s, c) => s + c.inducedGmv, 0),
      withInduced: list.filter((c) => c.inducedGmv > 0).length,
      withTag: list.filter((c) => c.taggedProducts > 0).length,
    };
    return NextResponse.json({ configured: true, summary, creators: list.slice(0, limit) });
  } catch (e) {
    return NextResponse.json({ configured: true, creators: [], error: String(e).slice(0, 160) });
  }
}

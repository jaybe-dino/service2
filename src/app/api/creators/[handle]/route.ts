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
    // Next 15 route params는 이미 디코드됨 — 이중 디코드 시 '%' 포함 핸들에서 URIError. 안전 폴백.
    let handle = raw;
    try { handle = decodeURIComponent(raw); } catch { handle = raw; }

    const base = await sql<{ videos: string | number; total_views: string | number; avg_views: string | number; max_views: string | number; avg_likes: string | number; last_posted: string | null; countries: string[] | null; brands: string[] | null; shop_videos: string | number; ad_videos: string | number }>`
      SELECT count(*)::int AS videos, coalesce(sum(views),0)::bigint AS total_views,
             coalesce(avg(views),0)::bigint AS avg_views, coalesce(max(views),0)::bigint AS max_views,
             coalesce(avg(likes),0)::bigint AS avg_likes, max(posted_at) AS last_posted,
             array_agg(DISTINCT country) FILTER (WHERE country IS NOT NULL) AS countries,
             array_agg(DISTINCT brand_name) FILTER (WHERE brand_name IS NOT NULL) AS brands,
             sum(CASE WHEN is_shop THEN 1 ELSE 0 END)::int AS shop_videos,
             sum(CASE WHEN is_ad THEN 1 ELSE 0 END)::int AS ad_videos
      FROM videos WHERE handle = ${handle}`;
    if (!base.rows.length || Number(base.rows[0].videos) === 0) {
      return NextResponse.json({ error: "크리에이터를 찾을 수 없습니다." }, { status: 404 });
    }
    const b = base.rows[0];
    // 프로필 보강(bio·공개 이메일·팔로워·인증)
    const prof = (await sql<{ bio: string | null; email: string | null; followers: string | number | null; verified: boolean | null }>`
      SELECT bio, email, followers, verified FROM creators WHERE handle = ${handle} LIMIT 1`).rows[0];

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

    // ── 아웃리치 판단 지표: 참여율·최근활동·티어·추정단가·적합도 ──
    const vTotal = Number(b.videos) || 0;
    const avgViews = Number(b.avg_views) || 0;
    const avgLikes = Number(b.avg_likes) || 0;
    const engage = avgViews > 0 ? Math.round((avgLikes / avgViews) * 1000) / 10 : 0;
    const shopVideos = Number(b.shop_videos) || 0, adVideos = Number(b.ad_videos) || 0;
    const shopRatio = vTotal ? Math.round((shopVideos / vTotal) * 100) : 0;
    const adRatio = vTotal ? Math.round((adVideos / vTotal) * 100) : 0;
    const lastPosted = b.last_posted ? String(b.last_posted).slice(0, 10) : "";
    const daysSince = lastPosted ? Math.floor((Date.now() - new Date(lastPosted).getTime()) / 86_400_000) : 9999;
    const tier = avgViews >= 1_000_000 ? "mega" : avgViews >= 100_000 ? "macro" : "micro";
    // 추정 단가(USD, 추정치): 평균조회 × CPM 계수(뷰티 UGC 근사 $12/1k). 라벨로 '추정' 명시.
    const estRateUsd = Math.round((avgViews / 1000) * 12);
    const sViews = Math.min(1, avgViews / 1_000_000), sEng = Math.min(1, engage / 12);
    const sTag = products.length > 0 ? 1 : 0;
    const sRecency = daysSince <= 14 ? 1 : daysSince <= 30 ? 0.7 : daysSince <= 90 ? 0.4 : 0.1;
    const fit = Math.round(sViews * 40 + sEng * 30 + sTag * 20 + sRecency * 10);
    const reasons = [
      avgViews >= 100_000 ? `평균 조회 ${avgViews >= 1_000_000 ? (avgViews / 1e6).toFixed(1) + "M" : Math.round(avgViews / 1000) + "K"}` : null,
      engage >= 6 ? `높은 참여율 ${engage}%` : null,
      products.length > 0 ? `제품태그 협업 ${products.length}건(유도 GMV 실적)` : null,
      daysSince <= 30 ? "최근 활발히 활동" : null,
      shopRatio >= 20 ? `커머스 콘텐츠 비중 ${shopRatio}%` : null,
    ].filter(Boolean) as string[];

    return NextResponse.json({
      configured: true,
      creator: {
        handle,
        videos: vTotal,
        totalViews: Number(b.total_views) || 0,
        avgViews,
        maxViews: Number(b.max_views) || 0,
        brands: Array.isArray(b.brands) ? b.brands.filter(Boolean) : [],
        countries: Array.isArray(b.countries) ? b.countries.filter(Boolean) : [],
        shopVideos, adVideos, shopRatio, adRatio,
        engage, lastPosted, daysSince, tier, estRateUsd, fit, reasons,
        inducedGmv,
        taggedProducts: products.length,
        email: prof?.email || "", hasEmail: !!prof?.email, bio: prof?.bio || "",
        followers: Number(prof?.followers) || 0, verified: !!prof?.verified,
      },
      products,
      videos,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 160) }, { status: 500 });
  }
}

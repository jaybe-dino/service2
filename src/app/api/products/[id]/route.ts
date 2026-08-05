import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { classifyProduct, subClassifyProduct, CATEGORY_LABEL, SUBCATEGORY_LABEL } from "@/lib/ktrend/classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 제품 상세 (kalodata product/detail형) — 제품 지표 + 판매/GMV/가격 추이(기간) +
// 연결 크리에이터(이 제품 유도 GMV·적합도) + 관련 영상 + 카테고리 순위/동일 카테고리.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isConfigured()) return NextResponse.json({ configured: false }, { status: 503 });
  try {
    await ensureSchema();
    const { id } = await ctx.params;
    const period = Math.min(90, Math.max(7, Number(new URL(req.url).searchParams.get("period")) || 30));
    const pr = await sql<{
      product_id: string; brand_name: string | null; title: string | null;
      price: string | number | null; currency: string | null;
      sold_count: string | number | null; commission_rate: string | number | null; url: string | null; image_url: string | null;
    }>`SELECT product_id, brand_name, title, price, currency, sold_count, commission_rate, url, image_url
       FROM products WHERE product_id = ${id} LIMIT 1`;
    if (!pr.rows.length) return NextResponse.json({ error: "제품을 찾을 수 없습니다." }, { status: 404 });
    const p = pr.rows[0];
    const price = Number(p.price) || 0;
    const sold = Number(p.sold_count) || 0;
    const gmv = Math.round(price * sold);

    const brand = p.brand_name || "";
    const country = (id.includes(":") ? id.slice(0, id.indexOf(":")) : "").toUpperCase();
    // 제품ID(국가 프리픽스 제거) — 영상 product_ref(원시 상품ID)와 직접 매칭용.
    const rawId = id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
    const category = classifyProduct(p.title);
    const subId = subClassifyProduct(p.title, category).sub;

    // 제품↔영상↔크리에이터 매칭: product_ref 직접 태그 우선, 없으면 브랜드 폴백.
    const [vids, creators] = brand
      ? await Promise.all([
          sql<{ video_id: string; handle: string | null; views: string | number; likes: string | number; url: string | null; country: string | null; is_ad: boolean; is_shop: boolean; posted_at: string | null; cover_url: string | null; direct: boolean }>`
            SELECT video_id, handle, views, likes, url, country, is_ad, is_shop, posted_at, cover_url, (product_ref = ${rawId}) AS direct FROM videos
            WHERE (product_ref = ${rawId} OR lower(coalesce(brand_name,'')) = lower(${brand}))
              AND (handle IS NULL OR handle NOT IN (SELECT value FROM blocklist WHERE kind='handle'))
            ORDER BY (product_ref = ${rawId}) DESC, views DESC LIMIT 200`,
          sql<{ handle: string; videos: number; total_views: string | number; max_views: string | number; direct_views: string | number; avg_likes: string | number; last_posted: string | null; direct: boolean }>`
            SELECT handle, count(*)::int AS videos, sum(views)::bigint AS total_views, max(views)::bigint AS max_views,
                   sum(CASE WHEN product_ref = ${rawId} THEN views ELSE 0 END)::bigint AS direct_views,
                   coalesce(avg(likes),0)::bigint AS avg_likes, max(posted_at) AS last_posted,
                   bool_or(product_ref = ${rawId}) AS direct
            FROM videos WHERE (product_ref = ${rawId} OR lower(coalesce(brand_name,'')) = lower(${brand})) AND handle IS NOT NULL AND handle <> ''
              AND handle NOT IN (SELECT value FROM blocklist WHERE kind='handle')
            GROUP BY handle ORDER BY bool_or(product_ref = ${rawId}) DESC, total_views DESC LIMIT 16`,
        ])
      : [{ rows: [] as never[] }, { rows: [] as never[] }];

    const directCount = (vids.rows as { direct?: boolean }[]).filter((v) => v.direct).length;
    // 이 제품 직접 태그 영상의 총 조회수 — 크리에이터별 유도 GMV 배분 기준.
    const totalDirectViews = (creators.rows as { direct_views?: string | number }[]).reduce((s, c) => s + (Number(c.direct_views) || 0), 0);

    // 연결 크리에이터: 유도 GMV(이 제품, 조회수 비례 추정) + 적합도.
    const connectedCreators = (creators.rows as { handle: string; videos: number; total_views: string | number; max_views: string | number; direct_views: string | number; avg_likes: string | number; last_posted: string | null; direct: boolean }[]).map((c) => {
      const cViews = Number(c.total_views) || 0;
      const cVideos = Number(c.videos) || 0;
      const avgViews = cVideos ? Math.round(cViews / cVideos) : 0;
      const avgLikes = Number(c.avg_likes) || 0;
      const engage = avgViews > 0 ? Math.round((avgLikes / avgViews) * 1000) / 10 : 0;
      const dViews = Number(c.direct_views) || 0;
      // 유도 GMV(추정): 이 제품 GMV × (이 크리에이터 직접태그 조회수 / 전체 직접태그 조회수).
      const inducedGmv = c.direct && totalDirectViews > 0 ? Math.round(gmv * (dViews / totalDirectViews)) : 0;
      const lastPosted = c.last_posted ? String(c.last_posted).slice(0, 10) : "";
      const daysSince = lastPosted ? Math.floor((Date.now() - new Date(lastPosted).getTime()) / 86_400_000) : 9999;
      const sViews = Math.min(1, avgViews / 1_000_000), sEng = Math.min(1, engage / 12);
      const sTag = c.direct ? 1 : 0;
      const sRecency = daysSince <= 14 ? 1 : daysSince <= 30 ? 0.7 : daysSince <= 90 ? 0.4 : 0.1;
      const fit = Math.round(sViews * 40 + sEng * 30 + sTag * 20 + sRecency * 10);
      return { handle: c.handle, videos: cVideos, totalViews: cViews, maxViews: Number(c.max_views) || 0, avgViews, engage, inducedGmv, fit, direct: !!c.direct };
    });
    // 유도 GMV(있으면) → 총조회수 순.
    connectedCreators.sort((a, b) => (b.inducedGmv - a.inducedGmv) || (b.totalViews - a.totalViews));

    // kalodata식 판매/GMV/가격 추이 — 일별 스냅샷(product_snapshots) 기간 선택(7/30/90일).
    const snaps = await sql<{ snap_date: string; sold_count: string | number; est_gmv: string | number; price: string | number | null }>`
      SELECT snap_date, sold_count, est_gmv, price FROM product_snapshots
      WHERE product_id = ${id} AND snap_date >= CURRENT_DATE - ${period}::int ORDER BY snap_date ASC`;
    const series = snaps.rows.map((s) => ({ date: String(s.snap_date).slice(0, 10), sold: Number(s.sold_count) || 0, gmv: Math.round(Number(s.est_gmv) || 0), price: s.price != null ? Number(s.price) : null }));
    let trend: { series: typeof series; soldGrowth: number; soldGrowthPct: number | null; gmvGrowth: number; days: number; period: number } | null = null;
    if (series.length >= 2) {
      const first = series[0], last = series[series.length - 1];
      const soldGrowth = last.sold - first.sold;
      trend = {
        series,
        soldGrowth,
        soldGrowthPct: first.sold > 0 ? Math.round((soldGrowth / first.sold) * 1000) / 10 : null,
        gmvGrowth: last.gmv - first.gmv,
        days: series.length,
        period,
      };
    }
    const priceSeries = series.filter((s) => s.price != null).map((s) => ({ date: s.date, price: s.price as number }));

    // 카테고리 내 순위 + 동일 카테고리 상위 제품 — 제목 분류(읽기 시 계산).
    // GMV 상위 후보를 제한 조회 후 JS 분류(카테고리 컬럼 미저장).
    let rankInCategory: { rank: number; total: number; capped: boolean } | null = null;
    const similar: { id: string; title: string; brand: string; gmv: number; sold: number; country: string; image: string }[] = [];
    const CAP = 1500;
    const cand = await sql<{ product_id: string; title: string | null; brand_name: string | null; price: string | number | null; sold_count: string | number | null; country: string | null; image_url: string | null }>`
      SELECT product_id, title, brand_name, price, sold_count, country, image_url FROM products
      ORDER BY coalesce(price,0) * coalesce(sold_count,0) DESC LIMIT ${CAP}`;
    const sameCat = cand.rows
      .map((r) => ({ id: r.product_id, title: r.title || "", brand: r.brand_name || "", gmv: Math.round((Number(r.price) || 0) * (Number(r.sold_count) || 0)), sold: Number(r.sold_count) || 0, country: (r.country || "").toUpperCase(), image: r.image_url || "", cat: classifyProduct(r.title) }))
      .filter((r) => r.cat === category);
    if (sameCat.length) {
      const idx = sameCat.findIndex((r) => r.id === id);
      if (idx >= 0) rankInCategory = { rank: idx + 1, total: sameCat.length, capped: cand.rows.length >= CAP };
      for (const r of sameCat) {
        if (r.id === id || similar.length >= 6) continue;
        similar.push({ id: r.id, title: r.title, brand: r.brand, gmv: r.gmv, sold: r.sold, country: r.country, image: r.image });
      }
    }

    return NextResponse.json({
      configured: true,
      matchMode: directCount > 0 ? "direct" : "brand", // 직접 상품태그 매칭 여부
      directCount, // 이 제품을 직접 태그한 영상 수(정확 맵핑)
      trend,
      priceSeries,
      category,
      categoryLabel: CATEGORY_LABEL[category],
      subLabel: category !== "other" ? SUBCATEGORY_LABEL[subId] : null,
      rankInCategory,
      product: {
        id: p.product_id, brand, title: p.title || "", price, currency: p.currency || "USD", sold, country,
        gmv, commission: p.commission_rate != null ? Number(p.commission_rate) : null, url: p.url || "", image: p.image_url || "",
      },
      relatedVideos: vids.rows.map((v) => ({ id: v.video_id, handle: v.handle || "", views: Number(v.views) || 0, likes: Number(v.likes) || 0, url: v.url || "", country: v.country || "", isAd: !!v.is_ad, isShop: !!v.is_shop, postedAt: v.posted_at ? String(v.posted_at).slice(0, 10) : "", cover: v.cover_url || "", direct: !!v.direct })),
      // 하위호환: 기존 relatedCreators 필드 유지 + 확장 필드는 connectedCreators.
      relatedCreators: connectedCreators.map((c) => ({ handle: c.handle, videos: c.videos, totalViews: c.totalViews, maxViews: c.maxViews, direct: c.direct })),
      connectedCreators,
      similar,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 160) }, { status: 500 });
  }
}

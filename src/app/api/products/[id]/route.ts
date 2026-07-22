import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 제품 상세 — products 1건 + 같은 브랜드 관련 영상(영상↔제품 직접 링크는 P1에서 추가).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isConfigured()) return NextResponse.json({ configured: false }, { status: 503 });
  try {
    await ensureSchema();
    const { id } = await ctx.params;
    const pr = await sql<{
      product_id: string; brand_name: string | null; title: string | null;
      price: string | number | null; currency: string | null;
      sold_count: string | number | null; commission_rate: string | number | null; url: string | null;
    }>`SELECT product_id, brand_name, title, price, currency, sold_count, commission_rate, url
       FROM products WHERE product_id = ${id} LIMIT 1`;
    if (!pr.rows.length) return NextResponse.json({ error: "제품을 찾을 수 없습니다." }, { status: 404 });
    const p = pr.rows[0];
    const price = Number(p.price) || 0;
    const sold = Number(p.sold_count) || 0;

    const brand = p.brand_name || "";
    // 제품ID(국가 프리픽스 제거) — 영상 product_ref(원시 상품ID)와 직접 매칭용.
    const rawId = id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
    // 제품↔영상↔크리에이터 매칭: product_ref 직접 태그 우선, 없으면 브랜드 폴백.
    const [vids, creators] = brand
      ? await Promise.all([
          sql<{ video_id: string; handle: string | null; views: string | number; likes: string | number; url: string | null; country: string | null; is_ad: boolean; is_shop: boolean; direct: boolean }>`
            SELECT video_id, handle, views, likes, url, country, is_ad, is_shop, (product_ref = ${rawId}) AS direct FROM videos
            WHERE product_ref = ${rawId} OR lower(coalesce(brand_name,'')) = lower(${brand})
            ORDER BY (product_ref = ${rawId}) DESC, views DESC LIMIT 12`,
          sql<{ handle: string; videos: number; total_views: string | number; max_views: string | number; direct: boolean }>`
            SELECT handle, count(*)::int AS videos, sum(views)::bigint AS total_views, max(views)::bigint AS max_views, bool_or(product_ref = ${rawId}) AS direct
            FROM videos WHERE (product_ref = ${rawId} OR lower(coalesce(brand_name,'')) = lower(${brand})) AND handle IS NOT NULL AND handle <> ''
            GROUP BY handle ORDER BY bool_or(product_ref = ${rawId}) DESC, total_views DESC LIMIT 12`,
        ])
      : [{ rows: [] as never[] }, { rows: [] as never[] }];

    const directCount = (vids.rows as { direct?: boolean }[]).filter((v) => v.direct).length;

    return NextResponse.json({
      configured: true,
      matchMode: directCount > 0 ? "direct" : "brand", // 직접 상품태그 매칭 여부
      product: {
        id: p.product_id, brand, title: p.title || "", price, currency: p.currency || "USD", sold,
        gmv: Math.round(price * sold), commission: p.commission_rate != null ? Number(p.commission_rate) : null, url: p.url || "",
      },
      relatedVideos: vids.rows.map((v) => ({ id: v.video_id, handle: v.handle || "", views: Number(v.views) || 0, likes: Number(v.likes) || 0, url: v.url || "", country: v.country || "", isAd: !!v.is_ad, isShop: !!v.is_shop, direct: !!v.direct })),
      relatedCreators: creators.rows.map((c) => ({ handle: c.handle, videos: Number(c.videos) || 0, totalViews: Number(c.total_views) || 0, maxViews: Number(c.max_views) || 0, direct: !!c.direct })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 160) }, { status: 500 });
  }
}

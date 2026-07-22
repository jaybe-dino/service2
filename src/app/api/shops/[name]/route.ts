import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { classifyProduct, CATEGORY_LABEL, CATEGORY_ICON, type CategoryId } from "@/lib/ktrend/classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 샵(브랜드) 상세 — products/videos 실데이터 종합. 제품·크리에이터·카테고리·국가 분해.
// 신규(롤백 가능): /shop/[name] 전용. GMV는 추정치.
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  if (!isConfigured()) return NextResponse.json({ configured: false }, { status: 503 });
  try {
    await ensureSchema();
    const { name: raw } = await ctx.params;
    const name = decodeURIComponent(raw);

    // 제품 전체(집계 + 카테고리/국가 분해용)
    const prodRows = await sql<{ product_id: string; title: string | null; price: string | number | null; sold_count: string | number | null; commission_rate: string | number | null; url: string | null; country: string | null }>`
      SELECT product_id, title, price, sold_count, commission_rate, url, country
      FROM products WHERE lower(coalesce(brand_name,'')) = lower(${name})
        AND brand_name NOT IN (SELECT value FROM blocklist WHERE kind='brand')
      LIMIT 5000`;
    if (!prodRows.rows.length) {
      // 제품이 없어도 브랜드 콘텐츠 통계는 있을 수 있음 → 404 대신 빈 상세 반환 시도
      const bstat = await sql<{ videos: string | number; total_views: string | number }>`
        SELECT videos, total_views FROM brand_stats WHERE lower(brand_name)=lower(${name}) LIMIT 1`;
      if (!bstat.rows.length) return NextResponse.json({ error: "샵을 찾을 수 없습니다." }, { status: 404 });
    }

    const products = prodRows.rows.map((p) => {
      const price = Number(p.price) || 0, sold = Number(p.sold_count) || 0;
      return { id: p.product_id, title: p.title || "", price, sold, gmv: Math.round(price * sold),
        commission: p.commission_rate != null ? Number(p.commission_rate) : null,
        url: p.url || "", country: (p.country || "US").toUpperCase(), category: classifyProduct(p.title) };
    });

    const totalGmv = products.reduce((s, p) => s + p.gmv, 0);
    const totalSold = products.reduce((s, p) => s + p.sold, 0);
    const comms = products.filter((p) => p.commission != null).map((p) => p.commission as number);
    const avgCommission = comms.length ? Math.round((comms.reduce((s, c) => s + c, 0) / comms.length) * 10) / 10 : null;

    // 카테고리 분해
    const catAgg: Record<string, { id: CategoryId; products: number; gmv: number }> = {};
    for (const p of products) { const a = (catAgg[p.category] ??= { id: p.category, products: 0, gmv: 0 }); a.products += 1; a.gmv += p.gmv; }
    const categories = Object.values(catAgg).map((a) => ({ id: a.id, label: CATEGORY_LABEL[a.id], icon: CATEGORY_ICON[a.id], products: a.products, gmv: a.gmv })).sort((x, y) => y.gmv - x.gmv);

    // 국가 분해
    const ctryAgg: Record<string, { country: string; products: number; gmv: number }> = {};
    for (const p of products) { const a = (ctryAgg[p.country] ??= { country: p.country, products: 0, gmv: 0 }); a.products += 1; a.gmv += p.gmv; }
    const countries = Object.values(ctryAgg).sort((x, y) => y.gmv - x.gmv);

    const topProducts = [...products].sort((a, b) => b.gmv - a.gmv).slice(0, 12);

    // 브랜드 콘텐츠 통계 + 상위 크리에이터
    const bstat = await sql<{ videos: string | number; total_views: string | number; influencers: string | number }>`
      SELECT videos, total_views, influencers FROM brand_stats WHERE lower(brand_name)=lower(${name}) LIMIT 1`;
    const creatorsRows = await sql<{ handle: string; videos: string | number; total_views: string | number; max_views: string | number }>`
      SELECT handle, count(*)::int AS videos, sum(views)::bigint AS total_views, max(views)::bigint AS max_views
      FROM videos WHERE lower(coalesce(brand_name,''))=lower(${name}) AND handle IS NOT NULL AND handle <> ''
        AND handle NOT IN (SELECT value FROM blocklist WHERE kind='handle')
      GROUP BY handle ORDER BY total_views DESC LIMIT 12`;
    const creators = creatorsRows.rows.map((c) => ({ handle: c.handle, videos: Number(c.videos) || 0, totalViews: Number(c.total_views) || 0, maxViews: Number(c.max_views) || 0 }));

    return NextResponse.json({
      configured: true,
      shop: {
        name,
        products: products.length,
        totalSold,
        totalGmv,
        avgCommission,
        videos: Number(bstat.rows[0]?.videos) || 0,
        totalViews: Number(bstat.rows[0]?.total_views) || 0,
        influencers: Number(bstat.rows[0]?.influencers) || creators.length,
      },
      categories,
      countries,
      topProducts,
      creators,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 160) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 샵(셀러) 랭킹 — 1차 구현은 브랜드 단위 TikTok Shop 집계(brand_shop_stats)를 '샵'으로 노출.
// 기존 실데이터 재활용 → 별도 크롤 없이 즉시 표시. (독립 shops 테이블/셀러타입은 P1에서 확장)
// 신규(롤백 가능): 메뉴 비노출, /shops 전용. GMV는 추정치.
export async function GET(req: Request) {
  if (!isConfigured()) return NextResponse.json({ configured: false, shops: [], count: 0 });
  try {
    await ensureSchema();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const sort = url.searchParams.get("sort") || "gmv"; // gmv | sold | products
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 200)));
    const country = (url.searchParams.get("country") || "").trim().toUpperCase(); // "" = 전체

    // products에서 (브랜드=샵) 단위 집계 — 국가 필터 지원(국가별 샵 랭킹).
    const r = await sql<{
      brand_name: string; products: number | string | null; avg_commission: string | number | null;
      total_sold: string | number | null; est_gmv: string | number | null;
      videos: number | string | null; total_views: string | number | null;
    }>`
      SELECT p.brand_name,
             count(*)::int AS products,
             avg(p.commission_rate) AS avg_commission,
             coalesce(sum(p.sold_count), 0) AS total_sold,
             coalesce(sum(p.price * p.sold_count), 0) AS est_gmv,
             max(b.videos) AS videos, max(b.total_views) AS total_views
      FROM products p
      LEFT JOIN brand_stats b ON lower(b.brand_name) = lower(p.brand_name)
      WHERE p.brand_name IS NOT NULL
        AND (${q} = '' OR lower(p.brand_name) LIKE ${"%" + q + "%"})
        AND (${country} = '' OR upper(coalesce(p.country,'US')) = ${country})
        AND p.brand_name NOT IN (SELECT value FROM blocklist WHERE kind='brand')
      GROUP BY p.brand_name
      LIMIT 2000`;

    const shops = r.rows.map((s) => {
      const sold = Number(s.total_sold) || 0;
      const gmv = Math.round(Number(s.est_gmv) || 0);
      const products = Number(s.products) || 0;
      return {
        name: s.brand_name,
        products,
        sold,
        gmv, // 추정
        avgPrice: sold > 0 ? Math.round((gmv / sold) * 100) / 100 : 0, // 객단가(추정)
        commission: s.avg_commission != null ? Math.round(Number(s.avg_commission) * 10) / 10 : null,
        videos: Number(s.videos) || 0,
        views: Number(s.total_views) || 0,
      };
    });
    shops.sort((a, b) =>
      sort === "sold" ? b.sold - a.sold : sort === "products" ? b.products - a.products : b.gmv - a.gmv,
    );

    const summary = {
      count: shops.length,
      totalGmv: Math.round(shops.reduce((s, x) => s + x.gmv, 0)),
      totalProducts: shops.reduce((s, x) => s + x.products, 0),
      avgPrice: shops.length ? Math.round((shops.reduce((s, x) => s + x.avgPrice, 0) / shops.length) * 100) / 100 : 0,
    };

    return NextResponse.json({ configured: true, count: shops.length, summary, shops: shops.slice(0, limit) });
  } catch (e) {
    return NextResponse.json({ configured: true, shops: [], count: 0, error: String(e).slice(0, 160) });
  }
}

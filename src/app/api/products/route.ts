import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 제품(SKU) 랭킹 — products 테이블 기반. 추정 GMV = price × sold_count.
// 신규(롤백 가능) 기능: 메뉴 비노출, /products 페이지 전용. 기존 라우트 미변경.
// ⚠️ price×sold는 공개 스크랩 기반 '추정치'(정확치 아님) — 화면에서 명확히 라벨.
export async function GET(req: Request) {
  if (!isConfigured()) return NextResponse.json({ configured: false, products: [], count: 0 });
  try {
    await ensureSchema();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const brand = (url.searchParams.get("brand") || "").trim().toLowerCase();
    const sort = url.searchParams.get("sort") || "gmv"; // gmv | sold | price
    const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit") || 200)));
    const minPrice = Number(url.searchParams.get("minPrice") || "") || 0;
    const maxPrice = Number(url.searchParams.get("maxPrice") || "") || 0; // 0 = 상한없음
    const country = (url.searchParams.get("country") || "").trim().toUpperCase(); // "" = 전체

    const r = await sql<{
      product_id: string; brand_name: string | null; title: string | null;
      price: string | number | null; currency: string | null;
      sold_count: string | number | null; commission_rate: string | number | null; url: string | null; country: string | null;
    }>`
      SELECT product_id, brand_name, title, price, currency, sold_count, commission_rate, url, country
      FROM products
      WHERE (${q} = '' OR lower(coalesce(title,'')) LIKE ${"%" + q + "%"} OR lower(coalesce(brand_name,'')) LIKE ${"%" + q + "%"})
        AND (${brand} = '' OR lower(coalesce(brand_name,'')) = ${brand})
        AND (${country} = '' OR upper(coalesce(country,'US')) = ${country})
        AND (brand_name IS NULL OR brand_name NOT IN (SELECT value FROM blocklist WHERE kind='brand'))
      ORDER BY collected_at DESC
      LIMIT 5000`;

    const products = r.rows.map((p) => {
      const price = Number(p.price) || 0;
      const sold = Number(p.sold_count) || 0;
      return {
        id: p.product_id,
        brand: p.brand_name || "",
        title: p.title || "",
        price,
        currency: p.currency || "USD",
        sold,
        gmv: Math.round(price * sold), // 추정
        commission: p.commission_rate != null ? Number(p.commission_rate) : null,
        url: p.url || "",
        country: (p.country || "US").toUpperCase(),
      };
    });
    // 가격대(밴드) 필터
    const filtered = products.filter((p) =>
      (minPrice <= 0 || p.price >= minPrice) && (maxPrice <= 0 || p.price < maxPrice),
    );
    filtered.sort((a, b) =>
      sort === "sold" ? b.sold - a.sold : sort === "price" ? b.price - a.price : b.gmv - a.gmv,
    );

    // 요약 KPI (kalodata식 상단 지표)
    const totalGmv = filtered.reduce((s, p) => s + p.gmv, 0);
    const totalSold = filtered.reduce((s, p) => s + p.sold, 0);
    const avgPrice = filtered.length ? Math.round((filtered.reduce((s, p) => s + p.price, 0) / filtered.length) * 100) / 100 : 0;
    const summary = { count: filtered.length, totalGmv: Math.round(totalGmv), totalSold, avgPrice };

    return NextResponse.json({ configured: true, count: filtered.length, summary, products: filtered.slice(0, limit) });
  } catch (e) {
    return NextResponse.json({ configured: true, products: [], count: 0, error: String(e).slice(0, 160) });
  }
}

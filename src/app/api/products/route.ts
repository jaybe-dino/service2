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
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 200)));

    const r = await sql<{
      product_id: string; brand_name: string | null; title: string | null;
      price: string | number | null; currency: string | null;
      sold_count: string | number | null; commission_rate: string | number | null; url: string | null;
    }>`
      SELECT product_id, brand_name, title, price, currency, sold_count, commission_rate, url
      FROM products
      WHERE (${q} = '' OR lower(coalesce(title,'')) LIKE ${"%" + q + "%"} OR lower(coalesce(brand_name,'')) LIKE ${"%" + q + "%"})
        AND (${brand} = '' OR lower(coalesce(brand_name,'')) = ${brand})
        AND (brand_name IS NULL OR brand_name NOT IN (SELECT value FROM blocklist WHERE kind='brand'))
      ORDER BY collected_at DESC
      LIMIT 2000`;

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
      };
    });
    products.sort((a, b) =>
      sort === "sold" ? b.sold - a.sold : sort === "price" ? b.price - a.price : b.gmv - a.gmv,
    );

    return NextResponse.json({ configured: true, count: products.length, products: products.slice(0, limit) });
  } catch (e) {
    return NextResponse.json({ configured: true, products: [], count: 0, error: String(e).slice(0, 160) });
  }
}

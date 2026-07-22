import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { classifyProduct, CATEGORY_LABEL, CATEGORY_ICON, type CategoryId } from "@/lib/ktrend/classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 카테고리별 실 GMV 집계 — products를 제목 자동분류(classifyProduct)로 묶어 카테고리 랭킹 산출.
// 신규(롤백 가능): /category 페이지 전용. GMV는 추정치.
export async function GET(req: Request) {
  if (!isConfigured()) return NextResponse.json({ configured: false, categories: [] });
  try {
    await ensureSchema();
    const url = new URL(req.url);
    const country = (url.searchParams.get("country") || "").trim().toUpperCase();

    const r = await sql<{ title: string | null; price: string | number | null; sold_count: string | number | null; commission_rate: string | number | null; brand_name: string | null }>`
      SELECT title, price, sold_count, commission_rate, brand_name FROM products
      WHERE (${country} = '' OR upper(coalesce(country,'US')) = ${country})
        AND (brand_name IS NULL OR brand_name NOT IN (SELECT value FROM blocklist WHERE kind='brand'))
      LIMIT 20000`;

    const agg: Record<string, { id: CategoryId; products: number; sold: number; gmv: number; commSum: number; commN: number; brands: Set<string> }> = {};
    for (const p of r.rows) {
      const id = classifyProduct(p.title);
      const price = Number(p.price) || 0;
      const sold = Number(p.sold_count) || 0;
      const a = (agg[id] ??= { id, products: 0, sold: 0, gmv: 0, commSum: 0, commN: 0, brands: new Set() });
      a.products += 1; a.sold += sold; a.gmv += price * sold;
      if (p.commission_rate != null) { a.commSum += Number(p.commission_rate); a.commN += 1; }
      if (p.brand_name) a.brands.add(p.brand_name.toLowerCase());
    }

    const categories = Object.values(agg).map((a) => ({
      id: a.id,
      label: CATEGORY_LABEL[a.id],
      icon: CATEGORY_ICON[a.id],
      products: a.products,
      brands: a.brands.size,
      sold: a.sold,
      gmv: Math.round(a.gmv),
      avgCommission: a.commN ? Math.round((a.commSum / a.commN) * 10) / 10 : null,
    })).sort((x, y) => y.gmv - x.gmv);

    const totalGmv = categories.reduce((s, c) => s + c.gmv, 0);
    return NextResponse.json({ configured: true, totalGmv, categories });
  } catch (e) {
    return NextResponse.json({ configured: true, categories: [], error: String(e).slice(0, 160) });
  }
}

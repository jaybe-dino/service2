import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { classifyProduct, subClassifyProduct, type CategoryId, type SubCategoryId } from "@/lib/ktrend/classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 제품(SKU) 랭킹 — products 테이블 기반. 추정 GMV = price × sold_count.
// 신규(롤백 가능): 메뉴 비노출, /products 페이지 전용. 기존 라우트 미변경.
// 성장률: product_snapshots(일별)로 최근 N일 판매 증분 산출(스냅샷 누적 시 채워짐).
// ⚠️ price×sold는 공개 스크랩 기반 '추정치'(정확치 아님) — 화면에서 명확히 라벨.
export async function GET(req: Request) {
  if (!isConfigured()) return NextResponse.json({ configured: false, products: [], count: 0 });
  try {
    await ensureSchema();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const brand = (url.searchParams.get("brand") || "").trim().toLowerCase();
    const sort = url.searchParams.get("sort") || "gmv"; // gmv | sold | price | growth
    const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit") || 200)));
    const minPrice = Number(url.searchParams.get("minPrice") || "") || 0;
    const maxPrice = Number(url.searchParams.get("maxPrice") || "") || 0; // 0 = 상한없음
    const country = (url.searchParams.get("country") || "").trim().toUpperCase(); // "" = 전체
    const category = (url.searchParams.get("category") || "").trim().toLowerCase() as CategoryId | ""; // "" = 전체
    const sub = (url.searchParams.get("sub") || "").trim().toLowerCase() as SubCategoryId | ""; // "" = 전체(세분화)
    const minCommission = Number(url.searchParams.get("minCommission") || "") || 0; // % 하한
    const minSold = Number(url.searchParams.get("minSold") || "") || 0;
    const period = Math.max(1, Math.min(90, Number(url.searchParams.get("period") || 7))); // 성장률 기간(일)

    // 성장률: 각 제품의 period일 전 스냅샷 판매수 조인(LATERAL). 없으면 null → '집계중'.
    const r = await sql<{
      product_id: string; brand_name: string | null; title: string | null;
      price: string | number | null; currency: string | null;
      sold_count: string | number | null; commission_rate: string | number | null; url: string | null; country: string | null;
      sold_past: string | number | null;
    }>`
      SELECT p.product_id, p.brand_name, p.title, p.price, p.currency, p.sold_count, p.commission_rate, p.url, p.country,
             (SELECT ps.sold_count FROM product_snapshots ps
              WHERE ps.product_id = p.product_id AND ps.snap_date <= CURRENT_DATE - ${period}::int
              ORDER BY ps.snap_date DESC LIMIT 1) AS sold_past
      FROM products p
      WHERE (${q} = '' OR lower(coalesce(p.title,'')) LIKE ${"%" + q + "%"} OR lower(coalesce(p.brand_name,'')) LIKE ${"%" + q + "%"})
        AND (${brand} = '' OR lower(coalesce(p.brand_name,'')) = ${brand})
        AND (${country} = '' OR upper(coalesce(p.country,'US')) = ${country})
        AND (p.brand_name IS NULL OR p.brand_name NOT IN (SELECT value FROM blocklist WHERE kind='brand'))
      ORDER BY p.collected_at DESC
      LIMIT 5000`;

    const mapped = r.rows.map((p) => {
      const price = Number(p.price) || 0;
      const sold = Number(p.sold_count) || 0;
      const soldPast = p.sold_past != null ? Number(p.sold_past) : null;
      const growth = soldPast != null ? sold - soldPast : null;
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
        category: classifyProduct(p.title),
        sub: subClassifyProduct(p.title).sub,
        growth,
        growthPct: growth != null && soldPast && soldPast > 0 ? Math.round((growth / soldPast) * 1000) / 10 : null,
      };
    });

    // 필터: 가격대·카테고리·커미션·판매량
    const filtered = mapped.filter((p) =>
      (minPrice <= 0 || p.price >= minPrice) && (maxPrice <= 0 || p.price < maxPrice) &&
      (!category || p.category === category) &&
      (!sub || p.sub === sub) &&
      (minCommission <= 0 || (p.commission ?? 0) >= minCommission) &&
      (minSold <= 0 || p.sold >= minSold),
    );
    filtered.sort((a, b) =>
      sort === "sold" ? b.sold - a.sold
        : sort === "price" ? b.price - a.price
        : sort === "growth" ? (b.growth ?? -1) - (a.growth ?? -1)
        : b.gmv - a.gmv,
    );

    const totalGmv = filtered.reduce((s, p) => s + p.gmv, 0);
    const totalSold = filtered.reduce((s, p) => s + p.sold, 0);
    const avgPrice = filtered.length ? Math.round((filtered.reduce((s, p) => s + p.price, 0) / filtered.length) * 100) / 100 : 0;
    const summary = { count: filtered.length, totalGmv: Math.round(totalGmv), totalSold, avgPrice };

    return NextResponse.json({ configured: true, count: filtered.length, summary, products: filtered.slice(0, limit) });
  } catch (e) {
    return NextResponse.json({ configured: true, products: [], count: 0, error: String(e).slice(0, 160) });
  }
}

import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { CORS, jcors, tokenOk, publicTokenConfigured, categoryOf, brandNamesForCategories } from "@/lib/public-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 공개 제품 API — 카테고리·국가·브랜드 필터 + 썸네일(image_url) + 추정 GMV.
//   GET /api/public/products?token=..&category=skincare&country=US&sort=gmv&limit=30
// 카테고리는 brand_name→카테고리 매핑(products에 category 컬럼 없음). GMV=sold_count*price 근사.
export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }); }

export async function GET(req: Request) {
  if (!isConfigured()) return jcors({ error: "DB 미설정" }, 503);
  if (!publicTokenConfigured()) return jcors({ error: "API 토큰 미설정: PUBLIC_API_TOKEN 등록 필요" }, 503);
  if (!tokenOk(req)) return jcors({ error: "unauthorized: token 필요" }, 401);
  await ensureSchema();

  const u = new URL(req.url);
  const listp = (k: string) => (u.searchParams.get(k) || "").split(",").map((s) => s.trim()).filter(Boolean);
  const num = (k: string, d = 0) => { const n = Number(u.searchParams.get(k)); return Number.isFinite(n) ? n : d; };

  const categories = listp("category");
  const countries = listp("country").map((c) => c.toUpperCase());
  const brands = listp("brand").map((b) => b.toLowerCase());
  const minSold = num("minSold", 0);
  const sortMap: Record<string, string> = { gmv: "est_gmv", sold: "sold_count", price: "price", recent: "collected_at" };
  const sort = sortMap[u.searchParams.get("sort") || "sold"] || "sold_count";
  const order = (u.searchParams.get("order") || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const limit = Math.min(Math.max(1, num("limit", 30)), 100);
  const offset = Math.max(0, num("offset", 0));

  const cond: string[] = ["1=1"];
  const params: unknown[] = [];
  const P = (v: unknown) => { params.push(v); return `$${params.length}`; };
  if (countries.length) cond.push(`country = ANY(${P(countries)}::text[])`);
  if (minSold > 0) cond.push(`sold_count >= ${P(minSold)}`);
  const brandFilter = categories.length ? brandNamesForCategories(categories) : brands.length ? brands : null;
  if (brandFilter) cond.push(`lower(brand_name) = ANY(${P(brandFilter)}::text[])`);
  const where = "WHERE " + cond.join(" AND ");

  try {
    // est_gmv = sold_count * price (근사) — 정렬/노출용
    const rows = await sql.query(
      `SELECT product_id, brand_name, title, price, currency, sold_count, commission_rate,
              country, image_url, url, (COALESCE(sold_count,0) * COALESCE(price,0)) AS est_gmv
       FROM products ${where}
       ORDER BY ${sort} ${order} NULLS LAST
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    const cnt = await sql.query(`SELECT COUNT(*)::int AS n FROM products ${where}`, params);
    const products = rows.rows.map((r) => ({
      product_id: r.product_id,
      title: r.title,
      brand: r.brand_name,
      category: categoryOf(r.brand_name),   // 유도된 카테고리
      country: r.country,
      thumbnail: r.image_url,                // 썸네일
      url: r.url,
      price: r.price != null ? Number(r.price) : null,
      currency: r.currency,
      sold_count: Number(r.sold_count) || 0,
      commission_rate: r.commission_rate != null ? Number(r.commission_rate) : null,
      est_gmv: Number(r.est_gmv) || 0,
    }));
    return jcors({ total: cnt.rows[0]?.n || 0, count: products.length, limit, offset, products });
  } catch (e) {
    return jcors({ error: String(e instanceof Error ? e.message : e).slice(0, 200) }, 500);
  }
}

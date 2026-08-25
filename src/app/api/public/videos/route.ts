import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { CORS, jcors, tokenOk, publicTokenConfigured, categoryOf, brandNamesForCategories } from "@/lib/public-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 공개 영상(콘텐츠 레퍼런스) API — 카테고리·국가·브랜드 필터 + 썸네일(cover_url).
//   GET /api/public/videos?token=..&category=skincare,makeup&country=US&sort=views&limit=30
// 카테고리는 brand_name→카테고리 매핑으로 처리(videos에 category 컬럼 없음).
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
  const minViews = num("minViews", 0);
  const sortMap: Record<string, string> = { views: "views", likes: "likes", comments: "comments", recent: "collected_at", posted: "posted_at" };
  const sort = sortMap[u.searchParams.get("sort") || "views"] || "views";
  const order = (u.searchParams.get("order") || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const limit = Math.min(Math.max(1, num("limit", 30)), 100);
  const offset = Math.max(0, num("offset", 0));
  const onlyThumb = u.searchParams.get("withThumbnail") === "1";
  const isShop = u.searchParams.get("isShop");

  const cond: string[] = ["handle IS NOT NULL"];
  const params: unknown[] = [];
  const P = (v: unknown) => { params.push(v); return `$${params.length}`; };
  if (countries.length) cond.push(`country = ANY(${P(countries)}::text[])`);
  if (minViews > 0) cond.push(`views >= ${P(minViews)}`);
  if (onlyThumb) cond.push(`cover_url IS NOT NULL`);
  if (isShop === "1") cond.push(`is_shop = true`);
  const brandFilter = categories.length ? brandNamesForCategories(categories) : brands.length ? brands : null;
  if (brandFilter) cond.push(`lower(brand_name) = ANY(${P(brandFilter)}::text[])`);
  const where = "WHERE " + cond.join(" AND ");

  try {
    const rows = await sql.query(
      `SELECT video_id, handle, brand_name, country, tier, views, likes, comments, shares,
              is_ad, is_shop, posted_at, url, cover_url
       FROM videos ${where}
       ORDER BY ${sort} ${order} NULLS LAST
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    const cnt = await sql.query(`SELECT COUNT(*)::int AS n FROM videos ${where}`, params);
    const videos = rows.rows.map((r) => ({
      video_id: r.video_id,
      handle: r.handle,
      profile_url: `https://www.tiktok.com/@${r.handle}`,
      brand: r.brand_name,
      category: categoryOf(r.brand_name),   // 유도된 카테고리
      country: r.country,
      tier: r.tier,                          // 규모
      thumbnail: r.cover_url,                // 썸네일
      url: r.url,
      posted_at: r.posted_at,
      is_shop: r.is_shop, is_ad: r.is_ad,
      metrics: { views: Number(r.views) || 0, likes: Number(r.likes) || 0, comments: Number(r.comments) || 0, shares: Number(r.shares) || 0 },
    }));
    return jcors({ total: cnt.rows[0]?.n || 0, count: videos.length, limit, offset, videos });
  } catch (e) {
    return jcors({ error: String(e instanceof Error ? e.message : e).slice(0, 200) }, 500);
  }
}

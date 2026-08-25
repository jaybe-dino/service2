import { NextResponse } from "next/server";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { BRANDS, normKey } from "@/data/ktrend/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ────────────────────────────────────────────────────────────────
// 공개 크리에이터 API — 카테고리·국가·규모(tier) 소팅/필터 + 콘텐츠 레퍼런스(썸네일).
// 외부 시스템이 토큰으로 호출한다. 데이터 원천: videos(집계) + BRANDS(카테고리 매핑).
//   GET /api/public/creators?token=..&category=skincare,makeup&country=US&scale=micro&sort=views&limit=20&withContent=1
//   또는 Authorization: Bearer <PUBLIC_API_TOKEN>
// 토큰: env PUBLIC_API_TOKEN (없으면 CREATORS_EXPORT_TOKEN 재사용)
// ────────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};
const j = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: CORS });

export function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

// 브랜드명(정규화) → 카테고리
const BRAND_CAT = new Map(BRANDS.map((b) => [normKey(b.name), b.category]));

function tokenOk(req: Request): boolean {
  const expected = (process.env.PUBLIC_API_TOKEN || process.env.CREATORS_EXPORT_TOKEN || "").trim();
  if (!expected) return false;
  const u = new URL(req.url);
  const q = (u.searchParams.get("token") || "").trim();
  const h = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return q === expected || h === expected;
}

export async function GET(req: Request) {
  if (!isConfigured()) return j({ error: "DB 미설정" }, 503);
  if (!process.env.PUBLIC_API_TOKEN && !process.env.CREATORS_EXPORT_TOKEN)
    return j({ error: "API 토큰 미설정: 서버에 PUBLIC_API_TOKEN 을 등록하세요." }, 503);
  if (!tokenOk(req)) return j({ error: "unauthorized: token 필요" }, 401);
  await ensureSchema();

  const u = new URL(req.url);
  const list = (k: string) => (u.searchParams.get(k) || "").split(",").map((s) => s.trim()).filter(Boolean);
  const num = (k: string, d = 0) => { const n = Number(u.searchParams.get(k)); return Number.isFinite(n) ? n : d; };

  const categories = list("category").filter((c) => ["skincare", "makeup", "haircare"].includes(c));
  const countries = list("country").map((c) => c.toUpperCase());
  const scale = [...list("scale"), ...list("tier")].filter((t) => ["mega", "macro", "micro"].includes(t));
  const minViews = num("minViews", 0);
  const sort = ({ views: "total_views", avg_views: "avg_views", videos: "video_count", recent: "last_seen" }[u.searchParams.get("sort") || "views"]) || "total_views";
  const order = (u.searchParams.get("order") || "desc").toLowerCase() === "asc" ? "ASC" : "DESC";
  const limit = Math.min(Math.max(1, num("limit", 20)), 100);
  const offset = Math.max(0, num("offset", 0));
  const withContent = u.searchParams.get("withContent") !== "0";
  const contentLimit = Math.min(Math.max(1, num("contentLimit", 3)), 10);

  // 필터 절 (videos 기준)
  const cond: string[] = ["handle IS NOT NULL", "handle <> ''"];
  const params: unknown[] = [];
  const P = (v: unknown) => { params.push(v); return `$${params.length}`; };
  if (countries.length) cond.push(`country = ANY(${P(countries)}::text[])`);
  if (scale.length) cond.push(`tier = ANY(${P(scale)}::text[])`);
  if (minViews > 0) cond.push(`views >= ${P(minViews)}`);
  if (categories.length) {
    const names = BRANDS.filter((b) => categories.includes(b.category)).map((b) => b.name.toLowerCase());
    cond.push(`lower(brand_name) = ANY(${P(names)}::text[])`);
  }
  const where = "WHERE " + cond.join(" AND ");

  try {
    const aggSql = `
      WITH v AS (SELECT handle, brand_name, views, country, tier, cover_url, collected_at FROM videos ${where})
      SELECT handle,
        COUNT(*)::int AS video_count,
        SUM(views)::bigint AS total_views,
        ROUND(AVG(views))::bigint AS avg_views,
        MAX(views)::bigint AS top_views,
        MAX(collected_at) AS last_seen,
        (array_remove(array_agg(DISTINCT country), NULL))[1:5] AS countries,
        (array_remove(array_agg(DISTINCT tier), NULL))[1:3] AS tiers,
        (array_remove(array_agg(DISTINCT brand_name), NULL))[1:12] AS brands
      FROM v GROUP BY handle
      ORDER BY ${sort} ${order} NULLS LAST
      LIMIT ${limit} OFFSET ${offset}`;
    const agg = await sql.query(aggSql, params);

    const totalRes = await sql.query(`SELECT COUNT(DISTINCT handle)::int AS n FROM videos ${where}`, params);
    const total = totalRes.rows[0]?.n || 0;

    const handles = agg.rows.map((r) => r.handle);
    // 콘텐츠 레퍼런스(썸네일) — 핸들별 상위 N개
    const contentByHandle: Record<string, unknown[]> = {};
    if (withContent && handles.length) {
      const cParams = [...params, handles, contentLimit];
      const cSql = `
        SELECT handle, video_id, cover_url, url, views, country FROM (
          SELECT handle, video_id, cover_url, url, views, country,
                 row_number() OVER (PARTITION BY handle ORDER BY views DESC NULLS LAST) rn
          FROM videos ${where} AND handle = ANY($${params.length + 1}::text[]) AND cover_url IS NOT NULL
        ) t WHERE rn <= $${params.length + 2}`;
      const c = await sql.query(cSql, cParams);
      for (const row of c.rows) {
        (contentByHandle[row.handle] ||= []).push({
          video_id: row.video_id, thumbnail: row.cover_url, url: row.url, views: Number(row.views) || 0, country: row.country,
        });
      }
    }

    const creators = agg.rows.map((r) => {
      const brands: string[] = r.brands || [];
      const cats = Array.from(new Set(brands.map((b) => BRAND_CAT.get(normKey(b))).filter(Boolean)));
      const tier = (r.tiers || [])[0] || avgViewsTier(Number(r.avg_views) || 0);
      return {
        handle: r.handle,
        profile_url: `https://www.tiktok.com/@${r.handle}`,
        tier,                                  // 규모: mega|macro|micro
        countries: r.countries || [],          // 활동 국가
        categories: cats,                      // 카테고리(브랜드 이력 기반)
        brands,
        metrics: {
          videos: Number(r.video_count) || 0,
          total_views: Number(r.total_views) || 0,
          avg_views: Number(r.avg_views) || 0,
          top_views: Number(r.top_views) || 0,
        },
        content: contentByHandle[r.handle] || [],
      };
    });

    return j({ total, count: creators.length, limit, offset, sort: u.searchParams.get("sort") || "views", order: order.toLowerCase(), creators });
  } catch (e) {
    return j({ error: String(e instanceof Error ? e.message : e).slice(0, 200) }, 500);
  }
}

function avgViewsTier(v: number): string {
  if (v >= 1_000_000) return "mega";
  if (v >= 100_000) return "macro";
  return "micro";
}

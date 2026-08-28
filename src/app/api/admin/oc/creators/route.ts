import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { buildWhere, type OcFilter } from "@/lib/oc-filter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return null;
}

// 파셋 캐시 — unnest 풀스캔(수만 행)이 매 로드마다 돌지 않도록 인스턴스당 5분 보관.
// (임포트 직후엔 최대 5분 지연 반영 — 필터 검색 결과에는 영향 없음)
let facetCache: { at: number; data: { brands: unknown[]; tiers: unknown } } | null = null;
const FACET_TTL_MS = 5 * 60_000;

// GET — 파셋(상위 브랜드, avg_views 티어 카운트). 필터 UI 초기화용.
export async function GET() {
  const g = await guard(); if (g) return g;
  if (facetCache && Date.now() - facetCache.at < FACET_TTL_MS) {
    return NextResponse.json(facetCache.data);
  }
  const [brands, tiers] = await Promise.all([
    sql`
    SELECT trim(b) AS brand, COUNT(*)::int AS n
    FROM oc_creators, LATERAL unnest(string_to_array(brands, ',')) AS b
    WHERE brands IS NOT NULL AND trim(b) <> ''
    GROUP BY trim(b) ORDER BY n DESC LIMIT 40`,
    sql`
    SELECT
      COUNT(*) FILTER (WHERE avg_views < 1000)::int AS t0,
      COUNT(*) FILTER (WHERE avg_views >= 1000 AND avg_views < 10000)::int AS t1,
      COUNT(*) FILTER (WHERE avg_views >= 10000 AND avg_views < 100000)::int AS t2,
      COUNT(*) FILTER (WHERE avg_views >= 100000 AND avg_views < 1000000)::int AS t3,
      COUNT(*) FILTER (WHERE avg_views >= 1000000)::int AS t4
    FROM oc_creators`,
  ]);
  const data = { brands: brands.rows, tiers: tiers.rows[0] || {} };
  facetCache = { at: Date.now(), data };
  return NextResponse.json(data);
}

// POST — 필터 검색. body: { filter, limit?, offset? } → { count, withEmail, rows }
export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  let body: { filter?: OcFilter; limit?: number; offset?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "본문 파싱 실패" }, { status: 400 }); }
  const filter = body.filter || {};
  const limit = Math.min(Math.max(1, body.limit || 50), 500);
  const offset = Math.max(0, body.offset || 0);
  const { where, params } = buildWhere(filter);

  try {
    const cnt = await sql.query(
      `SELECT COUNT(*)::int AS count,
              COUNT(*) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS with_email
       FROM oc_creators ${where}`,
      params,
    );
    const rows = await sql.query(
      `SELECT handle, profile_url, email, contact_status, videos, total_views, avg_views, brands, region
       FROM oc_creators ${where}
       ORDER BY avg_views DESC NULLS LAST, total_views DESC NULLS LAST
       LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    return NextResponse.json({
      count: cnt.rows[0]?.count || 0,
      withEmail: cnt.rows[0]?.with_email || 0,
      rows: rows.rows,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e).slice(0, 200) }, { status: 500 });
  }
}

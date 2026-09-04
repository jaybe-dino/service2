import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// K-Beauty 데이터 커버리지(v_coverage 상당) + 파생 테이블 리빌드(dim_brand/bridge 상당).

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const [cov, tiers, regions] = await Promise.all([
    sql`SELECT
      (SELECT COUNT(*) FROM kb_shops)::int AS shops,
      (SELECT COUNT(*) FROM kb_shops WHERE creator_pool IS NOT NULL)::int AS shops_measured,
      (SELECT COUNT(*) FROM kb_creators)::int AS creators,
      (SELECT COUNT(*) FROM kb_creators WHERE email IS NOT NULL AND email <> '')::int AS with_email,
      (SELECT COUNT(*) FROM kb_creators WHERE contact_channels IS NOT NULL AND contact_channels <> '')::int AS contactable,
      (SELECT COUNT(*) FROM kb_creators WHERE mapping_tier='M1')::int AS m1_ready,
      (SELECT COUNT(*) FROM kb_brand_videos)::int AS brand_videos,
      (SELECT COUNT(*) FROM kb_category_videos)::int AS category_videos,
      (SELECT COUNT(*) FROM kb_hashtag_creators)::int AS hashtag_creators,
      (SELECT COUNT(*) FROM kb_brands)::int AS brands`,
    sql`SELECT mapping_tier, COUNT(*)::int AS n FROM kb_creators GROUP BY mapping_tier ORDER BY mapping_tier`,
    sql`SELECT region, COUNT(*)::int AS n FROM kb_creators WHERE region IS NOT NULL GROUP BY region ORDER BY n DESC`,
  ]);
  return NextResponse.json({ coverage: cov.rows[0], tiers: tiers.rows, regions: regions.rows });
}

// POST { action: 'rebuild' } — kb_creator_brand·kb_brands 재계산 (매 적재 후 1회)
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as { action?: string };
  if (b.action !== "rebuild") return NextResponse.json({ error: "action=rebuild 필요" }, { status: 400 });

  await sql`TRUNCATE kb_creator_brand`;
  await sql`INSERT INTO kb_creator_brand (creator_uid, brand_en, video_count, product_count, gmv_usd, plays, rpm_usd)
    SELECT creator_uid, brand_en,
      COUNT(DISTINCT video_id)::int, COUNT(DISTINCT item_id)::int,
      COALESCE(SUM(gmv_usd),0), COALESCE(SUM(plays),0),
      CASE WHEN COALESCE(SUM(plays),0) > 0 THEN SUM(gmv_usd) / SUM(plays) * 1000 ELSE 0 END
    FROM kb_brand_videos WHERE creator_uid IS NOT NULL AND creator_uid <> ''
    GROUP BY creator_uid, brand_en`;

  // 활성도: 크리에이터별 최근 영상 게시일 → 추천 점수의 활성도 축에 사용
  await sql`UPDATE kb_creators c SET kb_last_video_at = v.last_at
    FROM (SELECT creator_uid, MAX(created_at) AS last_at FROM kb_brand_videos
          WHERE creator_uid IS NOT NULL AND creator_uid <> '' AND created_at IS NOT NULL
          GROUP BY creator_uid) v
    WHERE v.creator_uid = c.creator_uid`;

  await sql`TRUNCATE kb_brands`;
  await sql`INSERT INTO kb_brands (brand_en, shop_count, creator_count, video_count, product_count, total_gmv_usd, regions, updated_at)
    SELECT v.brand_en,
      (SELECT COUNT(*) FROM kb_shops s WHERE s.brand_en ILIKE '%' || v.brand_en || '%')::int,
      COUNT(DISTINCT v.creator_uid) FILTER (WHERE v.creator_uid <> '')::int,
      COUNT(DISTINCT v.video_id)::int,
      COUNT(DISTINCT v.item_id)::int,
      COALESCE(SUM(v.gmv_usd),0),
      string_agg(DISTINCT v.region, ','),
      now()
    FROM kb_brand_videos v GROUP BY v.brand_en`;

  const n = await sql`SELECT (SELECT COUNT(*) FROM kb_brands)::int AS brands, (SELECT COUNT(*) FROM kb_creator_brand)::int AS pairs`;
  return NextResponse.json({ ok: true, ...n.rows[0] });
}

import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { DEFAULT_CRAWL_RULES } from "@/lib/crawl-rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const members = await sql`
    SELECT u.id, u.email, u.name, u.brand, u.role, u.plan, u.pro_until, u.created_at,
           COALESCE(p.total, 0) AS paid_total, p.last_paid,
           pr.code AS promo_code,
           sub.status AS sub_status,
           COALESCE(iv.cnt, 0)::int AS invite_count
    FROM users u
    LEFT JOIN (
      SELECT o.user_id, SUM(pm.amount)::bigint AS total, MAX(pm.created_at) AS last_paid
      FROM orders o JOIN payments pm ON pm.order_id = o.order_id
      GROUP BY o.user_id
    ) p ON p.user_id = u.id
    LEFT JOIN promo_redemptions pr ON pr.user_id = u.id
    LEFT JOIN subscriptions sub ON sub.user_id = u.id
    LEFT JOIN (SELECT inviter_email, COUNT(*) AS cnt FROM invites GROUP BY inviter_email) iv ON iv.inviter_email = u.email
    ORDER BY u.created_at DESC LIMIT 500`;

  const orders = await sql`
    SELECT o.order_id, o.user_id, o.plan, o.amount, o.status, o.created_at,
           CASE WHEN pm.payment_id IS NULL THEN false ELSE true END AS paid
    FROM orders o
    LEFT JOIN payments pm ON pm.order_id = o.order_id
    ORDER BY o.created_at DESC LIMIT 300`;

  const inquiries = await sql`SELECT id, kind, user_email, payload, status, response, created_at FROM inquiries ORDER BY created_at DESC LIMIT 200`;

  const settingsRow = await sql`SELECT value FROM admin_settings WHERE key='crawl_rules' LIMIT 1`;
  const crawlRules = settingsRow.rows[0]?.value ?? DEFAULT_CRAWL_RULES;

  const brandRequests = await sql`SELECT id, brand_name, handle, source, status, collected, note, created_at FROM brand_requests ORDER BY created_at DESC LIMIT 100`;
  const collectionRuns = await sql`SELECT id, kind, target, status, collected, error, created_at FROM collection_runs ORDER BY created_at DESC LIMIT 50`;
  const collectedCount = await sql`SELECT COUNT(*)::int AS c FROM videos`;
  const creatorsCount = await sql`SELECT COUNT(*)::int AS c FROM creators`;
  // 브랜드별 수집 현황(헬스보드): 수집 건수 + 마지막 수집/추적 주기
  const brandHealth = await sql`
    SELECT bs.brand_name, bs.videos, bs.influencers, bs.total_views,
           bt.last_collected_at, bt.tracked, bt.interval_hours
    FROM brand_stats bs
    LEFT JOIN brand_tracking bt ON bt.brand_name = bs.brand_name
    ORDER BY bs.videos DESC LIMIT 100`;
  // A안: 틱톡샵 상품 집계 (실 커미션율·추정 GMV)
  const shopStats = await sql`SELECT brand_name, products, avg_commission, total_sold, est_gmv, updated_at FROM brand_shop_stats ORDER BY est_gmv DESC LIMIT 100`;

  const totals = await sql`
    SELECT
      (SELECT COUNT(*) FROM users)::int AS users,
      (SELECT COUNT(*) FROM payments)::int AS payments,
      (SELECT COALESCE(SUM(amount),0)::bigint FROM payments) AS revenue,
      (SELECT COUNT(*) FROM users WHERE pro_until > ${Date.now()})::int AS active_pro`;

  return NextResponse.json({
    members: members.rows,
    orders: orders.rows,
    inquiries: inquiries.rows,
    crawlRules,
    brandRequests: brandRequests.rows,
    collectionRuns: collectionRuns.rows,
    collectedCount: collectedCount.rows[0]?.c ?? 0,
    creatorsCount: creatorsCount.rows[0]?.c ?? 0,
    brandHealth: brandHealth.rows,
    shopStats: shopStats.rows,
    totals: totals.rows[0],
  });
}

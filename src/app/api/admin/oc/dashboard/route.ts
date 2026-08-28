import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { saConfigured } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 아웃리치 운영 현황 요약 — 대시보드 홈.
export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  // 8개 집계를 병렬 실행 — 순차 왕복 제거로 응답시간 1/8 수준.
  const [creatorsQ, campQ, todayQ, sendersQ, funnelQ, repliedQ, suppressionQ, recentQ] = await Promise.all([
    sql`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS with_email FROM oc_creators`,
    sql`SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status='sending')::int AS sending,
      COUNT(*) FILTER (WHERE status='done')::int AS done,
      COUNT(*) FILTER (WHERE status='draft')::int AS draft
    FROM oc_campaigns`,
    sql`SELECT COUNT(*)::int AS sent FROM oc_messages
    WHERE status='sent' AND (sent_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date`,
    sql`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE active)::int AS active,
      COALESCE(SUM(daily_limit) FILTER (WHERE active),0)::int AS daily_limit
    FROM oc_senders`,
    sql`SELECT
      COUNT(*) FILTER (WHERE status='sent')::int AS sent,
      COUNT(*) FILTER (WHERE status='sent' AND opened_at IS NOT NULL)::int AS opened,
      COUNT(*) FILTER (WHERE status='sent' AND clicked_at IS NOT NULL)::int AS clicked,
      COUNT(*) FILTER (WHERE status='queued')::int AS queued,
      COUNT(*) FILTER (WHERE status='failed')::int AS failed
    FROM oc_messages`,
    sql`SELECT COUNT(DISTINCT from_email)::int AS total,
      COUNT(*) FILTER (WHERE status='new')::int AS new_cnt FROM oc_inbox WHERE matched_campaign_id IS NOT NULL`,
    sql`SELECT COUNT(*)::int AS n FROM oc_suppression`,
    sql`SELECT c.id, c.name, c.status, c.total, c.sent, c.failed, c.created_at,
      p.name AS product_name
    FROM oc_campaigns c LEFT JOIN oc_products p ON p.id = c.product_id
    ORDER BY c.created_at DESC LIMIT 6`,
  ]);
  const creators = creatorsQ.rows[0];
  const camp = campQ.rows[0];
  const today = todayQ.rows[0];
  const senders = sendersQ.rows[0];
  const funnel = funnelQ.rows[0];
  const replied = repliedQ.rows[0];
  const suppression = suppressionQ.rows[0]?.n || 0;
  const recent = recentQ.rows;

  const configured = saConfigured();
  const dailyRemaining = Math.max(0, (senders.daily_limit || 0) - (today.sent || 0));

  return NextResponse.json({
    creators, campaigns: camp, funnel,
    today: { sent: today.sent || 0, dailyLimit: senders.daily_limit || 0, dailyRemaining },
    replies: { total: replied.total || 0, new: replied.new_cnt || 0 },
    suppression,
    senders: { total: senders.total || 0, active: senders.active || 0, configured },
    recentCampaigns: recent,
  });
}

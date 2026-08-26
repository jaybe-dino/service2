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

  const creators = (await sql`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS with_email FROM oc_creators`).rows[0];

  const camp = (await sql`SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status='sending')::int AS sending,
      COUNT(*) FILTER (WHERE status='done')::int AS done,
      COUNT(*) FILTER (WHERE status='draft')::int AS draft
    FROM oc_campaigns`).rows[0];

  const today = (await sql`SELECT COUNT(*)::int AS sent FROM oc_messages
    WHERE status='sent' AND (sent_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date`).rows[0];

  const senders = (await sql`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE active)::int AS active,
      COALESCE(SUM(daily_limit) FILTER (WHERE active),0)::int AS daily_limit
    FROM oc_senders`).rows[0];

  const funnel = (await sql`SELECT
      COUNT(*) FILTER (WHERE status='sent')::int AS sent,
      COUNT(*) FILTER (WHERE status='sent' AND opened_at IS NOT NULL)::int AS opened,
      COUNT(*) FILTER (WHERE status='sent' AND clicked_at IS NOT NULL)::int AS clicked,
      COUNT(*) FILTER (WHERE status='queued')::int AS queued,
      COUNT(*) FILTER (WHERE status='failed')::int AS failed
    FROM oc_messages`).rows[0];

  const replied = (await sql`SELECT COUNT(DISTINCT from_email)::int AS total,
      COUNT(*) FILTER (WHERE status='new')::int AS new_cnt FROM oc_inbox WHERE matched_campaign_id IS NOT NULL`).rows[0];
  const suppression = (await sql`SELECT COUNT(*)::int AS n FROM oc_suppression`).rows[0]?.n || 0;

  const recent = (await sql`SELECT c.id, c.name, c.status, c.total, c.sent, c.failed, c.created_at,
      p.name AS product_name
    FROM oc_campaigns c LEFT JOIN oc_products p ON p.id = c.product_id
    ORDER BY c.created_at DESC LIMIT 6`).rows;

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

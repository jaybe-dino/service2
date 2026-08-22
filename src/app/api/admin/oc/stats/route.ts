import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 성과(퍼널) 통계 — 발송→오픈→클릭→회신 + A/B 비교
export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  // 캠페인별 발송/오픈/클릭
  const perCampaign = await sql`
    SELECT c.id, c.name, c.subject_b IS NOT NULL AS has_ab,
      COUNT(m.*) FILTER (WHERE m.status='sent')::int AS sent,
      COUNT(m.*) FILTER (WHERE m.status='sent' AND m.opened_at IS NOT NULL)::int AS opened,
      COUNT(m.*) FILTER (WHERE m.status='sent' AND m.clicked_at IS NOT NULL)::int AS clicked,
      COUNT(m.*) FILTER (WHERE m.status='failed')::int AS failed
    FROM oc_campaigns c LEFT JOIN oc_messages m ON m.campaign_id = c.id
    GROUP BY c.id, c.name, c.subject_b
    ORDER BY c.created_at DESC LIMIT 100`;

  // 캠페인별 회신(고유 발신자)
  const replies = await sql`SELECT matched_campaign_id AS cid, COUNT(DISTINCT from_email)::int AS replied
    FROM oc_inbox WHERE matched_campaign_id IS NOT NULL GROUP BY matched_campaign_id`;
  const rmap: Record<number, number> = {};
  for (const r of replies.rows) rmap[Number(r.cid)] = Number(r.replied);

  const rows = perCampaign.rows.map((c) => {
    const sent = Number(c.sent);
    const replied = rmap[Number(c.id)] || 0;
    return {
      id: c.id, name: c.name, has_ab: c.has_ab, sent, opened: Number(c.opened), clicked: Number(c.clicked), failed: Number(c.failed), replied,
      open_rate: sent ? Math.round((Number(c.opened) / sent) * 1000) / 10 : 0,
      click_rate: sent ? Math.round((Number(c.clicked) / sent) * 1000) / 10 : 0,
      reply_rate: sent ? Math.round((replied / sent) * 1000) / 10 : 0,
    };
  });

  // A/B 변형별(제목 A/B가 있는 캠페인)
  const ab = await sql`
    SELECT m.campaign_id AS cid, c.name, m.variant,
      COUNT(*) FILTER (WHERE m.status='sent')::int AS sent,
      COUNT(*) FILTER (WHERE m.status='sent' AND m.opened_at IS NOT NULL)::int AS opened
    FROM oc_messages m JOIN oc_campaigns c ON c.id = m.campaign_id
    WHERE c.subject_b IS NOT NULL AND m.variant IS NOT NULL
    GROUP BY m.campaign_id, c.name, m.variant ORDER BY m.campaign_id, m.variant`;

  const totals = rows.reduce((a, r) => ({
    sent: a.sent + r.sent, opened: a.opened + r.opened, clicked: a.clicked + r.clicked, replied: a.replied + r.replied,
  }), { sent: 0, opened: 0, clicked: 0, replied: 0 });

  return NextResponse.json({ totals, perCampaign: rows, ab: ab.rows });
}

import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { listInbox } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function guard() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return null;
}

// GET ?mailbox=&status=  또는  ?summary=1 (회신 현황 요약)
export async function GET(req: Request) {
  const g = await guard(); if (g) return g;
  const u = new URL(req.url);
  if (u.searchParams.get("summary")) {
    // 캠페인별 회신 현황: 발송 수 vs 회신(고유 발신자) 수 → 회신율
    const perCampaign = await sql`
      SELECT c.id, c.name, c.sent,
        COUNT(DISTINCT i.from_email)::int AS replied,
        COUNT(*) FILTER (WHERE i.status = 'new')::int AS new_replies
      FROM oc_campaigns c
      LEFT JOIN oc_inbox i ON i.matched_campaign_id = c.id
      GROUP BY c.id, c.name, c.sent
      HAVING c.sent > 0 OR COUNT(i.id) > 0
      ORDER BY c.created_at DESC LIMIT 100`;
    const perMailbox = await sql`
      SELECT mailbox, COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status='new')::int AS new_replies,
        COUNT(*) FILTER (WHERE matched_campaign_id IS NOT NULL OR matched_handle IS NOT NULL)::int AS matched
      FROM oc_inbox GROUP BY mailbox ORDER BY total DESC`;
    return NextResponse.json({ perCampaign: perCampaign.rows, perMailbox: perMailbox.rows });
  }
  const mailbox = (u.searchParams.get("mailbox") || "").trim().toLowerCase();
  const status = (u.searchParams.get("status") || "").trim();
  const cond: string[] = [];
  const params: unknown[] = [];
  if (mailbox) { params.push(mailbox); cond.push(`mailbox = $${params.length}`); }
  if (["new", "handled", "ignored"].includes(status)) { params.push(status); cond.push(`status = $${params.length}`); }
  const where = cond.length ? "WHERE " + cond.join(" AND ") : "";
  const { rows } = await sql.query(`SELECT * FROM oc_inbox ${where} ORDER BY created_at DESC LIMIT 300`, params);
  return NextResponse.json({ rows });
}

// POST { mailbox } 동기화  또는  { action:'setStatus', id, status }
export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as { mailbox?: string; max?: number; action?: string; id?: number; status?: string };

  if (b.action === "setStatus") {
    const id = Number(b.id);
    const status = String(b.status || "");
    if (!id || !["new", "handled", "ignored"].includes(status)) return NextResponse.json({ error: "id/status 오류" }, { status: 400 });
    await sql`UPDATE oc_inbox SET status = ${status} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  }

  const mailbox = String(b.mailbox || "").trim().toLowerCase();
  if (!mailbox) return NextResponse.json({ error: "mailbox 필요" }, { status: 400 });
  // 등록된 발신계정(공용 메일함)만 열람
  const s = await sql`SELECT id FROM oc_senders WHERE email = ${mailbox}`;
  if (!s.rows[0]) return NextResponse.json({ error: "등록된 메일함이 아닙니다" }, { status: 400 });

  const res = await listInbox(mailbox, { max: Math.min(Math.max(1, Number(b.max) || 80), 200) });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

  // 수신거부 의사 감지 키워드
  const UNSUB_RE = /(수신\s*거부|수신\s*동의\s*철회|그만\s*보내|보내지\s*마|unsubscribe|opt[-\s]?out|remove me|stop email|더\s*이상\s*(메일|연락))/i;
  let stored = 0, matched = 0, unsub = 0;
  for (const m of res.msgs || []) {
    const fromEmail = m.fromEmail;
    const cr = await sql`SELECT handle FROM oc_creators WHERE lower(email) = ${fromEmail} LIMIT 1`;
    const handle = cr.rows[0]?.handle || null;
    const cm = await sql`SELECT campaign_id FROM oc_messages WHERE to_email = ${fromEmail} ORDER BY sent_at DESC NULLS LAST LIMIT 1`;
    const campaignId = cm.rows[0]?.campaign_id || null;
    if (handle || campaignId) matched++;
    const nameMatch = m.from.match(/^\s*"?([^"<]*?)"?\s*</);
    const fromName = nameMatch ? nameMatch[1].trim() : null;
    const isUnsub = UNSUB_RE.test((m.subject || "") + " " + (m.body || ""));
    const r = await sql`INSERT INTO oc_inbox (mailbox, msg_id, thread_id, from_email, from_name, subject, snippet, body_text, received_at, matched_handle, matched_campaign_id, status)
      VALUES (${mailbox}, ${m.id}, ${m.threadId || null}, ${fromEmail}, ${fromName}, ${m.subject || null}, ${m.snippet || null}, ${m.body || null}, ${m.date || null}, ${handle}, ${campaignId}, ${isUnsub ? "new" : "new"})
      ON CONFLICT (mailbox, msg_id) DO UPDATE SET
        matched_handle = EXCLUDED.matched_handle, matched_campaign_id = EXCLUDED.matched_campaign_id, body_text = EXCLUDED.body_text
      RETURNING (xmax = 0) AS inserted`;
    if (r.rows[0]?.inserted) stored++;
    // 수신거부 → 제외목록 자동 등록(재발송 방지)
    if (isUnsub && fromEmail) {
      await sql`INSERT INTO oc_suppression (email, reason, source) VALUES (${fromEmail}, 'unsubscribe', ${mailbox})
        ON CONFLICT (email) DO NOTHING`;
      unsub++;
    }
    // 회신 → 아웃리치 CRM 파이프라인 자동 편입(핸들 매칭 시)
    if (handle && !isUnsub) {
      try {
        const ins = await sql`INSERT INTO outreach_targets (handle, status, note)
          SELECT ${handle}, 'replied', 'inbound reply'
          WHERE NOT EXISTS (SELECT 1 FROM outreach_targets WHERE handle = ${handle})
          RETURNING id`;
        let targetId: number | undefined = ins.rows[0]?.id;
        if (!targetId) {
          await sql`UPDATE outreach_targets SET status='replied', updated_at=now()
            WHERE handle=${handle} AND status IN ('discovered','contacted')`;
          targetId = (await sql`SELECT id FROM outreach_targets WHERE handle=${handle} ORDER BY id LIMIT 1`).rows[0]?.id;
        }
        if (targetId) await sql`INSERT INTO outreach_activity (target_id, actor, kind, body)
          VALUES (${targetId}, 'inbox', 'note', ${"회신: " + (m.subject || "").slice(0, 120)})`;
      } catch { /* CRM 연동 실패 무시 — 회신 적재는 완료 */ }
    }
  }

  // Slack 실시간 통지(SLACK_WEBHOOK_URL 설정 시)
  const hook = process.env.SLACK_WEBHOOK_URL;
  if (hook && (stored > 0 || unsub > 0)) {
    try {
      await fetch(hook, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `:inbox_tray: *아웃리치 회신 동기화* · ${mailbox}\n신규 ${stored} · 매칭 ${matched} · 수신거부 ${unsub}` }),
      });
    } catch { /* 통지 실패 무시 */ }
  }

  return NextResponse.json({ ok: true, fetched: res.msgs?.length || 0, stored, matched, unsubscribed: unsub });
}

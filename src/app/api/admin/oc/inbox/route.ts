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

// GET ?mailbox= — 적재된 수신함(회신 매칭) 조회
export async function GET(req: Request) {
  const g = await guard(); if (g) return g;
  const mailbox = (new URL(req.url).searchParams.get("mailbox") || "").trim().toLowerCase();
  const rows = mailbox
    ? (await sql`SELECT * FROM oc_inbox WHERE mailbox = ${mailbox} ORDER BY created_at DESC LIMIT 300`).rows
    : (await sql`SELECT * FROM oc_inbox ORDER BY created_at DESC LIMIT 300`).rows;
  return NextResponse.json({ rows });
}

// POST { mailbox } — 최근 30일 수신을 읽어 크리에이터/캠페인에 매칭·적재
export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as { mailbox?: string; max?: number };
  const mailbox = String(b.mailbox || "").trim().toLowerCase();
  if (!mailbox) return NextResponse.json({ error: "mailbox 필요" }, { status: 400 });
  // 등록된 발신계정(공용 메일함)만 열람
  const s = await sql`SELECT id FROM oc_senders WHERE email = ${mailbox}`;
  if (!s.rows[0]) return NextResponse.json({ error: "등록된 메일함이 아닙니다" }, { status: 400 });

  const res = await listInbox(mailbox, { max: Math.min(Math.max(1, Number(b.max) || 80), 200) });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

  let stored = 0, matched = 0;
  for (const m of res.msgs || []) {
    const fromEmail = m.fromEmail;
    // 크리에이터 핸들 매칭
    const cr = await sql`SELECT handle FROM oc_creators WHERE lower(email) = ${fromEmail} LIMIT 1`;
    const handle = cr.rows[0]?.handle || null;
    // 발송했던 캠페인 매칭(가장 최근)
    const cm = await sql`SELECT campaign_id FROM oc_messages WHERE to_email = ${fromEmail} ORDER BY sent_at DESC NULLS LAST LIMIT 1`;
    const campaignId = cm.rows[0]?.campaign_id || null;
    if (handle || campaignId) matched++;
    const nameMatch = m.from.match(/^\s*"?([^"<]*?)"?\s*</);
    const fromName = nameMatch ? nameMatch[1].trim() : null;
    const r = await sql`INSERT INTO oc_inbox (mailbox, msg_id, thread_id, from_email, from_name, subject, snippet, received_at, matched_handle, matched_campaign_id)
      VALUES (${mailbox}, ${m.id}, ${m.threadId || null}, ${fromEmail}, ${fromName}, ${m.subject || null}, ${m.snippet || null}, ${m.date || null}, ${handle}, ${campaignId})
      ON CONFLICT (mailbox, msg_id) DO UPDATE SET
        matched_handle = EXCLUDED.matched_handle, matched_campaign_id = EXCLUDED.matched_campaign_id
      RETURNING (xmax = 0) AS inserted`;
    if (r.rows[0]?.inserted) stored++;
  }
  return NextResponse.json({ ok: true, fetched: res.msgs?.length || 0, stored, matched });
}

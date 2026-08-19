import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { sendViaSender, senderConfigured, type OcSender } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_CAP = 50;

async function guard() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return null;
}

// 템플릿 변수 치환
function render(tpl: string, vars: Record<string, string | number | null | undefined>): string {
  return tpl.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) => {
    const v = vars[k.toLowerCase()];
    return v === null || v === undefined ? "" : String(v);
  });
}
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const fmt = (n: number | null | undefined) => (n == null ? "" : Number(n).toLocaleString("ko-KR"));

export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as { campaignId?: number; batch?: number; dry?: boolean };
  const campaignId = Number(b.campaignId);
  if (!campaignId) return NextResponse.json({ error: "campaignId 필요" }, { status: 400 });
  const batchReq = Math.min(Math.max(1, Number(b.batch) || 30), BATCH_CAP);
  const dry = b.dry === true;

  // 캠페인 + 발신계정 + 제품
  const cRes = await sql`SELECT c.*, s.email AS s_email, s.display_name AS s_name, s.backend AS s_backend,
      s.env_key AS s_env_key, s.active AS s_active, s.daily_limit AS s_daily,
      p.name AS p_name, p.brand AS p_brand, p.category AS p_category, p.concept AS p_concept, p.usp AS p_usp
    FROM oc_campaigns c
    LEFT JOIN oc_senders s ON s.id = c.sender_id
    LEFT JOIN oc_products p ON p.id = c.product_id
    WHERE c.id = ${campaignId}`;
  const c = cRes.rows[0];
  if (!c) return NextResponse.json({ error: "캠페인 없음" }, { status: 404 });
  if (!c.sender_id || !c.s_email) return NextResponse.json({ error: "발신계정 미지정" }, { status: 400 });
  if (!c.s_active) return NextResponse.json({ error: "발신계정 비활성" }, { status: 400 });

  const sender: OcSender = { email: c.s_email, display_name: c.s_name, backend: c.s_backend, env_key: c.s_env_key };
  if (!dry && !senderConfigured(sender)) return NextResponse.json({ error: "발신계정 시크릿 미설정(env)" }, { status: 400 });

  // 오늘(KST) 이 발신계정이 이미 보낸 수 → 일일한도 잔여
  const dailyLimit = Number(c.s_daily) || 300;
  const sentTodayRes = await sql`
    SELECT COUNT(*)::int AS n FROM oc_messages m
    JOIN oc_campaigns cc ON cc.id = m.campaign_id
    WHERE cc.sender_id = ${c.sender_id} AND m.status = 'sent'
      AND (m.sent_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date`;
  const sentToday = sentTodayRes.rows[0]?.n || 0;
  const dailyRemaining = Math.max(0, dailyLimit - sentToday);
  if (dailyRemaining <= 0) {
    return NextResponse.json({ sentNow: 0, failedNow: 0, dailyRemaining: 0, note: "오늘 일일한도 소진" });
  }

  const batch = Math.min(batchReq, dailyRemaining);

  // 다음 큐 메시지 + 크리에이터 변수
  const qMsgs = await sql`
    SELECT m.id, m.to_email, m.handle, cr.avg_views, cr.total_views, cr.videos, cr.brands, cr.region, cr.profile_url
    FROM oc_messages m
    LEFT JOIN oc_creators cr ON cr.handle = m.handle
    WHERE m.campaign_id = ${campaignId} AND m.status = 'queued'
    ORDER BY m.id ASC
    LIMIT ${batch}`;
  const msgs = qMsgs.rows;
  if (!msgs.length) {
    await sql`UPDATE oc_campaigns SET status = 'done', updated_at = now() WHERE id = ${campaignId}`;
    return NextResponse.json({ sentNow: 0, failedNow: 0, dailyRemaining, remainingQueued: 0, done: true });
  }

  await sql`UPDATE oc_campaigns SET status = 'sending', updated_at = now() WHERE id = ${campaignId}`;

  let sentNow = 0, failedNow = 0;
  for (const m of msgs) {
    const vars = {
      handle: m.handle || "",
      views: fmt(m.avg_views), avg_views: fmt(m.avg_views), total_views: fmt(m.total_views),
      videos: fmt(m.videos), brands: m.brands || "", region: m.region || "", profile_url: m.profile_url || "",
      product: c.p_name || "", brand: c.p_brand || "", category: c.p_category || "",
      concept: c.p_concept || "", usp: c.p_usp || "",
    };
    const subject = render(c.subject, vars);
    const rawBody = render(c.body, vars);
    const looksHtml = /<[a-z][\s\S]*>/i.test(rawBody);
    const html = looksHtml ? rawBody : esc(rawBody).replace(/\n/g, "<br>");
    const text = looksHtml ? undefined : rawBody;

    if (dry) {
      await sql`UPDATE oc_messages SET status='skipped', subject=${subject}, body=${rawBody}, error='dry-run', sent_at=now() WHERE id=${m.id}`;
      sentNow++;
      continue;
    }
    const res = await sendViaSender(sender, { to: m.to_email, subject, html, text });
    if (res.ok) {
      await sql`UPDATE oc_messages SET status='sent', subject=${subject}, body=${rawBody}, provider_id=${res.id || null}, error=NULL, sent_at=now() WHERE id=${m.id}`;
      sentNow++;
    } else {
      await sql`UPDATE oc_messages SET status='failed', subject=${subject}, body=${rawBody}, error=${(res.error || "발송 실패").slice(0, 300)}, sent_at=now() WHERE id=${m.id}`;
      failedNow++;
    }
    // 완만한 발송(스팸/스로틀 방지)
    await new Promise((r) => setTimeout(r, 350));
  }

  // 카운터/상태 갱신
  const agg = await sql`SELECT
      COUNT(*) FILTER (WHERE status='sent')::int AS sent,
      COUNT(*) FILTER (WHERE status='failed')::int AS failed,
      COUNT(*) FILTER (WHERE status='queued')::int AS queued
    FROM oc_messages WHERE campaign_id = ${campaignId}`;
  const a = agg.rows[0];
  const newStatus = a.queued > 0 ? "sending" : "done";
  await sql`UPDATE oc_campaigns SET sent=${a.sent}, failed=${a.failed}, status=${newStatus}, updated_at=now() WHERE id=${campaignId}`;

  return NextResponse.json({
    sentNow, failedNow,
    remainingQueued: a.queued,
    dailyRemaining: Math.max(0, dailyRemaining - sentNow),
    done: a.queued === 0,
  });
}

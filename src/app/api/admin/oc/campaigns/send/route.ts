import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { sendViaSender, saConfigured, type OcSender } from "@/lib/gmail";
import { unsubUrl } from "@/lib/oc-unsub";
import { askClaude, aiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH_CAP = 50;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://glovek.space").replace(/\/$/, "");

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

// 워밍업: 시작일 기준 경과일에 따라 일일 상한을 점증(스팸/평판 보호). 미설정 시 full.
const WARMUP = [30, 40, 60, 80, 120, 160, 220, 300, 400, 500];
function warmupCap(warmupStart: string | Date | null, full: number): number {
  if (!warmupStart) return full;
  const start = new Date(warmupStart);
  if (isNaN(start.getTime())) return full;
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  if (days >= WARMUP.length) return full;
  return Math.min(full, WARMUP[Math.max(0, days)]);
}

// 오픈 픽셀 + 링크 클릭 래핑 주입(HTML 전용)
function injectTracking(html: string, msgId: number, site: string): string {
  const wrapped = html.replace(/href="(https?:\/\/[^"]+)"/gi,
    (_m, url) => `href="${site}/api/oc/t/c/${msgId}?u=${encodeURIComponent(url)}"`);
  const pixel = `<img src="${site}/api/oc/t/o/${msgId}" width="1" height="1" alt="" style="display:none" />`;
  return wrapped + pixel;
}

export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as { campaignId?: number; batch?: number; dry?: boolean };
  const campaignId = Number(b.campaignId);
  if (!campaignId) return NextResponse.json({ error: "campaignId 필요" }, { status: 400 });
  const batchReq = Math.min(Math.max(1, Number(b.batch) || 30), BATCH_CAP);
  const dry = b.dry === true;

  // 캠페인 + 제품
  const cRes = await sql`SELECT c.*,
      p.name AS p_name, p.brand AS p_brand, p.category AS p_category, p.concept AS p_concept, p.usp AS p_usp
    FROM oc_campaigns c
    LEFT JOIN oc_products p ON p.id = c.product_id
    WHERE c.id = ${campaignId}`;
  const c = cRes.rows[0];
  if (!c) return NextResponse.json({ error: "캠페인 없음" }, { status: 404 });
  if (!dry && !saConfigured()) return NextResponse.json({ error: "서비스계정 미설정(GOOGLE_SA_KEY_JSON)" }, { status: 400 });

  // 발신 메일함 목록(다중 로테이션) — sender_ids 우선, 없으면 sender_id
  const idList: number[] = (Array.isArray(c.sender_ids) && c.sender_ids.length ? c.sender_ids : (c.sender_id ? [c.sender_id] : [])).map(Number);
  if (!idList.length) return NextResponse.json({ error: "발신 메일함 미지정" }, { status: 400 });
  const sRes = await sql.query(
    `SELECT id, email, display_name, daily_limit, warmup_start FROM oc_senders WHERE active = true AND id = ANY($1::int[])`,
    [idList],
  );
  if (!sRes.rows.length) return NextResponse.json({ error: "활성 발신 메일함 없음" }, { status: 400 });

  // 메일함별 오늘(KST) 발송량 → 잔여 한도 계산(워밍업 반영). 발송 주체는 oc_messages.sender_id 기준.
  interface Slot { id: number; sender: OcSender; remaining: number }
  const pool: Slot[] = [];
  const pausedNotes: string[] = [];
  let dailyRemaining = 0;
  for (const s of sRes.rows) {
    // 반송률 회로차단기: 최근 7일 발송 50건 이상 & 반송(하드 실패)률 2% 초과 → 자동 일시정지(평판 보호)
    const hb = (await sql`SELECT
        COUNT(*) FILTER (WHERE status='sent')::int AS sent,
        COUNT(*) FILTER (WHERE status='failed' AND error ~* 'invalid|no such|not found|disabled|unavailable|550|5\\.[0-9]\\.[0-9]')::int AS hard
      FROM oc_messages WHERE sender_id = ${s.id} AND sent_at > now() - interval '7 days'`).rows[0];
    const vol = (hb.sent || 0) + (hb.hard || 0);
    if (vol >= 50 && hb.hard / vol > 0.02) {
      const reason = `반송률 ${(hb.hard / vol * 100).toFixed(1)}% (7일 ${vol}건 중 ${hb.hard}) — 자동 일시정지`;
      await sql`UPDATE oc_senders SET active = false, pause_reason = ${reason} WHERE id = ${s.id}`;
      pausedNotes.push(`${s.email}: ${reason}`);
      continue; // 이 메일함은 발송 풀에서 제외
    }
    const sentTodayRes = await sql`SELECT COUNT(*)::int AS n FROM oc_messages
      WHERE sender_id = ${s.id} AND status = 'sent'
        AND (sent_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date`;
    const cap = warmupCap(s.warmup_start, Number(s.daily_limit) || 300);
    const remaining = Math.max(0, cap - (sentTodayRes.rows[0]?.n || 0));
    pool.push({ id: Number(s.id), sender: { email: s.email, display_name: s.display_name }, remaining });
    dailyRemaining += remaining;
  }
  if (!pool.length) return NextResponse.json({ error: `발송 가능한 메일함 없음${pausedNotes.length ? " — " + pausedNotes.join(" · ") : ""}` }, { status: 400 });
  if (!dry && dailyRemaining <= 0) {
    return NextResponse.json({ sentNow: 0, failedNow: 0, dailyRemaining: 0, note: "오늘 일일한도 소진(전 메일함)" });
  }

  const batch = dry ? batchReq : Math.min(batchReq, dailyRemaining);

  // 제외목록(수신거부·바운스)에 오른 큐 메시지는 발송 전 스킵 처리
  await sql`UPDATE oc_messages SET status='skipped', error='suppressed', sent_at=now()
    WHERE campaign_id=${campaignId} AND status='queued'
      AND EXISTS (SELECT 1 FROM oc_suppression s WHERE s.email = oc_messages.to_email)`;

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

  // L2 하이브리드: 크리에이터별 개인화 오프닝 1~2문장을 발송 전에 병렬 생성(실패 시 오프닝 없이 발송)
  const openings = new Map<number, string>();
  if (!dry && c.ai_level === "L2" && aiConfigured()) {
    const CONC = 3;
    for (let i = 0; i < msgs.length; i += CONC) {
      await Promise.all(msgs.slice(i, i + CONC).map(async (m) => {
        const r = await askClaude(
          "Write ONLY the opening 1-2 sentences of a friendly B2B outreach email to a TikTok creator, personalized with the facts given. " +
          "Same language as the email body draft provided. No greeting line like 'Hi' (the template has it), no placeholder, no quotes.",
          `크리에이터: @${m.handle || ""} · 평균 조회 ${m.avg_views || "?"} · 영상 ${m.videos || "?"}개 · 판매 브랜드: ${m.brands || "-"}\n` +
          `제품: ${c.p_name || ""} (${c.p_brand || ""} / ${c.p_category || ""})\n본문 초안(언어 참고용):\n${String(c.body).slice(0, 400)}`, 200);
        if (r.ok && r.text) openings.set(Number(m.id), r.text.trim());
      }));
    }
  }

  await sql`UPDATE oc_campaigns SET status = 'sending', updated_at = now() WHERE id = ${campaignId}`;

  // 로테이션 커서: 잔여 한도가 있는 메일함을 순환 선택
  let cursor = 0;
  const pickSlot = (): Slot | null => {
    for (let i = 0; i < pool.length; i++) {
      const slot = pool[(cursor + i) % pool.length];
      if (slot.remaining > 0) { cursor = (cursor + i + 1) % pool.length; return slot; }
    }
    return null;
  };

  let sentNow = 0, failedNow = 0;
  for (const m of msgs) {
    const vars = {
      handle: m.handle || "",
      views: fmt(m.avg_views), avg_views: fmt(m.avg_views), total_views: fmt(m.total_views),
      videos: fmt(m.videos), brands: m.brands || "", region: m.region || "", profile_url: m.profile_url || "",
      product: c.p_name || "", brand: c.p_brand || "", category: c.p_category || "",
      concept: c.p_concept || "", usp: c.p_usp || "",
    };
    // A/B 제목 — subject_b 있으면 메시지 id 홀짝으로 변형 배정
    const variant = c.subject_b ? (m.id % 2 === 0 ? "A" : "B") : "A";
    const subjectTpl = variant === "B" && c.subject_b ? c.subject_b : c.subject;
    const subject = render(subjectTpl, vars);
    const opening = openings.get(Number(m.id));
    const rawBody = (opening ? opening + "\n\n" : "") + render(c.body, vars);
    const looksHtml = /<[a-z][\s\S]*>/i.test(rawBody);
    // 순수 텍스트 본문의 맨 URL을 <a>로 자동 링크화 → 클릭 추적 가능
    let html = looksHtml ? rawBody : esc(rawBody).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>");
    const text = looksHtml ? undefined : rawBody;

    if (dry) {
      const slot = pool[0];
      await sql`UPDATE oc_messages SET status='skipped', sender_id=${slot?.id || null}, variant=${variant}, subject=${subject}, body=${rawBody}, error='dry-run', sent_at=now() WHERE id=${m.id}`;
      sentNow++;
      continue;
    }
    const slot = pickSlot();
    if (!slot) break; // 전 메일함 한도 소진
    html = injectTracking(html, m.id, SITE); // 오픈/클릭 추적 주입
    // C1: 원클릭 수신거부 — RFC 8058 헤더 + 본문 하단 가시 링크(추적 미적용, 직접 링크)
    const uUrl = unsubUrl(SITE, m.to_email);
    const extraHeaders = [
      `List-Unsubscribe: <mailto:${slot.sender.email}?subject=unsubscribe>, <${uUrl}>`,
      `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
    ];
    html += `<p style="margin-top:24px;font-size:11px;color:#94a3b8">더 이상 제안을 원치 않으시면 <a href="${uUrl}" style="color:#94a3b8">수신거부(Unsubscribe)</a>를 눌러주세요.</p>`;
    const textFinal = text ? text + `\n\n---\n수신거부(Unsubscribe): ${uUrl}` : undefined;
    const res = await sendViaSender(slot.sender, { to: m.to_email, subject, html, text: textFinal, extraHeaders });
    if (res.ok) {
      slot.remaining--;
      await sql`UPDATE oc_messages SET status='sent', sender_id=${slot.id}, variant=${variant}, subject=${subject}, body=${rawBody}, provider_id=${res.id || null}, error=NULL, sent_at=now() WHERE id=${m.id}`;
      sentNow++;
    } else {
      const err = res.error || "발송 실패";
      await sql`UPDATE oc_messages SET status='failed', sender_id=${slot.id}, variant=${variant}, subject=${subject}, body=${rawBody}, error=${err.slice(0, 300)}, sent_at=now() WHERE id=${m.id}`;
      failedNow++;
      // C3: 하드 바운스(영구 실패)만 제외목록 등록 — 소프트(일시) 실패는 재시도 여지 유지
      if (/invalid.*(recipient|address)|no such|not found|disabled|mailbox.*unavailable|550|5\.[0-9]\.[0-9]/i.test(err)) {
        await sql`INSERT INTO oc_suppression (email, reason, source) VALUES (${m.to_email}, 'bounce', 'send') ON CONFLICT (email) DO NOTHING`;
      }
    }
    // C2: 완만한 발송 + 랜덤 지터(기계적 등간격 패턴 제거 — 스팸 필터 회피)
    await new Promise((r) => setTimeout(r, 300 + Math.floor(Math.random() * 600)));
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
    ...(pausedNotes.length ? { note: `자동 일시정지: ${pausedNotes.join(" · ")}` } : {}),
  });
}

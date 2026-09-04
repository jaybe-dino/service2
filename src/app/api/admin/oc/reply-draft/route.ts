import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { askClaude, parseJsonLoose, aiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 회신 코파일럿 — ①의도 자동 분류 ②분류별 플레이북 초안(스레드 전체 맥락 주입, 상대 언어로)
//  POST { id }               : 해당 회신 1건 — 의도 분류 + 초안 생성, oc_inbox.intent/draft_reply 저장
//  POST { batch: true, max } : 반자동 모드 — 초안 없는 신규 회신 일괄 생성(반송·수신거부 제외)

const INTENTS = ["관심", "조건문의", "샘플요청", "가격협상", "거절", "수신거부", "기타"] as const;

// 분류별 플레이북 — 초안 생성 지침
const PLAYBOOK: Record<string, string> = {
  관심: "감사 인사 → 협업 방식 2~3줄 요약(무상 샘플 + 어필리에이트 커미션) → 다음 단계로 [신청 폼 링크] 안내. 밝고 간결하게.",
  조건문의: "질문에 정확히 답하되 모르는 조건은 지어내지 말고 '내부 확인 후 회신' 약속. 커미션·조건 수치는 [커미션율]% 플레이스홀더 사용. 끝에 관리자 확인 필요 표시는 하지 말 것(내부용).",
  샘플요청: "샘플 발송 절차 안내 → 배송지·연락처를 요청(또는 [배송지 폼 링크]) → 발송 후 콘텐츠 업로드 기한을 부드럽게 언급.",
  가격협상: "제안에 감사 → 우리 기본 조건 재확인 → 구체 수치 약속은 피하고 '실적에 따라 상향 가능' 프레임 → 통화/상세 논의 제안.",
  거절: "짧고 정중하게 마무리 → 향후 신제품 출시 때 다시 연락해도 될지 여지 남기기. 2~4문장.",
  수신거부: "발송하지 않음 — 초안 불필요.",
  기타: "메일 내용에 맞춰 자연스럽게 응대하고 협업 논의로 연결.",
};

interface Row { id: number; from_name: string | null; from_email: string; subject: string | null; body_text: string | null; matched_campaign_id: number | null; matched_handle: string | null }

async function threadContext(row: Row): Promise<string> {
  // 스레드 맥락: 이 주소로 보낸 최근 발송 2건 + 이전 수신 회신 2건 (시간순)
  const sent = (await sql`SELECT subject, body, sent_at FROM oc_messages
    WHERE to_email = ${row.from_email} AND status = 'sent' ORDER BY sent_at DESC LIMIT 2`).rows.reverse();
  const prevIn = (await sql`SELECT subject, body_text, received_at FROM oc_inbox
    WHERE from_email = ${row.from_email} AND id <> ${row.id} ORDER BY id DESC LIMIT 2`).rows.reverse();
  const parts: string[] = [];
  for (const s of sent) parts.push(`[우리가 보낸 메일] 제목: ${s.subject}\n${String(s.body || "").slice(0, 800)}`);
  for (const p of prevIn) parts.push(`[크리에이터의 이전 회신] 제목: ${p.subject}\n${String(p.body_text || "").slice(0, 600)}`);
  return parts.join("\n---\n");
}

async function campaignContext(campaignId: number | null): Promise<string> {
  if (!campaignId) return "";
  const c = (await sql`SELECT c.name, p.name AS product, p.brand, p.category, p.concept, p.usp
    FROM oc_campaigns c LEFT JOIN oc_products p ON p.id = c.product_id WHERE c.id = ${campaignId}`).rows[0];
  return c ? `제품: ${c.product || ""} / 브랜드: ${c.brand || ""} / 카테고리: ${c.category || ""}\nUSP: ${c.usp || ""}\n컨셉: ${c.concept || ""}` : "";
}

async function creatorContext(handle: string | null): Promise<string> {
  if (!handle) return "";
  const k = (await sql`SELECT followers, kb_brands, kb_videos, kb_rpm_usd FROM kb_creators
    WHERE lower(ltrim(handle,'@')) = ${handle.toLowerCase().replace(/^@/, "")} LIMIT 1`).rows[0];
  return k ? `크리에이터 실적: 팔로워 ${k.followers || "?"} · K뷰티 영상 ${k.kb_videos || 0}개 · 판매 브랜드 ${k.kb_brands || "-"}` : "";
}

// 1건 처리: 분류 → 초안 → 저장
async function processOne(row: Row, instruction?: string): Promise<{ intent: string; draft: string | null; error?: string }> {
  const inbound = String(row.body_text || row.subject || "").slice(0, 6000);

  // ① 의도 분류 (+언어 감지)
  const cls = await askClaude(
    `You classify inbound replies from creators responding to K-beauty outreach emails. Respond with ONLY a JSON object: {"intent": one of ${JSON.stringify(INTENTS)}, "language": "the language of the message e.g. English/Thai/Vietnamese/Korean"}`,
    `크리에이터 회신:\n"""\n${inbound}\n"""`, 200);
  const parsed = cls.ok ? parseJsonLoose<{ intent?: string; language?: string }>(cls.text!) : null;
  const intent = (parsed?.intent && (INTENTS as readonly string[]).includes(parsed.intent)) ? parsed.intent : "기타";
  const language = parsed?.language || "the same language as the creator's message";

  // 수신거부 의도 → 초안 없이 제외목록 등록
  if (intent === "수신거부") {
    await sql`INSERT INTO oc_suppression (email, reason, source) VALUES (${row.from_email}, 'unsubscribe', 'reply-intent') ON CONFLICT (email) DO NOTHING`;
    await sql`UPDATE oc_inbox SET intent = ${intent}, draft_reply = NULL WHERE id = ${row.id}`;
    return { intent, draft: null };
  }

  // ② 플레이북 초안 (스레드·제품·실적 맥락)
  const [thread, camp, creator] = await Promise.all([
    threadContext(row), campaignContext(row.matched_campaign_id), creatorContext(row.matched_handle),
  ]);
  const gen = await askClaude(
    "You are a K-beauty brand partnerships manager. Write a reply email BODY only (no subject, no preamble). " +
    `Write in ${language}. Warm, professional, concise (under 150 words). ` +
    "Never invent links, prices or facts — use placeholders like [신청 폼 링크], [배송지 폼 링크], [커미션율] when needed. " +
    `PLAYBOOK for this reply type: ${PLAYBOOK[intent]}`,
    [
      camp ? `우리 제품/캠페인:\n${camp}` : "",
      creator, thread ? `지금까지의 대화:\n${thread}` : "",
      instruction ? `추가 지시: ${instruction}` : "",
      `크리에이터(${row.from_name || row.from_email})의 이번 회신 [의도: ${intent}]:\n"""\n${inbound}\n"""\n\n답장 본문:`,
    ].filter(Boolean).join("\n\n"), 1200);

  if (!gen.ok) { await sql`UPDATE oc_inbox SET intent = ${intent} WHERE id = ${row.id}`; return { intent, draft: null, error: gen.error }; }
  await sql`UPDATE oc_inbox SET intent = ${intent}, draft_reply = ${gen.text} WHERE id = ${row.id}`;
  return { intent, draft: gen.text! };
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  if (!aiConfigured()) return NextResponse.json({ error: "AI 미설정: ANTHROPIC_API_KEY 필요" }, { status: 400 });
  const b = (await req.json().catch(() => ({}))) as { id?: number; instruction?: string; batch?: boolean; max?: number };

  // 반자동: 초안 없는 신규 회신 일괄 처리 (반송 제외, 오래된 것부터)
  if (b.batch) {
    const max = Math.min(Math.max(1, Number(b.max) || 10), 20);
    const rows = (await sql`SELECT id, from_name, from_email, subject, body_text, matched_campaign_id, matched_handle
      FROM oc_inbox WHERE status = 'new' AND is_bounce = false AND draft_reply IS NULL AND intent IS DISTINCT FROM '수신거부'
      ORDER BY id ASC LIMIT ${max}`).rows as Row[];
    const out: { id: number; intent: string; ok: boolean }[] = [];
    for (const r of rows) {
      const res = await processOne(r);
      out.push({ id: r.id, intent: res.intent, ok: !!res.draft || res.intent === "수신거부" });
    }
    return NextResponse.json({ ok: true, processed: out.length, results: out });
  }

  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const row = (await sql`SELECT id, from_name, from_email, subject, body_text, matched_campaign_id, matched_handle
    FROM oc_inbox WHERE id = ${id}`).rows[0] as Row | undefined;
  if (!row) return NextResponse.json({ error: "회신 없음" }, { status: 404 });

  const res = await processOne(row, b.instruction);
  if (!res.draft && res.intent !== "수신거부") return NextResponse.json({ error: res.error || "초안 생성 실패", intent: res.intent }, { status: 400 });
  return NextResponse.json({
    intent: res.intent, draft: res.draft, to: row.from_email,
    subject: `Re: ${(row.subject || "").replace(/^re:\s*/i, "")}`,
    unsubscribed: res.intent === "수신거부",
  });
}

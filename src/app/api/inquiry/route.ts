import { NextResponse, after } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendIngest } from "@/lib/admin-ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 마케팅 1:1 / 틱톡샵 온보딩 / 인플루언서 제안 등 문의 저장
const KINDS = ["marketing", "tiktokshop", "proposal", "sales"];
const KIND_LABEL: Record<string, string> = {
  marketing: "마케팅 1:1", tiktokshop: "틱톡샵 온보딩", proposal: "인플루언서 제안", sales: "도입 문의",
};

async function notifySlack(kind: string, email: string | null, body: Record<string, unknown>) {
  const hook = process.env.SLACK_WEBHOOK_URL;
  if (!hook) return;
  const lines = [
    `:bell: *새 ${KIND_LABEL[kind] ?? kind} 문의*`,
    email ? `• 보낸 사람: ${email}` : null,
    body.company ? `• 브랜드/회사: ${body.company}` : null,
    body.context ? `• 대상: ${body.context}` : null,
    body.budget ? `• 예산/단가: ${body.budget}` : null,
    body.message ? `• 내용: ${String(body.message).slice(0, 500)}` : null,
  ].filter(Boolean).join("\n");
  try {
    await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: lines }) });
  } catch {
    /* 슬랙 실패는 무시 (문의 저장은 이미 완료) */
  }
}

export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const kind = KINDS.includes(body?.kind) ? body.kind : "marketing";
  const me = await getCurrentUser();
  const userEmail = me?.email ?? (String(body?.email ?? "").trim().toLowerCase() || null);
  await ensureSchema();
  const ins = await sql<{ id: number }>`INSERT INTO inquiries (kind, user_email, payload)
            VALUES (${kind}, ${userEmail}, ${JSON.stringify(body ?? {})}::jsonb) RETURNING id`;
  // 어드민(/admin)에 적재 + 슬랙 알림(SLACK_WEBHOOK_URL 설정 시). 자동 이메일 발송은 안 함.
  await notifySlack(kind, userEmail, (body ?? {}) as Record<string, unknown>);
  // 운영 어드민 인제스트(lead) — 응답 이후 비차단 전송
  const inqId = ins.rows[0]?.id;
  if (inqId != null) {
    const b = (body ?? {}) as Record<string, unknown>;
    const summary = [`[${KIND_LABEL[kind] ?? kind}]`, b.context ? `대상:${b.context}` : null, b.budget ? `예산:${b.budget}` : null, b.message ? String(b.message).slice(0, 500) : null]
      .filter(Boolean).join(" ");
    after(() => sendIngest("lead", `inq:${inqId}`, {
      email: userEmail || undefined,
      brand_name: b.company ? String(b.company) : undefined,
      category: kind,
      source: "glovek_inquiry",
      message: summary,
      source_ref: String(inqId),
    }));
  }
  return NextResponse.json({ ok: true });
}

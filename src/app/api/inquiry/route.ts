import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
  const userEmail = me?.email ?? (body?.email ?? "").trim().toLowerCase() ?? null;
  await ensureSchema();
  await sql`INSERT INTO inquiries (kind, user_email, payload)
            VALUES (${kind}, ${userEmail}, ${JSON.stringify(body ?? {})}::jsonb)`;
  // 어드민(/admin)에 적재 + 슬랙 알림(SLACK_WEBHOOK_URL 설정 시). 자동 이메일 발송은 안 함.
  await notifySlack(kind, userEmail, (body ?? {}) as Record<string, unknown>);
  return NextResponse.json({ ok: true });
}

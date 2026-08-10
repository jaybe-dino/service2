// 이메일 발송 어댑터 — Resend(권장). env 미설정 시 configured=false(발송 비활성, 프로세스는 동작).
// 필요한 env: RESEND_API_KEY, RESEND_FROM (예: "GloveK <partners@glovek.space>" · 도메인 인증 필요)
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export interface SendResult { ok: boolean; id?: string; error?: string }

export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<SendResult> {
  if (!emailConfigured()) return { ok: false, error: "RESEND 미설정(RESEND_API_KEY/RESEND_FROM)" };
  const to2 = String(to || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to2)) return { ok: false, error: "수신 이메일 형식 오류" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({
        from: process.env.RESEND_FROM,
        to: [to2],
        subject: subject.slice(0, 200) || "(제목 없음)",
        text,
        ...(html ? { html } : {}),
        ...(process.env.RESEND_REPLY_TO ? { reply_to: process.env.RESEND_REPLY_TO } : {}),
      }),
    });
    const j = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: j.message || `HTTP ${res.status}` };
    return { ok: true, id: j.id };
  } catch (e) {
    return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 160) };
  }
}

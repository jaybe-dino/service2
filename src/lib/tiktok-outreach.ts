// 틱톡 공식 채널 아웃리치 어댑터 — TikTok Shop 제휴 초대 / Creator Marketplace(TTCM) 초대.
// 공식 API는 앱 승인·서명·OAuth가 필요하므로, 실제 호출은 연동 미들웨어 URL로 위임(webhook식).
//   env: TIKTOK_INVITE_URL(당신의 틱톡 연동 엔드포인트), TIKTOK_INVITE_TOKEN(Bearer)
// 미설정 시 configured=false → 발송 비활성(프로세스·한도 집계는 동작 = dry).
export function tiktokOutreachConfigured(): boolean {
  return Boolean(process.env.TIKTOK_INVITE_URL && process.env.TIKTOK_INVITE_TOKEN);
}

export interface InviteResult { ok: boolean; id?: string; error?: string }

// 크리에이터 초대(제휴/TTCM). handle 기반(이메일 불필요). productId 있으면 상품 협업 초대.
export async function inviteCreator(handle: string, message: string, opts?: { productId?: string | null; channel?: string }): Promise<InviteResult> {
  if (!tiktokOutreachConfigured()) return { ok: false, error: "틱톡 연동 미설정(TIKTOK_INVITE_URL/TIKTOK_INVITE_TOKEN)" };
  const h = String(handle || "").replace(/^@/, "").trim();
  if (!h) return { ok: false, error: "handle 필요" };
  try {
    const res = await fetch(process.env.TIKTOK_INVITE_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.TIKTOK_INVITE_TOKEN}` },
      body: JSON.stringify({ handle: h, message: message.slice(0, 1000), productId: opts?.productId ?? null, channel: opts?.channel || "affiliate" }),
    });
    const j = (await res.json().catch(() => ({}))) as { id?: string; inviteId?: string; message?: string; error?: string };
    if (!res.ok) return { ok: false, error: j.message || j.error || `HTTP ${res.status}` };
    return { ok: true, id: j.id || j.inviteId };
  } catch (e) {
    return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 160) };
  }
}

// 프로모션 코드 — 틱톡샵 온보딩(몰) 정기결제 첫 주기 무료용.
// promo_codes(code, active, max_uses, used_count) + promo_redemptions(code, user_id).
import { sql } from "./db";

export interface PromoCheck { ok: boolean; code?: string; reason?: string }

// 검증만(사용 처리 X). 유효/한도/중복사용 확인.
export async function validatePromo(codeRaw: string, userId: string): Promise<PromoCheck> {
  const code = String(codeRaw || "").trim().toUpperCase();
  if (!code) return { ok: false, reason: "코드가 비어 있습니다." };
  try {
    const { rows } = await sql<{ code: string; active: boolean; max_uses: number; used_count: number }>`
      SELECT code, active, max_uses, used_count FROM promo_codes WHERE code=${code} LIMIT 1`;
    const p = rows[0];
    if (!p || !p.active) return { ok: false, reason: "유효하지 않은 코드입니다." };
    if (p.max_uses > 0 && p.used_count >= p.max_uses) return { ok: false, reason: "사용 한도가 초과된 코드입니다." };
    const red = await sql`SELECT 1 FROM promo_redemptions WHERE code=${code} AND user_id=${userId} LIMIT 1`;
    if (red.rows.length) return { ok: false, reason: "이미 사용한 코드입니다." };
    return { ok: true, code };
  } catch {
    return { ok: false, reason: "코드 확인 중 오류가 발생했습니다." };
  }
}

// 사용 처리 — 사용자 리뎀션 기록(멱등) 먼저 → 성공 시에만 used_count++.
// 리뎀션 기록이 재사용 방지의 근거라, 실패를 '무시'하지 않고 로깅한다(코드 무한 재사용 방지).
export async function redeemPromo(code: string, userId: string): Promise<boolean> {
  const c = String(code || "").trim().toUpperCase();
  if (!c) return false;
  try {
    await sql`INSERT INTO promo_redemptions (code, user_id) VALUES (${c}, ${userId}) ON CONFLICT (code, user_id) DO NOTHING`;
    await sql`UPDATE promo_codes SET used_count = used_count + 1 WHERE code=${c}`;
    return true;
  } catch (e) {
    console.error("[promo] redeem 실패 — 재사용 방지 기록 누락 가능", c, userId, String(e).slice(0, 160));
    return false;
  }
}

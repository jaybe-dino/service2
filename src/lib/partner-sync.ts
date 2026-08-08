import crypto from "crypto";
import { sql } from "./db";

// TikTok Admin(admin.glovek.space) ↔ GloveK 양방향 브랜드 프로필 동기화.
// - 공유 필드(양방향): 아래 SHARED. glovek 소유(결제·구독·GMV)는 별도 admin-ingest로 단방향.
// - 인증: admin→glovek 는 Bearer(PARTNER_ADMIN_TOKEN), glovek→admin 웹훅은 HMAC(PARTNER_WEBHOOK_SECRET).
// - 충돌: profile_updated_at 비교 last-write-wins. 에코 방지: brand-upsert 적용 시 웹훅을 쏘지 않음.

// 표준 필드명 ↔ users 컬럼 매핑(공유 필드만).
export const SHARED_FIELD_COLUMN: Record<string, string> = {
  brand_name: "brand",
  contact_name: "name",
  email: "email",
  phone: "phone",
  biz_no: "biz_no",
  category: "category",
  brand_url: "brand_url",
};
export const SHARED_FIELDS = Object.keys(SHARED_FIELD_COLUMN);

export function partnerToken(): string {
  return process.env.PARTNER_ADMIN_TOKEN || "";
}
// admin→glovek Bearer 인증. 토큰 미설정이면 항상 실패(연동 비활성).
export function partnerAuthed(req: Request): boolean {
  const t = partnerToken();
  if (!t) return false;
  const h = req.headers.get("authorization") || "";
  const got = h.replace(/^Bearer\s+/i, "").trim();
  if (!got || got.length !== t.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(t)); } catch { return false; }
}

function webhookUrl(): string {
  if (process.env.PARTNER_WEBHOOK_URL) return process.env.PARTNER_WEBHOOK_URL;
  const base = process.env.ADMIN_INGEST_URL; // 폴백: admin 베이스 + 표준 경로
  return base ? `${base.replace(/\/$/, "")}/api/partner/glovek-webhook` : "";
}
function webhookSecret(): string {
  return process.env.PARTNER_WEBHOOK_SECRET || process.env.ADMIN_INGEST_SECRET || "";
}

// glovek 공유 프로필이 바뀌면 admin 으로 변경분 웹훅(HMAC 서명). fire-and-forget, 미설정 시 no-op.
export async function notifyAdminBrandChange(row: { id: string; email: string; fields: Record<string, unknown>; updated_at: string }): Promise<void> {
  const url = webhookUrl(), secret = webhookSecret();
  if (!url || !secret) return;
  const body = JSON.stringify({ id: row.id, email: row.email, updated_at: row.updated_at, fields: row.fields });
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-GloveK-Signature": sig }, body });
  } catch { /* 통지 실패는 사용자 플로우 막지 않음 */ }
}

// glovek 쪽에서 공유 필드를 수정했을 때 호출 — profile_updated_at 갱신 + admin 통지(변경분만).
// changed: 표준 필드명 → 새 값. (email은 매핑키라 함께 내려줌)
export async function touchProfileAndNotify(userId: string, changed: Record<string, unknown>): Promise<void> {
  const now = new Date().toISOString();
  await sql`UPDATE users SET profile_updated_at = ${now} WHERE id = ${userId}`;
  const r = await sql<{ email: string }>`SELECT email FROM users WHERE id = ${userId} LIMIT 1`;
  const email = r.rows[0]?.email;
  if (!email) return;
  await notifyAdminBrandChange({ id: userId, email, fields: changed, updated_at: now });
}

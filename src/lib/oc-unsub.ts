// 수신거부 토큰 — 이메일별 HMAC 서명으로 위조 방지(로그인 불필요, RFC 8058 원클릭 대응).
import crypto from "node:crypto";

const SECRET = process.env.UNSUB_SECRET || process.env.SESSION_SECRET || "glovek-oc-unsub";

export function unsubToken(email: string): string {
  return crypto.createHmac("sha256", SECRET).update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function verifyUnsubToken(email: string, token: string): boolean {
  const expect = unsubToken(email);
  try { return crypto.timingSafeEqual(Buffer.from(expect), Buffer.from(String(token || ""))); } catch { return false; }
}

export function unsubUrl(site: string, email: string): string {
  return `${site}/api/oc/u?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`;
}

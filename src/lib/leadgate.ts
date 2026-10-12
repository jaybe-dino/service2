// 리드 게이트 — 서버 전용(crypto 서명 토큰). 공용(클라이언트 안전) 상수/유틸은 leadgate-shared에서 re-export.
import crypto from "node:crypto";

export * from "./leadgate-shared";
import { accessCookieName } from "./leadgate-shared";
export { accessCookieName };

const SECRET = process.env.UNSUB_SECRET || process.env.SESSION_SECRET || "glovek-leadgate";

export function makeAccessToken(kind: string, email: string): string {
  const sig = crypto.createHmac("sha256", SECRET).update(`lg:${kind}:${email}`).digest("hex").slice(0, 24);
  return Buffer.from(email).toString("base64url") + "." + sig;
}
export function verifyAccessToken(kind: string, tok: string | undefined): boolean {
  if (!tok) return false;
  const [b64, sig] = tok.split(".");
  if (!b64 || !sig) return false;
  try {
    const email = Buffer.from(b64, "base64url").toString("utf-8");
    const exp = crypto.createHmac("sha256", SECRET).update(`lg:${kind}:${email}`).digest("hex").slice(0, 24);
    return crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(sig));
  } catch { return false; }
}

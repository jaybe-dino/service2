// 파트너 파일 API 인증 — FILE_API_TOKEN 헤더 검증 + 15분 HMAC 서명 URL.
import crypto from "crypto";

export function fileApiToken(): string {
  return process.env.FILE_API_TOKEN || "";
}

// 헤더 토큰 검증(timing-safe). env 미설정 시 항상 실패(fail-closed) — 라우트에서 503 안내.
export function checkFileToken(req: Request): boolean {
  const token = fileApiToken();
  if (!token) return false;
  const got = req.headers.get("x-file-token") || "";
  const a = Buffer.from(got), b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function signFileUrl(fileId: string, expEpochSec: number): string {
  return crypto.createHmac("sha256", fileApiToken()).update(`${fileId}.${expEpochSec}`).digest("hex");
}

export function verifyFileSig(fileId: string, exp: string | null, sig: string | null): boolean {
  const token = fileApiToken();
  if (!token || !exp || !sig || !/^\d+$/.test(exp)) return false;
  if (Number(exp) * 1000 < Date.now()) return false; // 만료
  const expect = signFileUrl(fileId, Number(exp));
  const a = Buffer.from(sig), b = Buffer.from(expect);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://glovek.space").replace(/\/$/, "");
}

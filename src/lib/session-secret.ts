import crypto from "crypto";

// 세션 서명 시크릿 — SESSION_SECRET 우선.
// 미설정 시: 프로덕션에서는 기존 배포 env(DB URL·PG 시크릿)에서 '결정적으로' 파생 —
//  · 인스턴스가 달라도 동일(서버리스 다중 인스턴스에서 세션이 깨지지 않음)
//  · 저장소에 노출된 고정 문자열이 아니라 위조 불가
// 개발에서만 고정 dev 문자열 사용.
export function sessionSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const seed = [
    process.env.POSTGRES_URL || process.env.DATABASE_URL || "",
    process.env.NICEPAY_SECRET_KEY || "",
  ].join("|");
  if (process.env.NODE_ENV === "production" && seed.length > 8) {
    return crypto.createHash("sha256").update("glovek-session-v1:" + seed).digest("hex");
  }
  return "dev-insecure-secret-change-me";
}

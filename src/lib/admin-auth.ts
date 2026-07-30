import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// 사용자 인증과 완전히 분리된 별도 관리자 세션 (id/pw 기반)
import { sessionSecret } from "./session-secret";
const COOKIE = "ktrend_admin";
const PROD = process.env.NODE_ENV === "production";
const secret = new TextEncoder().encode(sessionSecret());

export const ADMIN_USER = process.env.ADMIN_USERNAME || "dino";
export const ADMIN_PASS = process.env.ADMIN_PASSWORD || "dino1029";

export function checkAdminCredentials(username: string, password: string): boolean {
  // 프로덕션에서 ADMIN_PASSWORD 미설정이면 로그인 차단(fail-closed) — 저장소에 노출된 기본값 사용 금지.
  if (PROD && !process.env.ADMIN_PASSWORD) return false;
  return username === ADMIN_USER && password === ADMIN_PASS;
}

export async function createAdminSession(): Promise<void> {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function isAdminAuthed(): Promise<boolean> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return false;
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// 사용자 인증과 완전히 분리된 별도 관리자 세션 (id/pw 기반)
const COOKIE = "ktrend_admin";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-insecure-secret-change-me");

export const ADMIN_USER = process.env.ADMIN_USERNAME || "dino";
export const ADMIN_PASS = process.env.ADMIN_PASSWORD || "dino1029";

export function checkAdminCredentials(username: string, password: string): boolean {
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

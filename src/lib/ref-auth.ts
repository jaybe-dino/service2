import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// 추천인(파트너) 전용 세션 — 사용자/어드민 세션과 완전 분리
const COOKIE = "glovek_ref";
const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-insecure-secret-change-me");

export async function createRefSession(code: string): Promise<void> {
  const token = await new SignJWT({ role: "ref", code })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearRefSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

// 현재 추천인 세션의 코드 반환 (없으면 null)
export async function getRefCode(): Promise<string | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload.role === "ref" ? (payload.code as string) : null;
  } catch {
    return null;
  }
}

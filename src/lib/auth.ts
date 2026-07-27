import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { sql, ensureSchema, type DbUser } from "./db";

const COOKIE = "ktrend_session";
// 프로덕션에서 SESSION_SECRET 미설정 시 부팅마다 랜덤 시크릿(로그인 무효화되지만 위조는 차단).
const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET
    || (process.env.NODE_ENV === "production" ? crypto.randomUUID() : "dev-insecure-secret-change-me"),
);

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: string, email: string): Promise<void> {
  const token = await new SignJWT({ sub: userId, email })
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

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<DbUser | null> {
  const id = await getSessionUserId();
  if (!id) return null;
  await ensureSchema();
  const { rows } = await sql<DbUser>`
    SELECT id, email, name, brand, role, plan, pro_until, markets FROM users WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

// 열람 가능 시장 파싱 — US는 항상 포함(기본 시장). CSV → 정규화된 대문자 코드 배열.
export function parseMarkets(raw: string | null | undefined): string[] {
  const extra = String(raw || "")
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return Array.from(new Set(["US", ...extra]));
}

// 클라이언트로 내려줄 안전한 형태 (+ 체험 반영 isPro, 열람 가능 시장)
export function publicUser(u: DbUser) {
  const trialActive = Number(u.pro_until) > Date.now();
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    brand: u.brand,
    role: u.role,
    plan: u.plan,
    proUntil: Number(u.pro_until),
    isPro: u.plan === "pro" || u.plan === "enterprise" || trialActive,
    markets: parseMarkets(u.markets),
  };
}

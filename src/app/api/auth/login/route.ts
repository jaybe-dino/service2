import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured, type DbUser } from "@/lib/db";
import { verifyPassword, createSession, publicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다 (POSTGRES_URL)." }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호를 입력하세요." }, { status: 400 });
  }
  await ensureSchema();
  const { rows } = await sql<DbUser & { password_hash: string }>`
    SELECT id,email,name,brand,role,plan,pro_until,password_hash FROM users WHERE email=${email} LIMIT 1`;
  const u = rows[0];
  if (!u || !(await verifyPassword(password, u.password_hash))) {
    return NextResponse.json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  await createSession(u.id, u.email);
  return NextResponse.json({ user: publicUser(u) });
}

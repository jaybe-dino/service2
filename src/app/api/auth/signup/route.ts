import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { hashPassword, createSession, publicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다 (POSTGRES_URL)." }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const name = (body?.name ?? "").trim();
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";
  const brand = (body?.brand ?? "").trim();
  const role = (body?.role ?? "").trim();

  if (!name || !email || !password || !brand) {
    return NextResponse.json({ error: "필수 항목(이름·이메일·비밀번호·브랜드)을 입력하세요." }, { status: 400 });
  }
  await ensureSchema();
  const exists = await sql`SELECT 1 FROM users WHERE email = ${email} LIMIT 1`;
  if (exists.rows.length) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }
  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);
  await sql`INSERT INTO users (id, email, password_hash, name, brand, role, plan)
            VALUES (${id}, ${email}, ${password_hash}, ${name}, ${brand}, ${role}, 'basic')`;
  await createSession(id, email);
  const { rows } = await sql`SELECT id,email,name,brand,role,plan,pro_until FROM users WHERE id=${id}`;
  return NextResponse.json({ user: publicUser(rows[0] as never) });
}

import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tempPassword(): string {
  const s = "abcdefghjkmnpqrstuvwxyz23456789";
  let p = "";
  for (let i = 0; i < 10; i++) p += s[crypto.randomInt(s.length)]; // 암호학적 난수(추측 방지)
  return p;
}

// 관리자가 회원 비밀번호를 임시값으로 초기화 → 임시 비밀번호를 1회 반환(관리자가 회원에게 전달)
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email 필요" }, { status: 400 });
  const u = await sql`SELECT id FROM users WHERE email=${email} LIMIT 1`;
  if (!u.rows.length) return NextResponse.json({ error: "회원 없음" }, { status: 404 });
  const temp = tempPassword();
  const hash = await hashPassword(temp);
  await sql`UPDATE users SET password_hash=${hash} WHERE email=${email}`;
  return NextResponse.json({ ok: true, email, tempPassword: temp });
}

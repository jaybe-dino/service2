import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 관리자 권한: 특정 회원에게 Pro 기간 부여/연장
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email ?? "").trim().toLowerCase();
  const days = Math.max(0, Math.min(3650, Number(body?.days ?? 30)));
  if (!email) return NextResponse.json({ error: "email 필요" }, { status: 400 });
  await ensureSchema();
  const ms = days * 86_400_000;
  const { rowCount } = await sql`
    UPDATE users SET pro_until = GREATEST(pro_until, ${Date.now()}) + ${ms} WHERE email = ${email}`;
  if (!rowCount) return NextResponse.json({ ok: false, error: "해당 이메일 회원 없음" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

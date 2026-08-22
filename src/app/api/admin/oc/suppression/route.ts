import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return null;
}
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// GET — 제외목록(수신거부·바운스·스팸·수동)
export async function GET() {
  const g = await guard(); if (g) return g;
  const rows = (await sql`SELECT email, reason, source, created_at FROM oc_suppression ORDER BY created_at DESC LIMIT 1000`).rows;
  const cnt = (await sql`SELECT COUNT(*)::int AS n FROM oc_suppression`).rows[0]?.n || 0;
  return NextResponse.json({ rows, count: cnt });
}

// POST {email, reason?} — 수동 추가
export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as { email?: string; reason?: string };
  const email = String(b.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "이메일 형식 오류" }, { status: 400 });
  await sql`INSERT INTO oc_suppression (email, reason, source) VALUES (${email}, ${b.reason || "manual"}, 'admin')
    ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason`;
  return NextResponse.json({ ok: true });
}

// DELETE ?email= — 제외 해제
export async function DELETE(req: Request) {
  const g = await guard(); if (g) return g;
  const email = (new URL(req.url).searchParams.get("email") || "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email 필요" }, { status: 400 });
  await sql`DELETE FROM oc_suppression WHERE email = ${email}`;
  return NextResponse.json({ ok: true });
}

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

// 저장 세그먼트(필터 조합) — 재사용
export async function GET() {
  const g = await guard(); if (g) return g;
  const { rows } = await sql`SELECT id, name, filter, created_at FROM oc_segments ORDER BY created_at DESC LIMIT 200`;
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as { name?: string; filter?: unknown };
  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "이름 필수" }, { status: 400 });
  await sql.query(`INSERT INTO oc_segments (name, filter) VALUES ($1, $2::jsonb)`, [name, JSON.stringify(b.filter || {})]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const g = await guard(); if (g) return g;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await sql`DELETE FROM oc_segments WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

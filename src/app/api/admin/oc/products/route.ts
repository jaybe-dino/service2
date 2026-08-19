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

export async function GET() {
  const g = await guard(); if (g) return g;
  const { rows } = await sql`SELECT id, name, brand, category, concept, usp, notes, created_at
    FROM oc_products ORDER BY created_at DESC LIMIT 500`;
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "제품명 필수" }, { status: 400 });
  const { rows } = await sql`INSERT INTO oc_products (name, brand, category, concept, usp, notes, created_by)
    VALUES (${name}, ${b.brand || null}, ${b.category || null}, ${b.concept || null}, ${b.usp || null}, ${b.notes || null}, 'admin')
    RETURNING id`;
  return NextResponse.json({ ok: true, id: rows[0]?.id });
}

export async function DELETE(req: Request) {
  const g = await guard(); if (g) return g;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await sql`DELETE FROM oc_products WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

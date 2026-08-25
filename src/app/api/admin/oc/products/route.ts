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

export async function GET(req: Request) {
  const g = await guard(); if (g) return g;
  // ?catalog=1 — 제품명 자동완성용(어드민 보드 제품명: 리메이크 브랜드 제품 + 아웃리치 제품)
  if (new URL(req.url).searchParams.get("catalog")) {
    const oc = await sql`SELECT DISTINCT name FROM oc_products WHERE name IS NOT NULL`;
    let rm: { rows: { name: string; brand: string | null }[] } = { rows: [] };
    try { rm = await sql`SELECT name, brand FROM remake_products ORDER BY updated_at DESC LIMIT 500`; } catch { /* 테이블 없을 수 있음 */ }
    const names = new Set<string>();
    for (const r of oc.rows) if (r.name) names.add(String(r.name));
    for (const r of rm.rows) if (r.name) names.add(r.brand ? `${r.name} (${r.brand})` : String(r.name));
    return NextResponse.json({ names: [...names].sort() });
  }
  const { rows } = await sql`SELECT id, name, brand, category, country, concept, usp, notes, created_at
    FROM oc_products ORDER BY created_at DESC LIMIT 500`;
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "제품명 필수" }, { status: 400 });
  // category/country 는 콤마 결합 문자열(복수 선택)
  const { rows } = await sql`INSERT INTO oc_products (name, brand, category, country, concept, usp, notes, created_by)
    VALUES (${name}, ${b.brand || null}, ${b.category || null}, ${b.country || null}, ${b.concept || null}, ${b.usp || null}, ${b.notes || null}, 'admin')
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

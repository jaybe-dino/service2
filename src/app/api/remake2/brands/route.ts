import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return null;
}

// GET — 브랜드 목록, 또는 ?id= 단건(자산 포함)
export async function GET(req: Request) {
  const g = await guard(); if (g) return g;
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const b = await sql`SELECT * FROM remake_brands WHERE id = ${id}`;
    if (!b.rows[0]) return NextResponse.json({ error: "없음" }, { status: 404 });
    const assets = await sql`SELECT id, asset_id, kind, label, sort, created_at
      FROM remake_brand_assets WHERE brand_id = ${id} ORDER BY sort ASC, id ASC`;
    return NextResponse.json({ brand: b.rows[0], assets: assets.rows });
  }
  const { rows } = await sql`
    SELECT b.*, COUNT(DISTINCT a.id)::int AS asset_count, COUNT(DISTINCT p.id)::int AS product_count,
      (SELECT asset_id FROM remake_brand_assets WHERE brand_id = b.id AND kind='logo' ORDER BY sort ASC, id ASC LIMIT 1) AS logo_asset
    FROM remake_brands b
    LEFT JOIN remake_brand_assets a ON a.brand_id = b.id
    LEFT JOIN remake_products p ON p.brand_id = b.id
    GROUP BY b.id ORDER BY b.updated_at DESC LIMIT 300`;
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "브랜드명 필수" }, { status: 400 });
  if (b.id) {
    await sql`UPDATE remake_brands SET name=${name}, notes=${b.notes || null}, updated_at=now() WHERE id=${b.id}`;
    return NextResponse.json({ ok: true, id: b.id });
  }
  const id = crypto.randomUUID();
  await sql`INSERT INTO remake_brands (id, name, notes, created_by) VALUES (${id}, ${name}, ${b.notes || null}, 'admin')`;
  return NextResponse.json({ ok: true, id });
}

export async function DELETE(req: Request) {
  const g = await guard(); if (g) return g;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  // 제품이 남아있으면 차단(안전) — 먼저 제품을 옮기거나 삭제
  const p = await sql`SELECT COUNT(*)::int AS n FROM remake_products WHERE brand_id = ${id}`;
  if ((p.rows[0]?.n || 0) > 0) return NextResponse.json({ error: "이 브랜드의 제품을 먼저 삭제/이동하세요" }, { status: 400 });
  await sql`DELETE FROM remake_brand_assets WHERE brand_id = ${id}`;
  await sql`DELETE FROM remake_brands WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

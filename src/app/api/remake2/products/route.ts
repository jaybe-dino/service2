import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Remake v2 — 브랜드 제품 프로필(자산 포함). 관리자/브랜드 사전등록용.
async function guard() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return null;
}

// GET — 제품 목록(+ 자산 요약). ?id= 로 단건(자산 전체 포함)
export async function GET(req: Request) {
  const g = await guard(); if (g) return g;
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const p = await sql`SELECT * FROM remake_products WHERE id = ${id}`;
    if (!p.rows[0]) return NextResponse.json({ error: "없음" }, { status: 404 });
    const assets = await sql`SELECT id, asset_id, kind, label, is_primary, created_at
      FROM remake_product_assets WHERE product_id = ${id} ORDER BY is_primary DESC, id ASC`;
    return NextResponse.json({ product: p.rows[0], assets: assets.rows });
  }
  const { rows } = await sql`
    SELECT p.*, COUNT(a.id)::int AS asset_count,
      (SELECT asset_id FROM remake_product_assets WHERE product_id = p.id ORDER BY is_primary DESC, id ASC LIMIT 1) AS cover_asset
    FROM remake_products p LEFT JOIN remake_product_assets a ON a.product_id = p.id
    GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 300`;
  return NextResponse.json({ rows });
}

// POST — 생성/수정. {id?, brand, name, category, concept, usp}
export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const name = String(b.name || "").trim();
  if (!name) return NextResponse.json({ error: "제품명 필수" }, { status: 400 });
  if (b.id) {
    await sql`UPDATE remake_products SET brand=${b.brand || null}, name=${name}, category=${b.category || null},
      concept=${b.concept || null}, usp=${b.usp || null}, updated_at=now() WHERE id=${b.id}`;
    return NextResponse.json({ ok: true, id: b.id });
  }
  const id = crypto.randomUUID();
  await sql`INSERT INTO remake_products (id, brand, name, category, concept, usp, created_by)
    VALUES (${id}, ${b.brand || null}, ${name}, ${b.category || null}, ${b.concept || null}, ${b.usp || null}, 'admin')`;
  return NextResponse.json({ ok: true, id });
}

// DELETE ?id= — 제품 + 연결 자산 링크 삭제(blob은 remake_assets에 잔존)
export async function DELETE(req: Request) {
  const g = await guard(); if (g) return g;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await sql`DELETE FROM remake_product_assets WHERE product_id = ${id}`;
  await sql`DELETE FROM remake_products WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

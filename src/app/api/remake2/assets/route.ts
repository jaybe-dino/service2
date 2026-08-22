import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Remake v2 — 제품 자산(패키지/제형/로고/제품컷) 업로드. 이미지 blob은 remake_assets 재사용.
async function guard() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return null;
}
const KINDS = ["package", "texture", "logo", "shot"];

// POST — 자산 업로드. {productId, kind, label?, image(dataURL), primary?}
export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as { productId?: string; kind?: string; label?: string; image?: string; primary?: boolean };
  const productId = String(b.productId || "");
  if (!productId) return NextResponse.json({ error: "productId 필요" }, { status: 400 });
  const kind = KINDS.includes(String(b.kind)) ? String(b.kind) : "shot";
  const m = String(b.image || "").match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) return NextResponse.json({ error: "image(dataURL) 형식 오류" }, { status: 400 });
  const mime = m[1]; const data = m[2];
  if (data.length > 8_000_000) return NextResponse.json({ error: "이미지 용량 초과(약 6MB)" }, { status: 400 });

  const pchk = await sql`SELECT 1 FROM remake_products WHERE id = ${productId}`;
  if (!pchk.rows[0]) return NextResponse.json({ error: "제품 없음" }, { status: 404 });

  const assetId = crypto.randomUUID();
  await sql`INSERT INTO remake_assets (id, mime, data) VALUES (${assetId}, ${mime}, ${data})`;
  const isPrimary = b.primary === true;
  if (isPrimary) await sql`UPDATE remake_product_assets SET is_primary = false WHERE product_id = ${productId}`;
  // 첫 자산은 자동 대표
  const cnt = await sql`SELECT COUNT(*)::int AS n FROM remake_product_assets WHERE product_id = ${productId}`;
  const primary = isPrimary || (cnt.rows[0]?.n || 0) === 0;
  await sql`INSERT INTO remake_product_assets (product_id, asset_id, kind, label, is_primary)
    VALUES (${productId}, ${assetId}, ${kind}, ${b.label || null}, ${primary})`;
  return NextResponse.json({ ok: true, assetId, url: `/api/remake/asset/${assetId}`, primary });
}

// DELETE ?id= (remake_product_assets.id) — 자산 링크 삭제
export async function DELETE(req: Request) {
  const g = await guard(); if (g) return g;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const row = await sql`SELECT asset_id FROM remake_product_assets WHERE id = ${id}`;
  await sql`DELETE FROM remake_product_assets WHERE id = ${id}`;
  if (row.rows[0]?.asset_id) await sql`DELETE FROM remake_assets WHERE id = ${row.rows[0].asset_id}`;
  return NextResponse.json({ ok: true });
}

// PATCH — 대표 지정. {id}
export async function PATCH(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as { id?: number };
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const row = await sql`SELECT product_id FROM remake_product_assets WHERE id = ${id}`;
  if (!row.rows[0]) return NextResponse.json({ error: "없음" }, { status: 404 });
  await sql`UPDATE remake_product_assets SET is_primary = false WHERE product_id = ${row.rows[0].product_id}`;
  await sql`UPDATE remake_product_assets SET is_primary = true WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

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
const KINDS = ["logo", "guide", "common", "other"];

// POST — 브랜드 자산 업로드 {brandId, kind, label?, image(dataURL)}
export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as { brandId?: string; kind?: string; label?: string; image?: string };
  const brandId = String(b.brandId || "");
  if (!brandId) return NextResponse.json({ error: "brandId 필요" }, { status: 400 });
  const kind = KINDS.includes(String(b.kind)) ? String(b.kind) : "common";
  const m = String(b.image || "").match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!m) return NextResponse.json({ error: "image(dataURL) 형식 오류" }, { status: 400 });
  if (m[2].length > 8_000_000) return NextResponse.json({ error: "이미지 용량 초과" }, { status: 400 });
  const chk = await sql`SELECT 1 FROM remake_brands WHERE id = ${brandId}`;
  if (!chk.rows[0]) return NextResponse.json({ error: "브랜드 없음" }, { status: 404 });

  const assetId = crypto.randomUUID();
  await sql`INSERT INTO remake_assets (id, mime, data) VALUES (${assetId}, ${m[1]}, ${m[2]})`;
  const nx = await sql`SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM remake_brand_assets WHERE brand_id = ${brandId}`;
  await sql`INSERT INTO remake_brand_assets (brand_id, asset_id, kind, label, sort)
    VALUES (${brandId}, ${assetId}, ${kind}, ${b.label || null}, ${nx.rows[0]?.s || 0})`;
  return NextResponse.json({ ok: true, assetId, url: `/api/remake/asset/${assetId}` });
}

// PATCH — 라벨/종류 수정 {id, label?, kind?}
export async function PATCH(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as { id?: number; label?: string; kind?: string };
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  if (typeof b.label === "string") await sql`UPDATE remake_brand_assets SET label = ${b.label || null} WHERE id = ${id}`;
  if (b.kind && KINDS.includes(b.kind)) await sql`UPDATE remake_brand_assets SET kind = ${b.kind} WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const g = await guard(); if (g) return g;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const row = await sql`SELECT asset_id FROM remake_brand_assets WHERE id = ${id}`;
  await sql`DELETE FROM remake_brand_assets WHERE id = ${id}`;
  if (row.rows[0]?.asset_id) await sql`DELETE FROM remake_assets WHERE id = ${row.rows[0].asset_id}`;
  return NextResponse.json({ ok: true });
}

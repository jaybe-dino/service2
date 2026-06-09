import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isConfigured()) return NextResponse.json({ brands: [], influencers: [] });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ brands: [], influencers: [] });
  await ensureSchema();
  const { rows } = await sql<{ type: string; item_id: string }>`
    SELECT type, item_id FROM bookmarks WHERE user_id=${me.id}`;
  return NextResponse.json({
    brands: rows.filter((r) => r.type === "brand").map((r) => r.item_id),
    influencers: rows.filter((r) => r.type === "influencer").map((r) => r.item_id),
  });
}

export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const type = body?.type === "influencer" ? "influencer" : "brand";
  const itemId = String(body?.id ?? "").trim();
  if (!itemId) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await ensureSchema();
  const existing = await sql`
    SELECT 1 FROM bookmarks WHERE user_id=${me.id} AND type=${type} AND item_id=${itemId} LIMIT 1`;
  let active: boolean;
  if (existing.rows.length) {
    await sql`DELETE FROM bookmarks WHERE user_id=${me.id} AND type=${type} AND item_id=${itemId}`;
    active = false;
  } else {
    await sql`INSERT INTO bookmarks (user_id, type, item_id) VALUES (${me.id}, ${type}, ${itemId})`;
    active = true;
  }
  return NextResponse.json({ active });
}

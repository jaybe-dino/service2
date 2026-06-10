import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { BRANDS } from "@/data/ktrend/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ rows: [] });
  await ensureSchema();
  const r = await sql`SELECT brand_name, tracked, interval_hours, hashtags, last_collected_at FROM brand_tracking ORDER BY tracked DESC, last_collected_at ASC NULLS FIRST LIMIT 300`;
  return NextResponse.json({ rows: r.rows });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));

  // 기존 브랜드 전체를 추적 대상으로 시드
  if (body?.action === "seed") {
    for (const b of BRANDS) {
      await sql`INSERT INTO brand_tracking (brand_name, tracked, interval_hours) VALUES (${b.name}, true, 24)
                ON CONFLICT (brand_name) DO NOTHING`;
    }
    return NextResponse.json({ ok: true, seeded: BRANDS.length });
  }

  const brand = String(body?.brand_name ?? "").trim();
  if (!brand) return NextResponse.json({ error: "brand_name 필요" }, { status: 400 });
  const tracked = body?.tracked !== undefined ? Boolean(body.tracked) : true;
  const interval = Math.max(1, Math.min(720, Number(body?.interval_hours ?? 24)));
  await sql`INSERT INTO brand_tracking (brand_name, tracked, interval_hours, updated_at)
            VALUES (${brand}, ${tracked}, ${interval}, now())
            ON CONFLICT (brand_name) DO UPDATE SET tracked=EXCLUDED.tracked, interval_hours=EXCLUDED.interval_hours, updated_at=now()`;
  return NextResponse.json({ ok: true });
}

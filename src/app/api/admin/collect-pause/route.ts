import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isCollectPaused } from "@/lib/collect-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 수집 일시정지 스위치 — 비용 급증 시 즉시 모든 자동 수집(영상·샵 크론) 차단. 재배포 불필요.
export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return NextResponse.json({ ok: true, paused: await isCollectPaused() });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as { paused?: boolean };
  const paused = !!b.paused;
  await sql`INSERT INTO admin_settings (key, value, updated_at) VALUES ('collect_paused', ${JSON.stringify({ paused })}::jsonb, now())
            ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`;
  return NextResponse.json({ ok: true, paused });
}

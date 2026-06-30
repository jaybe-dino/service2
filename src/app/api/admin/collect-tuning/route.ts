import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getCollectTuning, DEFAULT_TUNING } from "@/lib/collect-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clamp = (n: unknown, def: number, max: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v > 0 ? Math.min(v, max) : def;
};

// 현재 수집 강도 조회
export async function GET() {
  if (!isConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  await ensureSchema();
  return NextResponse.json({ ok: true, tuning: await getCollectTuning(), defaults: DEFAULT_TUNING });
}

// 수집 강도 저장 (즉시 적용 — 재배포 불필요)
export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const tuning = {
    initialLimit: clamp(b?.initialLimit, DEFAULT_TUNING.initialLimit, 1000),
    refreshLimit: clamp(b?.refreshLimit, DEFAULT_TUNING.refreshLimit, 500),
    maxPending: clamp(b?.maxPending, DEFAULT_TUNING.maxPending, 100),
    maxRefresh: clamp(b?.maxRefresh, DEFAULT_TUNING.maxRefresh, 100),
    maxPoll: clamp(b?.maxPoll, DEFAULT_TUNING.maxPoll, 12),
  };
  await ensureSchema();
  await sql`INSERT INTO admin_settings (key, value, updated_at)
            VALUES ('collect_tuning', ${JSON.stringify(tuning)}::jsonb, now())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  return NextResponse.json({ ok: true, tuning });
}

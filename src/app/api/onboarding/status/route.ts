import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 현재 로그인 사용자의 온보딩 신청 상태 (결제 후 PHASE 4 재개·프리필용)
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, configured: false });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: true, application: null });
  await ensureSchema();
  const { rows } = await sql`
    SELECT track, grade, recommended_track, countries, term, amount, phase, status, dino_linked, payload
    FROM onboarding_applications WHERE user_id=${me.id} LIMIT 1`;
  return NextResponse.json({ ok: true, application: rows[0] ?? null });
}

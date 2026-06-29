import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 현재 로그인 사용자의 온보딩 신청 상태 + 몰 구독 + 결제내역
// (결제 후 PHASE 4 재개·프리필, 마이페이지 입점 관리에 사용)
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, configured: false });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: true, application: null, mallSub: null, orders: [] });
  await ensureSchema();
  const appRows = await sql`
    SELECT track, grade, recommended_track, countries, term, amount, phase, status, dino_linked, payload
    FROM onboarding_applications WHERE user_id=${me.id} LIMIT 1`;
  const subRows = await sql`
    SELECT track, amount, status, next_charge_at FROM mall_subscriptions WHERE user_id=${me.id} LIMIT 1`;
  const orderRows = await sql`
    SELECT order_id, plan, amount, charge_amount, status, kind,
           extract(epoch from created_at)*1000 AS created_ms
    FROM orders WHERE user_id=${me.id} AND kind='mall' AND status='paid'
    ORDER BY created_at DESC LIMIT 50`;
  return NextResponse.json({
    ok: true,
    application: appRows.rows[0] ?? null,
    mallSub: subRows.rows[0] ?? null,
    orders: orderRows.rows,
  });
}

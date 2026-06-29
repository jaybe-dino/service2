import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { expireBillingKey } from "@/lib/nicepay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 몰 입점 정기결제 해지 — 빌링키 만료 + 구독 canceled. 현재 결제 주기 종료까지는 유지.
export async function POST() {
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  await ensureSchema();
  const r = await sql<{ bid: string | null; status: string }>`SELECT bid, status FROM mall_subscriptions WHERE user_id=${me.id} LIMIT 1`;
  const sub = r.rows[0];
  if (!sub || sub.status === "canceled") return NextResponse.json({ ok: true, alreadyCanceled: true });
  if (sub.bid) await expireBillingKey(sub.bid);
  await sql`UPDATE mall_subscriptions SET status='canceled', updated_at=now() WHERE user_id=${me.id}`;
  return NextResponse.json({ ok: true });
}

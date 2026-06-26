import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { chargeByBillingKey, buildOrderId, SERVICE_ORDER_PREFIX, BILLING_FAILURE_THRESHOLD } from "@/lib/nicepay";
import { PAY_PLANS } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// 정기결제 청구: next_charge_at 도래한 구독을 빌링키로 자동 청구.
// 성공 → pro_until +30일, 다음 청구일 +30일. 실패 → failures++, 임계 초과 시 past_due.
async function handle(req: Request) {
  if (!authorized(req)) return new Response("forbidden", { status: 403 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const now = Date.now();
  const periodMs = (PAY_PLANS.pro.periodDays ?? 30) * 86_400_000;
  const due = await sql<{ user_id: string; bid: string; amount: number; failures: number }>`
    SELECT user_id, bid, amount, failures FROM subscriptions
    WHERE bid IS NOT NULL AND status IN ('trial','active') AND next_charge_at <= ${now}
    ORDER BY next_charge_at ASC LIMIT 20`;

  let charged = 0;
  let failed = 0;
  for (const s of due.rows) {
    const orderId = buildOrderId(SERVICE_ORDER_PREFIX, "Pro");
    await sql`INSERT INTO orders (order_id, user_id, plan, amount, goods_name, status, kind)
              VALUES (${orderId}, ${s.user_id}, 'pro', ${s.amount}, ${PAY_PLANS.pro.goodsName}, 'created', 'subscribe')`;
    const r = await chargeByBillingKey({ bid: s.bid, orderId, amount: s.amount, goodsName: PAY_PLANS.pro.goodsName });
    if (r.ok && r.tid) {
      await sql`INSERT INTO payments (payment_id, order_id, amount, raw) VALUES (${r.tid}, ${orderId}, ${s.amount}, ${JSON.stringify(r.raw)}::jsonb) ON CONFLICT (payment_id) DO NOTHING`;
      await sql`UPDATE orders SET status='paid' WHERE order_id=${orderId}`;
      await sql`UPDATE users SET pro_until = GREATEST(pro_until, ${now}) + ${periodMs} WHERE id=${s.user_id}`;
      await sql`UPDATE subscriptions SET status='active', failures=0, next_charge_at = ${now + periodMs}, updated_at=now() WHERE user_id=${s.user_id}`;
      charged += 1;
    } else {
      await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
      const f = (s.failures ?? 0) + 1;
      const status = f >= BILLING_FAILURE_THRESHOLD ? "past_due" : "active";
      // 재시도 위해 다음날 다시 시도
      await sql`UPDATE subscriptions SET failures=${f}, status=${status}, next_charge_at=${now + 86_400_000}, updated_at=now() WHERE user_id=${s.user_id}`;
      failed += 1;
    }
  }
  // ── 몰 입점 트랙 정기결제 (Pro와 분리, pro_until 미반영) ──
  const mallDue = await sql<{ user_id: string; track: string; bid: string; amount: number; failures: number }>`
    SELECT user_id, track, bid, amount, failures FROM mall_subscriptions
    WHERE bid IS NOT NULL AND status IN ('active') AND next_charge_at <= ${now}
    ORDER BY next_charge_at ASC LIMIT 20`;
  let mallCharged = 0;
  let mallFailed = 0;
  for (const s of mallDue.rows) {
    const plan = PAY_PLANS[s.track] ?? PAY_PLANS.ready;
    const period = (plan.periodDays ?? 30) * 86_400_000;
    const orderId = buildOrderId(SERVICE_ORDER_PREFIX, plan.planInitial);
    await sql`INSERT INTO orders (order_id, user_id, plan, amount, goods_name, status, kind)
              VALUES (${orderId}, ${s.user_id}, ${s.track}, ${s.amount}, ${plan.goodsName}, 'created', 'mall')`;
    const r = await chargeByBillingKey({ bid: s.bid, orderId, amount: s.amount, goodsName: plan.goodsName });
    if (r.ok && r.tid) {
      await sql`INSERT INTO payments (payment_id, order_id, amount, raw) VALUES (${r.tid}, ${orderId}, ${s.amount}, ${JSON.stringify(r.raw)}::jsonb) ON CONFLICT (payment_id) DO NOTHING`;
      await sql`UPDATE orders SET status='paid' WHERE order_id=${orderId}`;
      await sql`UPDATE mall_subscriptions SET status='active', failures=0, next_charge_at=${now + period}, updated_at=now() WHERE user_id=${s.user_id}`;
      mallCharged += 1;
    } else {
      await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
      const f = (s.failures ?? 0) + 1;
      const status = f >= BILLING_FAILURE_THRESHOLD ? "past_due" : "active";
      await sql`UPDATE mall_subscriptions SET failures=${f}, status=${status}, next_charge_at=${now + 86_400_000}, updated_at=now() WHERE user_id=${s.user_id}`;
      mallFailed += 1;
    }
  }

  return NextResponse.json({ ok: true, due: due.rows.length, charged, failed, mallDue: mallDue.rows.length, mallCharged, mallFailed });
}

export async function GET(req: Request) { return handle(req); }
export async function POST(req: Request) { return handle(req); }

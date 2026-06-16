import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { approvePayment, registerBillingKey, chargeByBillingKey, buildOrderId, SERVICE_ORDER_PREFIX } from "@/lib/nicepay";
import { PAY_PLANS } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NICEpay 결제창 완료 후 returnUrl로 POST(form) 리다이렉트되는 콜백.
export async function POST(req: Request) {
  const base = `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("x-forwarded-host") ?? req.headers.get("host")}`;
  const go = (status: string) => NextResponse.redirect(`${base}/checkout/result?status=${status}`, 303);

  if (!dbConfigured()) return go("error");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return go("error");
  }
  const tid = String(form.get("tid") ?? "");
  const orderId = String(form.get("orderId") ?? "");
  const amount = Number(form.get("amount") ?? 0);
  const bidForm = String(form.get("bid") ?? "");
  const authResultCode = String(form.get("authResultCode") ?? form.get("resultCode") ?? "");

  await ensureSchema();
  const { rows } = await sql`SELECT user_id, amount, status, kind FROM orders WHERE order_id=${orderId} LIMIT 1`;
  const order = rows[0] as { user_id: string; amount: number; status: string; kind: string } | undefined;

  if (!order || (authResultCode && authResultCode !== "0000")) {
    if (order) await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
    return go("fail");
  }
  if (order.status === "paid") return go("success");

  // ── 정기결제(구독): 빌링키 등록 → 무료체험 없이 즉시 첫 결제 → 매월 자동청구 ──
  if (order.kind === "subscribe") {
    const bid = bidForm || (await registerBillingKey({ tid })).bid;
    if (!bid) {
      await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
      return go("fail");
    }
    const amt = PAY_PLANS.pro.amount;
    const periodMs = (PAY_PLANS.pro.periodDays ?? 30) * 86_400_000;
    // 즉시 첫 결제 (무료체험 제거)
    const chargeOrderId = buildOrderId(SERVICE_ORDER_PREFIX, "Pro");
    await sql`INSERT INTO orders (order_id, user_id, plan, amount, goods_name, status, kind)
              VALUES (${chargeOrderId}, ${order.user_id}, 'pro', ${amt}, ${PAY_PLANS.pro.goodsName}, 'created', 'subscribe')`;
    const charge = await chargeByBillingKey({ bid, orderId: chargeOrderId, amount: amt, goodsName: PAY_PLANS.pro.goodsName });
    if (!charge.ok) {
      await sql`UPDATE orders SET status='failed' WHERE order_id=${chargeOrderId}`;
      await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
      return go("fail");
    }
    if (charge.tid) {
      await sql`INSERT INTO payments (payment_id, order_id, amount, raw) VALUES (${charge.tid}, ${chargeOrderId}, ${amt}, ${JSON.stringify(charge.raw)}::jsonb) ON CONFLICT (payment_id) DO NOTHING`;
    }
    await sql`UPDATE orders SET status='paid' WHERE order_id=${chargeOrderId}`;
    const nextAt = Date.now() + periodMs;
    await sql`INSERT INTO subscriptions (user_id, bid, plan, amount, status, next_charge_at, updated_at)
              VALUES (${order.user_id}, ${bid}, 'pro', ${amt}, 'active', ${nextAt}, now())
              ON CONFLICT (user_id) DO UPDATE SET bid=EXCLUDED.bid, amount=EXCLUDED.amount, status='active', next_charge_at=EXCLUDED.next_charge_at, failures=0, updated_at=now()`;
    await sql`UPDATE users SET pro_until = GREATEST(pro_until, ${Date.now()}) + ${periodMs} WHERE id=${order.user_id}`;
    await sql`UPDATE orders SET status='paid' WHERE order_id=${orderId}`;
    return go("success");
  }

  // ── 단건 결제 ──
  if (Number(order.amount) !== amount) {
    await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
    return go("fail");
  }

  const result = await approvePayment({ tid, amount });
  if (!result.ok) {
    await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
    return go("fail");
  }

  // 멱등 결제 원장 (payment_id UNIQUE) + 7년 보관용 raw
  await sql`INSERT INTO payments (payment_id, order_id, amount, raw)
            VALUES (${tid}, ${orderId}, ${amount}, ${JSON.stringify(result.raw)}::jsonb)
            ON CONFLICT (payment_id) DO NOTHING`;
  await sql`UPDATE orders SET status='paid' WHERE order_id=${orderId}`;

  // 유저 엔타이틀먼트: pro_until 을 (현재값과 now 중 큰 값) + 기간 만큼 연장
  const periodMs = (PAY_PLANS.pro.periodDays ?? 30) * 86_400_000;
  await sql`UPDATE users SET pro_until = GREATEST(pro_until, ${Date.now()}) + ${periodMs} WHERE id=${order.user_id}`;

  return go("success");
}

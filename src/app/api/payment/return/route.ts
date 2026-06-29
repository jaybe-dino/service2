import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { approvePayment, registerBillingKey } from "@/lib/nicepay";
import { PAY_PLANS } from "@/lib/payments";
import type { MallTrackId } from "@/data/ktrend/meta";

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
  const { rows } = await sql`SELECT user_id, amount, charge_amount, period_days, status, kind, plan FROM orders WHERE order_id=${orderId} LIMIT 1`;
  const order = rows[0] as { user_id: string; amount: number; charge_amount: number | null; period_days: number | null; status: string; kind: string; plan: string } | undefined;

  if (!order || (authResultCode && authResultCode !== "0000")) {
    if (order) await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
    return go("fail");
  }
  if (order.status === "paid") return go("success");

  // ── 정기결제(구독): 결제창에서 첫 달 실결제 승인 → 그 거래로 빌링키 발급 → 다음 달부터 자동청구 ──
  if (order.kind === "subscribe") {
    // 테스트 토큰 적용분 등 실제 청구액은 order.charge_amount 기준
    const amt = Number(order.charge_amount) || PAY_PLANS.pro.amount;
    const periodMs = (Number(order.period_days) || PAY_PLANS.pro.periodDays || 30) * 86_400_000;
    if (Number(amount) !== amt) {
      await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
      return go("fail");
    }
    // 1) 첫 달 결제 승인(캡처)
    const ap = await approvePayment({ tid, amount: amt });
    if (!ap.ok) {
      await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
      return go("fail");
    }
    await sql`INSERT INTO payments (payment_id, order_id, amount, raw)
              VALUES (${tid}, ${orderId}, ${amt}, ${JSON.stringify(ap.raw)}::jsonb) ON CONFLICT (payment_id) DO NOTHING`;
    await sql`UPDATE orders SET status='paid' WHERE order_id=${orderId}`;
    // 2) 빌링키 발급(다음 달부터 자동청구용) — 실패해도 첫 달 이용은 보장
    const bid = bidForm || ap.bid || (await registerBillingKey({ tid })).bid || null;
    const nextAt = Date.now() + periodMs;
    await sql`INSERT INTO subscriptions (user_id, bid, plan, amount, status, next_charge_at, updated_at)
              VALUES (${order.user_id}, ${bid}, 'pro', ${amt}, 'active', ${nextAt}, now())
              ON CONFLICT (user_id) DO UPDATE SET bid=EXCLUDED.bid, amount=EXCLUDED.amount, status='active', next_charge_at=EXCLUDED.next_charge_at, failures=0, updated_at=now()`;
    await sql`UPDATE users SET pro_until = GREATEST(pro_until, ${Date.now()}) + ${periodMs} WHERE id=${order.user_id}`;
    return go("success");
  }

  // ── 몰 입점 트랙(ready/live/onboarding) — 빌링키 등록 → 첫 달 즉시 결제 → 매월 자동청구.
  //     Pro 권한은 부여하지 않음. Onboarding 트랙은 결제 후 apply.tpartners 로 이동. ──
  if (order.kind === "mall") {
    const track = (order.plan as MallTrackId) || "ready";
    const fail = () => NextResponse.redirect(`${base}/onboarding?payfail=1`, 303);
    const plan = PAY_PLANS[track] ?? PAY_PLANS.ready;
    // 다국가/약정 반영 결제액 (start에서 산출해 둔 charge_amount). 6개월 약정은 합계+180일 주기.
    const amt = Number(order.charge_amount) || plan.amount;
    const periodMs = (Number(order.period_days) || plan.periodDays || 30) * 86_400_000;
    if (Number(amount) !== amt) { await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`; return fail(); }
    // 1) 첫 달 결제 승인(캡처)
    const ap = await approvePayment({ tid, amount: amt });
    if (!ap.ok) { await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`; return fail(); }
    await sql`INSERT INTO payments (payment_id, order_id, amount, raw)
              VALUES (${tid}, ${orderId}, ${amt}, ${JSON.stringify(ap.raw)}::jsonb) ON CONFLICT (payment_id) DO NOTHING`;
    await sql`UPDATE orders SET status='paid' WHERE order_id=${orderId}`;
    // 2) 빌링키 발급(다음 달부터 자동청구용) — 실패해도 첫 달 입점은 보장
    const bid = bidForm || ap.bid || (await registerBillingKey({ tid })).bid || null;
    const nextAt = Date.now() + periodMs;
    await sql`INSERT INTO mall_subscriptions (user_id, track, bid, amount, status, next_charge_at, updated_at)
              VALUES (${order.user_id}, ${track}, ${bid}, ${amt}, 'active', ${nextAt}, now())
              ON CONFLICT (user_id) DO UPDATE SET track=EXCLUDED.track, bid=EXCLUDED.bid, amount=EXCLUDED.amount, status='active', next_charge_at=EXCLUDED.next_charge_at, failures=0, updated_at=now()`;
    // 결제 완료 → 신청 paid, 디노 물류 연동 플래그 ON. PHASE 4(정보입력)는 사이트에서 이어서.
    await sql`UPDATE onboarding_applications SET status='paid', track=${track}, phase='details', dino_linked=true, order_id=${orderId}, updated_at=now() WHERE user_id=${order.user_id}`;
    return NextResponse.redirect(`${base}/onboarding?paid=1`, 303);
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

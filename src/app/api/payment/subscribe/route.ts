import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  isConfigured as payConfigured, encryptCardData, registerBillingKey, chargeByBillingKey,
  buildOrderId, SERVICE_ORDER_PREFIX, type CardInput,
} from "@/lib/nicepay";
import { PAY_PLANS } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 정기결제 등록 — 카드정보 → encData 빌키발급 → 첫 달 즉시 결제 → 구독 저장.
// 이후 매 주기(기본 30일) cron(/api/cron/subscribe)이 빌링키로 자동청구.
// ⚠️ 카드정보는 encData 생성에만 쓰고 저장/로깅하지 않는다.
export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!payConfigured()) return NextResponse.json({ ok: false, configured: false, error: "결제 모듈(NICEpay 키) 미설정" });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { plan?: string; card?: Partial<CardInput>; test?: string };
  const planKey = String(body.plan ?? "pro");
  const plan = PAY_PLANS[planKey];
  if (!plan) return NextResponse.json({ ok: false, error: "결제 불가 플랜" }, { status: 400 });

  const c = body.card || {};
  const cardNo = String(c.cardNo ?? "").replace(/\D/g, "");
  const expYear = String(c.expYear ?? "").trim();
  const expMonth = String(c.expMonth ?? "").trim();
  const idNo = String(c.idNo ?? "").replace(/\D/g, "");
  const cardPw = String(c.cardPw ?? "").trim();
  if (cardNo.length < 15 || expYear.length !== 2 || expMonth.length !== 2 || (idNo.length !== 6 && idNo.length !== 10) || cardPw.length !== 2) {
    return NextResponse.json({ ok: false, error: "카드 정보를 확인해 주세요 (카드번호·유효기간 YY/MM·생년월일6 또는 사업자10·카드비밀번호 앞2자리)." }, { status: 400 });
  }

  // 청구 금액(테스트 토큰이면 1/10000, 최소 100원)
  let amount = plan.amount;
  const testMode = !!process.env.PAY_TEST_TOKEN && String(body.test ?? "") === process.env.PAY_TEST_TOKEN;
  if (testMode) amount = Math.max(100, Math.round(amount / 10000));
  const periodMs = (plan.periodDays ?? 30) * 86_400_000;

  await ensureSchema();

  // 1) 빌키 발급
  const encData = encryptCardData({ cardNo, expYear, expMonth, idNo, cardPw });
  const registOrderId = buildOrderId(SERVICE_ORDER_PREFIX, plan.planInitial);
  const reg = await registerBillingKey({ encData, orderId: registOrderId });
  if (!reg.ok || !reg.bid) {
    const r = reg.raw as { resultMsg?: string; resultCode?: string } | null;
    const msg = r?.resultMsg || "빌키 발급 실패";
    const code = r?.resultCode ? ` [${r.resultCode}]` : "";
    return NextResponse.json({ ok: false, error: `카드 등록 실패:${code} ${msg}` }, { status: 402 });
  }
  const bid = reg.bid;

  // 2) 첫 달 즉시 청구
  const chargeOrderId = buildOrderId(SERVICE_ORDER_PREFIX, plan.planInitial);
  await sql`INSERT INTO orders (order_id, user_id, plan, amount, goods_name, status, kind)
            VALUES (${chargeOrderId}, ${me.id}, ${planKey}, ${amount}, ${plan.goodsName}, 'created', 'subscribe')`;
  const pay = await chargeByBillingKey({ bid, orderId: chargeOrderId, amount, goodsName: plan.goodsName });
  if (!pay.ok || !pay.tid) {
    await sql`UPDATE orders SET status='failed' WHERE order_id=${chargeOrderId}`;
    const msg = (pay.raw as { resultMsg?: string })?.resultMsg || "첫 결제 승인 실패";
    return NextResponse.json({ ok: false, error: `첫 결제 실패: ${msg}` }, { status: 402 });
  }

  // 3) 결제·구독 원장 저장 + 엔타이틀먼트 — orders에 tid 먼저(원장 유실 대비).
  await sql`UPDATE orders SET status='paid', tid=${pay.tid} WHERE order_id=${chargeOrderId}`;
  await sql`INSERT INTO payments (payment_id, order_id, amount, raw)
            VALUES (${pay.tid}, ${chargeOrderId}, ${amount}, ${JSON.stringify(pay.raw)}::jsonb) ON CONFLICT (payment_id) DO NOTHING`;
  const now = Date.now();
  await sql`INSERT INTO subscriptions (user_id, bid, plan, amount, status, next_charge_at, period_days, updated_at)
            VALUES (${me.id}, ${bid}, ${planKey}, ${amount}, 'active', ${now + periodMs}, ${plan.periodDays ?? 30}, now())
            ON CONFLICT (user_id) DO UPDATE SET bid=EXCLUDED.bid, plan=EXCLUDED.plan, amount=EXCLUDED.amount,
              status='active', next_charge_at=EXCLUDED.next_charge_at, period_days=EXCLUDED.period_days, failures=0, updated_at=now()`;
  await sql`UPDATE users SET pro_until = GREATEST(pro_until, ${now}) + ${periodMs} WHERE id=${me.id}`;

  return NextResponse.json({ ok: true, plan: planKey, amount, nextChargeAt: now + periodMs });
}

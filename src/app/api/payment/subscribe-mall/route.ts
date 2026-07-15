import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  isConfigured as payConfigured, encryptCardData, registerBillingKey, chargeByBillingKey,
  buildOrderId, SERVICE_ORDER_PREFIX, type CardInput,
} from "@/lib/nicepay";
import { computeQuote, type SubTerm } from "@/lib/onboarding";
import { MALL_TRACK_MAP, type MallTrackId } from "@/data/ktrend/meta";
import { validatePromo, redeemPromo } from "@/lib/promo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 틱톡샵 온보딩(몰) 정기결제 — 카드 등록 → 빌키 → 첫 주기 결제(또는 프로모 첫 주기 무료) → 주기마다 자동청구.
// 6개월 약정이면 180일 주기. 프로모 코드 입력 시 첫 주기 결제 스킵(2번째 주기부터 청구).
export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!payConfigured()) return NextResponse.json({ ok: false, configured: false, error: "결제 모듈(NICEpay 키) 미설정" });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    track?: string; countries?: string[]; term?: SubTerm; card?: Partial<CardInput>; promoCode?: string; test?: string;
  };
  const track = String(body.track ?? "") as MallTrackId;
  const meta = MALL_TRACK_MAP[track];
  if (!meta) return NextResponse.json({ ok: false, error: "유효하지 않은 트랙" }, { status: 400 });
  if (meta.inquiry) return NextResponse.json({ ok: false, error: "해당 트랙은 가격 문의 후 진행됩니다." }, { status: 400 });

  const term: SubTerm = body.term === "6month" ? "6month" : "monthly";
  const countries: string[] = Array.isArray(body.countries) ? body.countries : [];
  const q = computeQuote(track, Math.max(1, countries.length), term);
  const periodDays = term === "6month" ? 180 : 30;

  const testMode = !!process.env.PAY_TEST_TOKEN && String(body.test ?? "") === process.env.PAY_TEST_TOKEN;
  const testReduce = (v: number) => (testMode ? Math.max(100, Math.round(v / 10000)) : Math.round(v));
  // 정기(향후) 청구액 = 전액. 첫 청구액은 프로모에 따라 달라짐.
  const recurringAmount = testReduce(q.payable);

  // 카드 검증
  const c = body.card || {};
  const cardNo = String(c.cardNo ?? "").replace(/\D/g, "");
  const expYear = String(c.expYear ?? "").trim();
  const expMonth = String(c.expMonth ?? "").trim();
  const idNo = String(c.idNo ?? "").replace(/\D/g, "");
  const cardPw = String(c.cardPw ?? "").trim();
  if (cardNo.length < 15 || expYear.length !== 2 || expMonth.length !== 2 || (idNo.length !== 6 && idNo.length !== 10) || cardPw.length !== 2) {
    return NextResponse.json({ ok: false, error: "카드 정보를 확인해 주세요." }, { status: 400 });
  }

  // 프로모 검증(선택)
  let promoOk = false;
  const promoCode = String(body.promoCode ?? "").trim().toUpperCase();
  if (promoCode) {
    const v = await validatePromo(promoCode, me.id);
    if (!v.ok) return NextResponse.json({ ok: false, error: `프로모 코드: ${v.reason}` }, { status: 400 });
    promoOk = true;
  }

  // 첫 청구액 결정:
  //  - 프로모 + 6개월 약정 → 첫 달 제외한 5개월치 청구(스킵 아님)
  //  - 프로모 + 월간 → 첫 달 무료(스킵)
  //  - 프로모 없음 → 전액
  let firstCharge = recurringAmount;
  let skipFirst = false;
  if (promoOk) {
    if (term === "6month") firstCharge = testReduce(q.monthly * 5);
    else { skipFirst = true; firstCharge = 0; }
  }

  await ensureSchema();

  // 1) 빌키 발급
  const encData = encryptCardData({ cardNo, expYear, expMonth, idNo, cardPw });
  const registOrderId = buildOrderId(SERVICE_ORDER_PREFIX, meta.name[0] || "M");
  const reg = await registerBillingKey({ encData, orderId: registOrderId });
  if (!reg.ok || !reg.bid) {
    const msg = (reg.raw as { resultMsg?: string })?.resultMsg || "빌키 발급 실패";
    return NextResponse.json({ ok: false, error: `카드 등록 실패: ${msg}` }, { status: 402 });
  }
  const bid = reg.bid;
  const goodsName = `Glovek ${meta.name} (${term === "6month" ? "6개월" : "월간"})`;
  const now = Date.now();
  const nextAt = now + periodDays * 86_400_000;

  // 2) 첫 청구 — 프로모 월간이면 스킵(무료), 그 외엔 firstCharge 청구.
  if (skipFirst) {
    await redeemPromo(promoCode, me.id); // 첫 달 무료
    await sql`INSERT INTO collection_runs (kind, target, status) VALUES ('promo_first_free', ${track}, ${promoCode})`;
  } else {
    const chargeOrderId = buildOrderId(SERVICE_ORDER_PREFIX, meta.name[0] || "M");
    await sql`INSERT INTO orders (order_id, user_id, plan, amount, goods_name, status, kind, period_days)
              VALUES (${chargeOrderId}, ${me.id}, ${track}, ${firstCharge}, ${goodsName}, 'created', 'mall', ${periodDays})`;
    const pay = await chargeByBillingKey({ bid, orderId: chargeOrderId, amount: firstCharge, goodsName });
    if (!pay.ok || !pay.tid) {
      await sql`UPDATE orders SET status='failed' WHERE order_id=${chargeOrderId}`;
      const msg = (pay.raw as { resultMsg?: string })?.resultMsg || "첫 결제 승인 실패";
      return NextResponse.json({ ok: false, error: `첫 결제 실패: ${msg}` }, { status: 402 });
    }
    await sql`INSERT INTO payments (payment_id, order_id, amount, raw)
              VALUES (${pay.tid}, ${chargeOrderId}, ${firstCharge}, ${JSON.stringify(pay.raw)}::jsonb) ON CONFLICT (payment_id) DO NOTHING`;
    await sql`UPDATE orders SET status='paid' WHERE order_id=${chargeOrderId}`;
    if (promoOk) { // 6개월 약정 첫달 제외 적용
      await redeemPromo(promoCode, me.id);
      await sql`INSERT INTO collection_runs (kind, target, status) VALUES ('promo_first_month_off', ${track}, ${promoCode})`;
    }
  }

  // 3) 구독 저장(정기 청구액=전액) + 신청서 반영
  await sql`INSERT INTO mall_subscriptions (user_id, track, bid, amount, status, next_charge_at, period_days, updated_at)
            VALUES (${me.id}, ${track}, ${bid}, ${recurringAmount}, 'active', ${nextAt}, ${periodDays}, now())
            ON CONFLICT (user_id) DO UPDATE SET track=EXCLUDED.track, bid=EXCLUDED.bid, amount=EXCLUDED.amount,
              status='active', next_charge_at=EXCLUDED.next_charge_at, period_days=EXCLUDED.period_days, failures=0, updated_at=now()`;
  await sql`UPDATE onboarding_applications SET status='paid', track=${track}, phase='details', dino_linked=true,
            term=${term}, amount=${recurringAmount}, updated_at=now() WHERE user_id=${me.id}`;

  return NextResponse.json({ ok: true, track, firstCharge, recurringAmount, firstFree: skipFirst, nextChargeAt: nextAt, periodDays });
}

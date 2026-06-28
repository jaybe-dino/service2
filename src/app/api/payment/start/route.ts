import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isConfigured as payConfigured, clientKey, buildOrderId, SERVICE_ORDER_PREFIX } from "@/lib/nicepay";
import { PAY_PLANS, isMallPlan } from "@/lib/payments";
import { computeQuote, type SubTerm } from "@/lib/onboarding";
import type { MallTrackId } from "@/data/ktrend/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const planKey = String(body?.plan ?? "pro");
  // 기본: 정기결제(구독) — 카드 등록 후 trialDays 무료, 이후 자동청구
  // 몰 입점 트랙(ready/live/onboarding)은 빌링키 기반 월 구독이며 kind='mall'로 기록.
  let mode = body?.mode === "once" ? "once" : "subscribe";
  if (isMallPlan(planKey)) mode = "mall";
  const price = PAY_PLANS[planKey];
  if (!price) return NextResponse.json({ ok: false, error: "결제 불가 플랜" }, { status: 400 });

  if (!payConfigured()) {
    return NextResponse.json({ ok: false, configured: false, error: "결제 모듈(NICEpay 키)이 아직 설정되지 않았습니다." });
  }

  // 몰 입점: 진출 국가 수 + 약정 방식으로 월 청구액 서버 권위 계산 (클라이언트 값 신뢰 X)
  let chargeAmount = price.amount;
  let term: SubTerm = "monthly";
  let countryCount = 1;
  if (mode === "mall") {
    term = body?.term === "6month" ? "6month" : "monthly";
    const countries: string[] = Array.isArray(body?.countries) ? body.countries : [];
    countryCount = Math.max(1, countries.length);
    chargeAmount = computeQuote(planKey as MallTrackId, countryCount, term).final;
  }

  await ensureSchema();
  const orderId = buildOrderId(SERVICE_ORDER_PREFIX, price.planInitial);
  // 구독/몰 입점 등록 인증은 금액 0(빌키 발급용), 단건은 정상 금액. 실제 청구액은 charge_amount.
  const authAmount = mode === "subscribe" || mode === "mall" ? 0 : price.amount;
  await sql`INSERT INTO orders (order_id, user_id, plan, amount, charge_amount, goods_name, status, kind)
            VALUES (${orderId}, ${me.id}, ${planKey}, ${authAmount}, ${chargeAmount}, ${price.goodsName}, 'created', ${mode})`;

  // 몰 입점 신청서에 약정/금액 동기화
  if (mode === "mall") {
    await sql`UPDATE onboarding_applications SET term=${term}, amount=${chargeAmount}, order_id=${orderId}, updated_at=now() WHERE user_id=${me.id}`;
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const returnUrl = `${proto}://${host}/api/payment/return`;

  return NextResponse.json({
    ok: true,
    configured: true,
    mode,
    clientKey: clientKey(),
    orderId,
    amount: authAmount,
    chargeAmount,
    goodsName: price.goodsName,
    returnUrl,
    trialDays: price.trialDays,
  });
}

import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isConfigured as payConfigured, clientKey, buildOrderId, SERVICE_ORDER_PREFIX } from "@/lib/nicepay";
import { PAY_PLANS } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const planKey = String(body?.plan ?? "pro");
  const price = PAY_PLANS[planKey];
  if (!price) return NextResponse.json({ ok: false, error: "결제 불가 플랜" }, { status: 400 });

  if (!payConfigured()) {
    return NextResponse.json({ ok: false, configured: false, error: "결제 모듈(NICEpay 키)이 아직 설정되지 않았습니다." });
  }

  await ensureSchema();
  const orderId = buildOrderId(SERVICE_ORDER_PREFIX, price.planInitial);
  await sql`INSERT INTO orders (order_id, user_id, plan, amount, goods_name, status)
            VALUES (${orderId}, ${me.id}, ${planKey}, ${price.amount}, ${price.goodsName}, 'created')`;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const returnUrl = `${proto}://${host}/api/payment/return`;

  return NextResponse.json({
    ok: true,
    configured: true,
    clientKey: clientKey(),
    orderId,
    amount: price.amount,
    goodsName: price.goodsName,
    returnUrl,
  });
}

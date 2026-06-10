import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { approvePayment } from "@/lib/nicepay";
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
  const authResultCode = String(form.get("authResultCode") ?? form.get("resultCode") ?? "");

  await ensureSchema();
  const { rows } = await sql`SELECT user_id, amount, status FROM orders WHERE order_id=${orderId} LIMIT 1`;
  const order = rows[0] as { user_id: string; amount: number; status: string } | undefined;

  // 위변조 방지: DB amount와 비교, 인증 성공 코드 확인
  if (!order || Number(order.amount) !== amount || (authResultCode && authResultCode !== "0000")) {
    if (order) await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
    return go("fail");
  }
  // 이미 처리된 주문이면 성공으로 간주(멱등)
  if (order.status === "paid") return go("success");

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

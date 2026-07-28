import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { chargeByBillingKey, buildOrderId, SERVICE_ORDER_PREFIX, BILLING_FAILURE_THRESHOLD } from "@/lib/nicepay";
import { PAY_PLANS } from "@/lib/payments";
import { sendIngest } from "@/lib/admin-ingest";

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

  // 동시 실행 차단(중복 청구 방지) — advisory lock. 못 잡으면 다른 실행이 도는 중 → 스킵.
  const lock = await sql<{ locked: boolean }>`SELECT pg_try_advisory_lock(918273645) AS locked`;
  if (!lock.rows[0]?.locked) return NextResponse.json({ ok: true, skipped: "another cron run in progress" });

  try {
    const now = Date.now();
    const due = await sql<{ user_id: string; bid: string; amount: number; failures: number; period_days: number; next_charge_at: number; email: string | null }>`
      SELECT s.user_id, s.bid, s.amount, s.failures, s.period_days, s.next_charge_at, u.email FROM subscriptions s
      LEFT JOIN users u ON u.id = s.user_id
      WHERE s.bid IS NOT NULL AND s.status IN ('trial','active') AND s.next_charge_at <= ${now}
      ORDER BY s.next_charge_at ASC LIMIT 20`;

    let charged = 0;
    let failed = 0;
    for (const s of due.rows) {
      const periodMs = (Number(s.period_days) || 30) * 86_400_000; // 구독별 주기(6개월 약정=180)
      // 선점: 청구 전에 next_charge_at을 먼저 전진(조건부) → 크래시/중복 시 재청구 방지.
      const claim = await sql`UPDATE subscriptions SET next_charge_at=${now + periodMs}, updated_at=now()
                              WHERE user_id=${s.user_id} AND next_charge_at=${s.next_charge_at}`;
      if (claim.rowCount === 0) continue; // 이미 다른 경로가 처리 → 스킵
      const orderId = buildOrderId(SERVICE_ORDER_PREFIX, "Pro");
      await sql`INSERT INTO orders (order_id, user_id, plan, amount, goods_name, status, kind, period_days)
                VALUES (${orderId}, ${s.user_id}, 'pro', ${s.amount}, ${PAY_PLANS.pro.goodsName}, 'created', 'subscribe', ${s.period_days})`;
      const r = await chargeByBillingKey({ bid: s.bid, orderId, amount: s.amount, goodsName: PAY_PLANS.pro.goodsName });
      if (r.ok && r.tid) {
        await sql`UPDATE orders SET status='paid', tid=${r.tid} WHERE order_id=${orderId}`; // tid 먼저(원장 유실 대비)
        await sql`INSERT INTO payments (payment_id, order_id, amount, raw) VALUES (${r.tid}, ${orderId}, ${s.amount}, ${JSON.stringify(r.raw)}::jsonb) ON CONFLICT (payment_id) DO NOTHING`;
        await sql`UPDATE users SET pro_until = GREATEST(pro_until, ${now}) + ${periodMs} WHERE id=${s.user_id}`;
        await sql`UPDATE subscriptions SET status='active', failures=0, updated_at=now() WHERE user_id=${s.user_id}`; // next_charge_at은 선점에서 전진됨
        charged += 1;
        await sendIngest("payment", `pay:${r.tid}`, { email: s.email ?? undefined, pay_kind: "subscribe_renew", result: "ok", pg_ref: r.tid, glovek_user_id: s.user_id });
      } else {
        await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
        const f = (s.failures ?? 0) + 1;
        const status = f >= BILLING_FAILURE_THRESHOLD ? "past_due" : "active";
        // 청구 실패 → 다음날 재시도(선점값 덮어씀).
        await sql`UPDATE subscriptions SET failures=${f}, status=${status}, next_charge_at=${now + 86_400_000}, updated_at=now() WHERE user_id=${s.user_id}`;
        failed += 1;
        await sendIngest("payment", `pay:${orderId}`, { email: s.email ?? undefined, pay_kind: "subscribe_renew", result: "fail", pg_ref: orderId, glovek_user_id: s.user_id });
      }
    }

    // ── 몰 입점 트랙 정기결제 (Pro와 분리, pro_until 미반영) ──
    const mallDue = await sql<{ user_id: string; track: string; bid: string; amount: number; failures: number; period_days: number; next_charge_at: number; email: string | null }>`
      SELECT m.user_id, m.track, m.bid, m.amount, m.failures, m.period_days, m.next_charge_at, u.email FROM mall_subscriptions m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.bid IS NOT NULL AND m.status IN ('active') AND m.next_charge_at <= ${now}
      ORDER BY m.next_charge_at ASC LIMIT 20`;
    let mallCharged = 0;
    let mallFailed = 0;
    for (const s of mallDue.rows) {
      const plan = PAY_PLANS[s.track] ?? PAY_PLANS.live; // 미확인 트랙 폴백(ready 제거)
      const period = (Number(s.period_days) || 30) * 86_400_000; // 구독별 주기(6개월 약정=180)
      const claim = await sql`UPDATE mall_subscriptions SET next_charge_at=${now + period}, updated_at=now()
                              WHERE user_id=${s.user_id} AND next_charge_at=${s.next_charge_at}`;
      if (claim.rowCount === 0) continue;
      const orderId = buildOrderId(SERVICE_ORDER_PREFIX, plan.planInitial);
      await sql`INSERT INTO orders (order_id, user_id, plan, amount, goods_name, status, kind, period_days)
                VALUES (${orderId}, ${s.user_id}, ${s.track}, ${s.amount}, ${plan.goodsName}, 'created', 'mall', ${s.period_days})`;
      const r = await chargeByBillingKey({ bid: s.bid, orderId, amount: s.amount, goodsName: plan.goodsName });
      if (r.ok && r.tid) {
        await sql`UPDATE orders SET status='paid', tid=${r.tid} WHERE order_id=${orderId}`; // tid 먼저(원장 유실 대비)
        await sql`INSERT INTO payments (payment_id, order_id, amount, raw) VALUES (${r.tid}, ${orderId}, ${s.amount}, ${JSON.stringify(r.raw)}::jsonb) ON CONFLICT (payment_id) DO NOTHING`;
        await sql`UPDATE mall_subscriptions SET status='active', failures=0, updated_at=now() WHERE user_id=${s.user_id}`;
        mallCharged += 1;
        await sendIngest("payment", `pay:${r.tid}`, { email: s.email ?? undefined, pay_kind: "subscribe_renew", result: "ok", pg_ref: r.tid, glovek_user_id: s.user_id });
      } else {
        await sql`UPDATE orders SET status='failed' WHERE order_id=${orderId}`;
        const f = (s.failures ?? 0) + 1;
        const status = f >= BILLING_FAILURE_THRESHOLD ? "past_due" : "active";
        await sql`UPDATE mall_subscriptions SET failures=${f}, status=${status}, next_charge_at=${now + 86_400_000}, updated_at=now() WHERE user_id=${s.user_id}`;
        mallFailed += 1;
        await sendIngest("payment", `pay:${orderId}`, { email: s.email ?? undefined, pay_kind: "subscribe_renew", result: "fail", pg_ref: orderId, glovek_user_id: s.user_id });
      }
    }

    return NextResponse.json({ ok: true, due: due.rows.length, charged, failed, mallDue: mallDue.rows.length, mallCharged, mallFailed });
  } finally {
    await sql`SELECT pg_advisory_unlock(918273645)`;
  }
}

export async function GET(req: Request) { return handle(req); }
export async function POST(req: Request) { return handle(req); }

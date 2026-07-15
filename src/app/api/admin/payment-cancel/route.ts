import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { cancelPayment, expireBillingKey, buildOrderId, SERVICE_ORDER_PREFIX } from "@/lib/nicepay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 관리자 결제 취소/환불. body { orderId, reason?, stopSubscription? }
// - 해당 주문의 결제(tid)를 NICEpay에서 취소 → 주문 status='cancelled'
// - stopSubscription=true면 구독 빌링키 해지 + pro_until 회수(정기결제 첫 결제 취소 시)
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const b = (await req.json().catch(() => ({}))) as { orderId?: string; reason?: string; stopSubscription?: boolean; forceLocal?: boolean };
  const orderId = String(b?.orderId ?? "").trim();
  if (!orderId) return NextResponse.json({ error: "orderId 필요" }, { status: 400 });

  // 주문 조회(결제 없어도 처리 가능하도록 LEFT JOIN)
  const { rows } = await sql<{ payment_id: string | null; amount: number | null; user_id: string; kind: string; status: string }>`
    SELECT p.payment_id, p.amount, o.user_id, o.kind, o.status
    FROM orders o LEFT JOIN payments p ON p.order_id = o.order_id
    WHERE o.order_id = ${orderId} ORDER BY p.created_at DESC NULLS LAST LIMIT 1`;
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "주문 없음" }, { status: 404 });
  if (row.status === "cancelled") return NextResponse.json({ ok: true, already: true });

  // 강제(기록만) 취소: 나이스페이 호출 없이 DB만 취소 처리. (샌드박스/미완/이미 처리된 건 정리용)
  if (b?.forceLocal) {
    await sql`UPDATE orders SET status='cancelled' WHERE order_id=${orderId}`;
    await sql`INSERT INTO collection_runs (kind, target, status, collected) VALUES ('payment_cancel_local', ${orderId}, 'ok', ${row.amount ?? 0})`;
    await stopSub(b, row);
    return NextResponse.json({ ok: true, forced: true });
  }

  if (!row.payment_id) return NextResponse.json({ ok: false, error: "결제 tid 없음(미결제). '기록만 취소'로 정리하세요.", noTid: true }, { status: 404 });

  // 취소는 새 상점거래번호(orderId)로 요청. 원 주문번호는 조회/로그용.
  const cancelOrderId = buildOrderId(SERVICE_ORDER_PREFIX, "C");
  const r = await cancelPayment({ tid: row.payment_id, orderId: cancelOrderId, reason: b?.reason || "관리자 취소" });
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: `나이스페이 취소 실패: ${r.resultMsg || r.resultCode}`, resultCode: r.resultCode, tid: row.payment_id, canForceLocal: true }, { status: 402 });
  }

  await sql`UPDATE orders SET status='cancelled' WHERE order_id=${orderId}`;
  await sql`INSERT INTO collection_runs (kind, target, status, collected) VALUES ('payment_cancel', ${orderId}, 'ok', ${row.amount ?? 0})`;

  const subStopped = await stopSub(b, row);
  return NextResponse.json({ ok: true, cancelledTid: r.cancelledTid, subStopped });
}

// 구독 정지(옵션): 빌링키 해지 + status=canceled + (Pro면) pro_until 회수.
async function stopSub(b: { stopSubscription?: boolean }, row: { user_id: string; kind: string }): Promise<boolean> {
  if (!b?.stopSubscription || !(row.kind === "subscribe" || row.kind === "mall")) return false;
  const table = row.kind === "mall" ? "mall_subscriptions" : "subscriptions";
  const s = await sql.query(`SELECT bid FROM ${table} WHERE user_id=$1 LIMIT 1`, [row.user_id]);
  const bid = (s.rows[0] as { bid?: string } | undefined)?.bid;
  if (bid) { try { await expireBillingKey(bid); } catch { /* 무시 */ } }
  await sql.query(`UPDATE ${table} SET status='canceled', bid=NULL, updated_at=now() WHERE user_id=$1`, [row.user_id]);
  if (row.kind === "subscribe") await sql`UPDATE users SET pro_until = LEAST(pro_until, ${Date.now()}) WHERE id=${row.user_id}`;
  return true;
}

import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/nicepay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// NICEpay webhook (서버 to 서버, 이중 안전망). 반드시 raw body로 서명 검증.
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-nicepay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return new Response("invalid_signature", { status: 401 });
  }
  if (!isConfigured()) return new Response("ok");

  let event: { tid?: string; orderId?: string; amount?: number };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("bad_json", { status: 400 });
  }

  await ensureSchema();
  if (event.tid) {
    // 멱등 upsert (payment_id UNIQUE)
    await sql`INSERT INTO payments (payment_id, order_id, amount, raw)
              VALUES (${event.tid}, ${event.orderId ?? null}, ${event.amount ?? null}, ${rawBody}::jsonb)
              ON CONFLICT (payment_id) DO NOTHING`;
  }
  return new Response("ok");
}

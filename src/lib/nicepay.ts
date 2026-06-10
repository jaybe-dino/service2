// NICEpay V2 결제 어댑터 — @tpartners/payments-nicepay 문서 계약(v0.1.0)을 그대로 구현.
// 추후 사내 패키지 설치 시 이 파일을 `export * from "@tpartners/payments-nicepay"` 로 교체 가능.
import crypto from "crypto";

const API_BASE = process.env.NICEPAY_API_BASE || "https://api.nicepay.co.kr";
const CLIENT_KEY = process.env.NICEPAY_CLIENT_KEY || "";
const SECRET_KEY = process.env.NICEPAY_SECRET_KEY || "";
const WEBHOOK_SECRET = process.env.NICEPAY_WEBHOOK_SECRET || "";

export const SERVICE_ORDER_PREFIX = process.env.SERVICE_ORDER_PREFIX || "KTREND";
export const BILLING_FAILURE_THRESHOLD = 3;
export const DEFAULT_TRIAL = { durationDays: 7, usageLimit: 5 } as const;

export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled" | "expired" | "never";

export function statusMessage(status: SubscriptionStatus): string {
  switch (status) {
    case "trial": return "무료 체험 이용 중";
    case "active": return "정상 구독 중";
    case "past_due": return "결제 실패 — 결제수단을 갱신해 주세요";
    case "canceled": return "자동갱신 해지됨 (기간 종료까지 이용 가능)";
    case "expired": return "구독이 만료되었습니다";
    default: return "구독 이력 없음";
  }
}

export function isConfigured(): boolean {
  return Boolean(CLIENT_KEY && SECRET_KEY);
}

export function clientKey(): string {
  return CLIENT_KEY;
}

// 3.1 orderId 생성: {prefix}_{플랜이니셜}_{유닉스ms}
export function buildOrderId(servicePrefix: string, plan: string): string {
  const initial = (plan.trim()[0] || "X").toUpperCase();
  return `${servicePrefix}_${initial}_${Date.now()}`;
}

// 3.2 프리픽스 추출
export function parseOrderIdPrefix(orderId: string): string | null {
  const m = /^([A-Z0-9]+)_[A-Z]_\d+$/.exec(orderId);
  return m ? m[1] : null;
}

function basicAuth(): string {
  return "Basic " + Buffer.from(`${CLIENT_KEY}:${SECRET_KEY}`).toString("base64");
}

interface ApproveResult { ok: boolean; resultCode: string; resultMsg: string; tid?: string; bid?: string; raw: unknown; }

// 3.3 서버 승인 — 결제창 완료 후 returnUrl에서 호출
export async function approvePayment({ tid, amount }: { tid: string; amount: number }): Promise<ApproveResult> {
  if (!isConfigured()) return { ok: false, resultCode: "ENV", resultMsg: "NICEPAY keys not set", raw: null };
  try {
    const res = await fetch(`${API_BASE}/v1/payments/${encodeURIComponent(tid)}`, {
      method: "POST",
      headers: { Authorization: basicAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const raw = await res.json().catch(() => ({}));
    const resultCode = (raw as { resultCode?: string }).resultCode ?? String(res.status);
    const resultMsg = (raw as { resultMsg?: string }).resultMsg ?? "";
    return {
      ok: resultCode === "0000",
      resultCode,
      resultMsg,
      tid: (raw as { tid?: string }).tid ?? tid,
      bid: (raw as { bid?: string }).bid,
      raw,
    };
  } catch (e) {
    return { ok: false, resultCode: "EXC", resultMsg: String(e), raw: null };
  }
}

// 3.4 정기 결제 — 빌링키로 자동 청구
export async function chargeByBillingKey({ bid, orderId, amount, goodsName }: { bid: string; orderId: string; amount: number; goodsName: string; }): Promise<ApproveResult & { tid?: string }> {
  if (!isConfigured()) return { ok: false, resultCode: "ENV", resultMsg: "NICEPAY keys not set", raw: null };
  try {
    const res = await fetch(`${API_BASE}/v1/subscribe/${encodeURIComponent(bid)}/payments`, {
      method: "POST",
      headers: { Authorization: basicAuth(), "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, amount, goodsName }),
    });
    const raw = await res.json().catch(() => ({}));
    const resultCode = (raw as { resultCode?: string }).resultCode ?? String(res.status);
    return { ok: resultCode === "0000", resultCode, resultMsg: (raw as { resultMsg?: string }).resultMsg ?? "", tid: (raw as { tid?: string }).tid, raw };
  } catch (e) {
    return { ok: false, resultCode: "EXC", resultMsg: String(e), raw: null };
  }
}

// 3.5 빌링키 만료(해지)
export async function expireBillingKey(bid: string): Promise<{ ok: boolean; raw: unknown }> {
  if (!isConfigured()) return { ok: false, raw: null };
  try {
    const res = await fetch(`${API_BASE}/v1/subscribe/${encodeURIComponent(bid)}/expire`, {
      method: "POST",
      headers: { Authorization: basicAuth(), "Content-Type": "application/json" },
      body: "{}",
    });
    const raw = await res.json().catch(() => ({}));
    return { ok: (raw as { resultCode?: string }).resultCode === "0000", raw };
  } catch {
    return { ok: false, raw: null };
  }
}

// 3.6 webhook HMAC-SHA256 서명 검증 (timing-safe)
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

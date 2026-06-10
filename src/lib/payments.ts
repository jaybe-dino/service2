// 결제 가능한 플랜 가격 (NICEpay는 KRW 기준)
// ⚠️ 임시: 실키 검증용 ₩1,000. 결제 동작 확인 후 정상가(199000)로 복원할 것.
export const PAY_PLANS: Record<string, { amount: number; goodsName: string; planInitial: string; periodDays: number }> = {
  pro: { amount: 1000, goodsName: "K-Trend Analytics Pro (월간) [검증]", planInitial: "Pro", periodDays: 30 },
};

export function originFromHeaders(host: string | null, proto = "https"): string {
  return host ? `${proto}://${host}` : "";
}

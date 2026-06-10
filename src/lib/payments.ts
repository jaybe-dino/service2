// 결제 가능한 플랜 가격 (NICEpay는 KRW 기준)
export const PAY_PLANS: Record<string, { amount: number; goodsName: string; planInitial: string; periodDays: number }> = {
  pro: { amount: 199000, goodsName: "K-Trend Analytics Pro (월간)", planInitial: "Pro", periodDays: 30 },
};

export function originFromHeaders(host: string | null, proto = "https"): string {
  return host ? `${proto}://${host}` : "";
}

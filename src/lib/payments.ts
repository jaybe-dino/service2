// 결제 가능한 플랜 가격 (NICEpay는 KRW 기준)
// Pro: ₩89,000/월 정기결제. 무료체험 없음 — 카드 등록 즉시 첫 결제 후 매월 자동청구.
export const PAY_PLANS: Record<string, { amount: number; goodsName: string; planInitial: string; periodDays: number; trialDays: number }> = {
  pro: { amount: 89000, goodsName: "Glovek Pro (월간)", planInitial: "Pro", periodDays: 30, trialDays: 0 },
  // 틱톡샵 온보딩 트랙 — 단건 결제(구독 아님). 결제 후 apply.tpartners 로 이동.
  onboarding: { amount: 3_000_000, goodsName: "Glovek 틱톡샵 온보딩", planInitial: "Onb", periodDays: 0, trialDays: 0 },
};

export function originFromHeaders(host: string | null, proto = "https"): string {
  return host ? `${proto}://${host}` : "";
}

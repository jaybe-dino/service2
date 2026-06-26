// 결제 가능한 플랜 가격 (NICEpay는 KRW 기준)
// Pro: ₩89,000/월 정기결제. 무료체험 없음 — 카드 등록 즉시 첫 결제 후 매월 자동청구.
export const PAY_PLANS: Record<string, { amount: number; goodsName: string; planInitial: string; periodDays: number; trialDays: number }> = {
  pro: { amount: 89000, goodsName: "Glovek Pro (월간)", planInitial: "Pro", periodDays: 30, trialDays: 0 },
  // 글로벅 몰 입점 트랙 (월 정기결제). Ready/Live는 사이트 내 구독, Onboarding은 결제 후 apply.tpartners 이동.
  ready: { amount: 150_000, goodsName: "Glovek Ready Track (월간)", planInitial: "Ready", periodDays: 30, trialDays: 0 },
  live: { amount: 490_000, goodsName: "Glovek Live Focus Track (월간)", planInitial: "Live", periodDays: 30, trialDays: 0 },
  onboarding: { amount: 3_000_000, goodsName: "Glovek Onboarding Track (월간)", planInitial: "Onb", periodDays: 30, trialDays: 0 },
};

// 몰 입점 트랙 결제 키 — start/return/cron 에서 일반 Pro 구독과 구분하는 데 사용
export const MALL_PLAN_KEYS = ["ready", "live", "onboarding"] as const;
export type MallPlanKey = (typeof MALL_PLAN_KEYS)[number];
export function isMallPlan(key: string): key is MallPlanKey {
  return (MALL_PLAN_KEYS as readonly string[]).includes(key);
}

export function originFromHeaders(host: string | null, proto = "https"): string {
  return host ? `${proto}://${host}` : "";
}

// 추천인 수수료 정책: 결제 전환 추천 인원 수에 따른 요율 (결제금액 기준)
// 10명 → 10% · 20명 → 20% · 30명 이상 → 30%
export function commissionRate(paidCount: number): number {
  if (paidCount >= 30) return 0.30;
  if (paidCount >= 20) return 0.20;
  if (paidCount >= 10) return 0.10;
  return 0;
}

export function commissionAmount(revenue: number, paidCount: number): number {
  return Math.round((revenue || 0) * commissionRate(paidCount));
}

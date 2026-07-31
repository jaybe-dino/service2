// 결제 심사 모드 — 나이스페이 정책상 서비스 제공기간 3개월 초과 상품 판매 불가.
// NEXT_PUBLIC_PAY_REVIEW=1 이면 심사용 '결제 2' 플로우로 전환:
//  · 연간(Pro) 결제 옵션 숨김
//  · 6개월 약정 term 숨김(월간만)
//  · Guarantee Track(최소 6개월) 숨김
//  · 요금제/업그레이드 CTA를 /plans2(결제 2)로 연결
// 미설정(기본) = '결제 1' 현행 유지.
export const PAY_REVIEW = process.env.NEXT_PUBLIC_PAY_REVIEW === "1";

// 요금제 경로 — 심사 모드면 결제 2 페이지.
export const PLANS_PATH = PAY_REVIEW ? "/plans2" : "/plans";

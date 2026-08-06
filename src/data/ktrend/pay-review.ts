// 결제 심사 모드 — 나이스페이 정책상 서비스 제공기간 3개월 초과 상품 판매 불가.
//
// ▶ 현재 기본값 = '전체 결제(롤백 완료, 2026-08)':
//    · 연간(Pro) 결제 옵션 노출
//    · 6개월 약정 term 노출
//    · Guarantee Track 노출
//    → /plans, /plans/mall, /onboarding 모두 기존(전체 상품) 상태로 복원됨.
//
// ▶ 다시 '심사 대응 모드'(3개월 이하만 노출)가 필요하면 — 둘 중 하나:
//    (A) Vercel 환경변수에  NEXT_PUBLIC_PAY_REVIEW = 1  추가 후 Redeploy  ← 가장 빠름(코드 변경 없음)
//    (B) 담당자에게 "결제 심사모드" 요청 → 아래 PAY_FULL 기본값을 false로 되돌리고 배포
export const PAY_FULL = process.env.NEXT_PUBLIC_PAY_REVIEW !== "1";

// 심사 대응 여부: PAY_FULL(전체 결제)이 아니면 심사 모드(3개월 이하만).
export const PAY_REVIEW = !PAY_FULL;

// 요금제 경로 — 심사 모드면 결제 2 페이지(월간 전용).
export const PLANS_PATH = PAY_REVIEW ? "/plans2" : "/plans";

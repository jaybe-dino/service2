// 결제 심사 모드 — 나이스페이 정책상 서비스 제공기간 3개월 초과 상품 판매 불가.
//
// ▶ 현재 기본값 = '심사 대응 모드'(2026-08-28, 나이스페이 정식 오픈 심사):
//    · 연간(Pro) 결제 옵션 숨김 (/plans 월간 고정)
//    · 6개월 약정 term 숨김 (/onboarding)
//    · Guarantee Track(6개월 약정 고정가) 숨김 (/plans/mall, /onboarding)
//    · 취소·환불 정책(/refund) 결제 화면 전면 노출
//
// ▶ 심사 통과 후 '전체 결제'로 되돌리기 — 둘 중 하나:
//    (A) Vercel 환경변수  NEXT_PUBLIC_PAY_REVIEW = 0  추가 후 Redeploy  ← 코드 변경 없음, 가장 빠름
//    (B) 담당자에게 "결제 심사모드 해제(전체 결제로 복원)" 요청
//        → 아래 DEFAULT_REVIEW 를 false 로 바꾸고 배포
//    반대로 다시 심사모드가 필요하면 NEXT_PUBLIC_PAY_REVIEW = 1 또는 DEFAULT_REVIEW = true.
const DEFAULT_REVIEW = true;

// 환경변수 오버라이드: "1"=심사모드 강제 · "0"=전체 결제 강제 · 미설정=DEFAULT_REVIEW.
const env = process.env.NEXT_PUBLIC_PAY_REVIEW;
export const PAY_REVIEW = env === "1" ? true : env === "0" ? false : DEFAULT_REVIEW;
export const PAY_FULL = !PAY_REVIEW;

// 요금제 경로 — 심사 모드면 결제 2 페이지(월간 전용).
export const PLANS_PATH = PAY_REVIEW ? "/plans2" : "/plans";

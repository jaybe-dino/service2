// 결제 심사 모드 — 나이스페이 정책상 서비스 제공기간 3개월 초과 상품 판매 불가.
//
// ▶ 현재 기본값 = '심사 대응' 상태(3개월 이하만 노출):
//    · 연간(Pro) 결제 옵션 숨김
//    · 6개월 약정 term 숨김(월간만)
//    · Guarantee Track(최소 6개월) 숨김
//    → /plans, /plans/mall, /onboarding 모두 서비스기간 3개월 이하 상품만.
//
// ▶ 롤백(기존 연간·6개월·Guarantee 전부 복원) 방법 — 둘 중 하나:
//    (A) Vercel 환경변수에  NEXT_PUBLIC_PAY_FULL = 1  추가 후 Redeploy  ← 가장 빠름(코드 변경 없음)
//    (B) 담당자에게 "결제 롤백" 요청 → 이 파일 기본값을 원복(아래 PAY_FULL 기본 true)하고 배포
export const PAY_FULL = process.env.NEXT_PUBLIC_PAY_FULL === "1";

// 심사 대응 여부: PAY_FULL(롤백)이 아니면 심사 모드(3개월 이하만).
export const PAY_REVIEW = !PAY_FULL;

// 요금제 경로 — 심사 모드면 결제 2 페이지(월간 전용).
export const PLANS_PATH = PAY_REVIEW ? "/plans2" : "/plans";

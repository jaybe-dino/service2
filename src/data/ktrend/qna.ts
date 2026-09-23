// TikTok Shop FAQ — 관리자(admin.glovek.space) 승인 QnA(qna_entries, approved=true)를 런타임에 소비한다.
// 원문(질문·답변·카테고리)은 관리자 데이터 그대로 반영하며, 이 파일에는 하드코딩 문항을 두지 않는다.
// (기존 24문항/114문항 하드코딩 fallback을 제거 — 실패·빈결과는 페이지에서 상태로 구분한다.)

export interface FaqEntry { question: string; answer: string; category: string | null; usage_count?: number }

// 공개 FAQ JSON 소스(관리자 승인 QnA). 배포 환경변수로 교체 가능.
export const FAQ_API_URL = process.env.FAQ_API_URL || "https://tiktok.glovek.space/api/faq";

// 모든 답변에 공통 적용되는 안내 — 상단·하단에 동일 표기(문구 정확히 유지).
export const QNA_COMMON_NOTICE =
  "본 Q&A의 모든 답변은 업체의 상황과 조건에 따라 달라질 수 있습니다. 자세한 문의는 1:1 상담을 신청해 주세요.";

// 상단·하단 공통 안내의 상담 링크
export const QNA_CONSULT_HREF = "/consult1";

// ── 사업 조건 가드: '입점 준비·초기 세팅만 단독 제공/신청 가능'은 제공하지 않는다 ──
// 관리자 승인 데이터에 단독 제공 가능 답변이 있어도 공개 Q&A·검색·자주찾는질문·SEO에
// 다시 노출되지 않도록, 해당 취지의 답변을 아래 지정 문구로 대체한다(질문 자체는 유지).
// (입점 준비 '절차 일반 설명'은 제거하지 않음 — 단독 제공/단독 신청 프레이밍만 대상.)
export const STANDALONE_ONB_ANSWER =
  "입점 준비·초기 세팅만 단독으로 진행하는 서비스는 제공하지 않습니다. 자세한 진행 범위는 1:1 상담을 신청해 주세요.";

const ONB_RE = /(온보딩|입점\s*준비|초기\s*세팅|셋업)/;
// 단독/전용 제공 프레이밍(온보딩 맥락에 결합될 때만 매칭)
const SOLO_RE = /(온보딩만|입점\s*준비만|준비만|초기\s*세팅만|세팅만|셋업만|단독|만\s*따로|따로\s*진행|따로\s*신청)/;

export function guardStandaloneOnboarding(e: FaqEntry): FaqEntry {
  const t = `${e.question} ${e.answer}`;
  if (ONB_RE.test(t) && SOLO_RE.test(t)) return { ...e, answer: STANDALONE_ONB_ANSWER };
  return e;
}

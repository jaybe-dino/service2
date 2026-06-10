// K-Trend Analytics 공통 메타데이터 (v6.0 — 실데이터 기반)
// 출처: brands_1to100_MASTER.xlsx (실제 틱톡 영상 11,703건 / 98개 K-뷰티 브랜드)
// 핵심 축: 브랜드 · 콘텐츠 · 인플루언서

// 정적 배포 basePath (런타임 fetch 경로용). next.config와 동일 출처.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// ---------------------------------------------------------------------------
// 카테고리 — 실데이터의 브랜드 분류 기준 (코스메틱 중심)
// ---------------------------------------------------------------------------
export type CategoryId = "skincare" | "makeup" | "haircare";

export interface Category {
  id: CategoryId;
  nameKo: string;
  nameEn: string;
  icon: string;
}

export const CATEGORIES: Category[] = [
  { id: "skincare", nameKo: "스킨케어", nameEn: "Skincare", icon: "💧" },
  { id: "makeup", nameKo: "메이크업", nameEn: "Makeup", icon: "💄" },
  { id: "haircare", nameKo: "헤어케어", nameEn: "Haircare", icon: "💇" },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

// 세부 카테고리 (뷰티 세분화) — 브랜드/콘텐츠에 매칭
export type SubCategoryId =
  | "derma" | "skincare" | "suncare" | "cleansing" | "mask"
  | "makeup" | "lip" | "hair" | "body";

export interface SubCategory { id: SubCategoryId; nameKo: string; icon: string; parent: CategoryId }

export const SUBCATEGORIES: SubCategory[] = [
  { id: "derma", nameKo: "더마·진정", icon: "🩺", parent: "skincare" },
  { id: "skincare", nameKo: "스킨케어", icon: "💧", parent: "skincare" },
  { id: "suncare", nameKo: "선케어", icon: "☀️", parent: "skincare" },
  { id: "cleansing", nameKo: "클렌징", icon: "🫧", parent: "skincare" },
  { id: "mask", nameKo: "마스크·팩", icon: "🧖", parent: "skincare" },
  { id: "makeup", nameKo: "메이크업", icon: "💄", parent: "makeup" },
  { id: "lip", nameKo: "립", icon: "👄", parent: "makeup" },
  { id: "hair", nameKo: "헤어케어", icon: "💇", parent: "haircare" },
  { id: "body", nameKo: "바디케어", icon: "🧴", parent: "skincare" },
];

export const SUBCATEGORY_MAP: Record<SubCategoryId, SubCategory> = Object.fromEntries(
  SUBCATEGORIES.map((c) => [c.id, c]),
) as Record<SubCategoryId, SubCategory>;

// ---------------------------------------------------------------------------
// 인플루언서 규모(티어) — 평균 조회수 기반으로 산출 (팔로워 데이터 부재)
// ---------------------------------------------------------------------------
export type InfluencerTier = "mega" | "macro" | "micro";

export const TIERS: Record<InfluencerTier, { label: string; nameKo: string; range: string; color: string }> = {
  mega: { label: "Mega", nameKo: "메가", range: "평균 1M+ 조회", color: "#7C3AED" },
  macro: { label: "Macro", nameKo: "매크로", range: "평균 100K–1M 조회", color: "#1A56DB" },
  micro: { label: "Micro", nameKo: "마이크로", range: "평균 100K 미만", color: "#0E9F6E" },
};

export function tierOf(avgViews: number): InfluencerTier {
  if (avgViews >= 1_000_000) return "mega";
  if (avgViews >= 100_000) return "macro";
  return "micro";
}

// ---------------------------------------------------------------------------
// 디자인 토큰 (Light Clean)
// ---------------------------------------------------------------------------
export const TOKENS = {
  bg: "#FFFFFF",
  fg: "#2D3748",
  accent: "#1A56DB",
  accentLight: "#EFF6FF",
  border: "#E2E8F0",
};

// ---------------------------------------------------------------------------
// 요금제 / 유료 서비스
// ---------------------------------------------------------------------------
export type PlanId = "basic" | "pro" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  price: string;
  priceNote: string;
  tagline: string;
  popular?: boolean;
  features: string[];
  cta: string;
}

export const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: "$0",
    priceNote: "무료",
    tagline: "틱톡 트렌드를 가볍게 둘러보기",
    cta: "무료로 시작하기",
    features: [
      "콘텐츠 성과 지표 전체 열람 (조회수·참여율·추정 ROAS·매출)",
      "열람권 하루 5건 — 콘텐츠 링크 열람 · 계정 이름 공개 공통 차감",
      "신규 브랜드 추가 불가",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$159",
    priceNote: "/ 월",
    tagline: "마케터를 위한 풀 액세스",
    popular: true,
    cta: "Pro 시작하기",
    features: [
      "열람권 무제한 (콘텐츠 링크 · 계정 이름)",
      "인플루언서 컨택 라인 해금",
      "전체 브랜드 필터 무제한 · 모바일 뷰어",
      "신규 브랜드 추가 + 12시간 자가 학습 (월 3회)",
      "주 2회 바이럴 알림 · 성장 리포트",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$399",
    priceNote: "/ 월~",
    tagline: "팀 단위 벤치마킹과 실매출 연동",
    cta: "도입 문의",
    features: [
      "Pro의 모든 기능 포함",
      "다중 계정 지원",
      "틱톡 샵 실시간 매출 API(OAuth2) 연동",
      "경쟁사 벤치마크 원클릭 PDF 리포트",
      "신규 브랜드 자가 학습 무제한",
      "전담 컨설턴트 배정 · 실시간 슬랙/이메일 알림",
    ],
  },
];

export const ADDONS = [
  { id: "contact", name: "컨택 라인", price: "$19 / 명", desc: "바이럴 영상 인플루언서의 실제 이메일·WhatsApp 및 평균 제휴 단가 해금" },
  { id: "report", name: "인사이트 리포트", price: "$49 / 건", desc: "특정 브랜드 6개월 어필리에이트 성과·소구점 분석 PDF 자동 생성" },
  { id: "similar", name: "유사 콘텐츠 탐색", price: "$29 / 건", desc: "바이럴 영상의 시청각 특징 분석 기반 유사 고성과 영상 자동 추천" },
];

export const SERVICE = {
  name: "Glovek",
  version: "v6.0",
  tagline: "글로벌 틱톡 K-뷰티 콘텐츠 조회·분석 전문 B2B SaaS",
  updateNote: "매주 월·목 오전 9시 트렌드 업데이트",
};

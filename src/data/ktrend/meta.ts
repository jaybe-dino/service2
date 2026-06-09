// K-Trend Analytics 공통 메타데이터 (v6.0)
// 핵심 축: 브랜드 · 콘텐츠 · 인플루언서 / 미국 중심 6개국 / 코스메틱(뷰티) 카테고리

export type CountryCode = "US" | "TH" | "VN" | "PH" | "MY" | "SG";

export interface Country {
  code: CountryCode;
  flag: string;
  nameKo: string;
  nameEn: string;
  activity: "매우 높음" | "높음" | "보통";
  focus: string;
  primary?: boolean;
}

// 미국 중심, 동남아 5개국. (정렬: 미국 최우선)
export const COUNTRIES: Country[] = [
  { code: "US", flag: "🇺🇸", nameKo: "미국", nameEn: "United States", activity: "매우 높음", focus: "세럼 · 에센스 · 선케어 · 장벽 크림", primary: true },
  { code: "TH", flag: "🇹🇭", nameKo: "태국", nameEn: "Thailand", activity: "높음", focus: "수분 세럼 · 진정 마스크팩 · 톤업 크림" },
  { code: "VN", flag: "🇻🇳", nameKo: "베트남", nameEn: "Vietnam", activity: "매우 높음", focus: "여드름 패치 · 모공 토너 · 선크림" },
  { code: "PH", flag: "🇵🇭", nameKo: "필리핀", nameEn: "Philippines", activity: "높음", focus: "쿠션 파운데이션 · 매트 립 · 수분 에센스" },
  { code: "MY", flag: "🇲🇾", nameKo: "말레이시아", nameEn: "Malaysia", activity: "보통", focus: "무자극 선크림 · 비건 마스크팩 · 립밤" },
  { code: "SG", flag: "🇸🇬", nameKo: "싱가포르", nameEn: "Singapore", activity: "보통", focus: "슬리핑 마스크 · 안티에이징 · 아이크림" },
];

export const COUNTRY_MAP: Record<CountryCode, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
) as Record<CountryCode, Country>;

// ---------------------------------------------------------------------------
// 코스메틱(뷰티) 중심 카테고리 — 1차 출시 범위. 대분류 + 세부 분류.
// ---------------------------------------------------------------------------
export type CategoryId =
  | "skincare"
  | "suncare"
  | "makeup"
  | "mask"
  | "trouble"
  | "lipcare";

export interface Category {
  id: CategoryId;
  nameKo: string;
  nameEn: string;
  icon: string; // emoji
  sub: string[];
}

export const CATEGORIES: Category[] = [
  { id: "skincare", nameKo: "스킨케어", nameEn: "Skincare", icon: "💧", sub: ["세럼", "에센스", "토너", "장벽 크림", "클렌징", "아이크림"] },
  { id: "suncare", nameKo: "선케어", nameEn: "Suncare", icon: "☀️", sub: ["선세럼", "선크림", "톤업 선", "선스틱"] },
  { id: "makeup", nameKo: "메이크업", nameEn: "Makeup", icon: "💄", sub: ["쿠션", "파운데이션", "립", "아이", "베이스"] },
  { id: "mask", nameKo: "마스크팩", nameEn: "Mask", icon: "🧖", sub: ["시트 마스크", "진정 마스크", "슬리핑 팩", "비건 마스크"] },
  { id: "trouble", nameKo: "트러블 케어", nameEn: "Trouble Care", icon: "🩹", sub: ["여드름 패치", "모공 토너", "진정 앰플"] },
  { id: "lipcare", nameKo: "립케어", nameEn: "Lip Care", icon: "👄", sub: ["립밤", "립 글로우", "립 마스크"] },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, Category>;

// ---------------------------------------------------------------------------
// 콘텐츠(영상) 스타일 — 콘텐츠별 필터 축
// ---------------------------------------------------------------------------
export type ContentStyle = "skit" | "grwm" | "asmr" | "review" | "haul" | "tutorial";

export const CONTENT_STYLES: { id: ContentStyle; nameKo: string; nameEn: string }[] = [
  { id: "review", nameKo: "리뷰", nameEn: "Review" },
  { id: "grwm", nameKo: "GRWM", nameEn: "Get Ready With Me" },
  { id: "asmr", nameKo: "ASMR", nameEn: "ASMR" },
  { id: "skit", nameKo: "스킷", nameEn: "Skit" },
  { id: "haul", nameKo: "하울", nameEn: "Haul" },
  { id: "tutorial", nameKo: "튜토리얼", nameEn: "Tutorial" },
];

export const CONTENT_STYLE_MAP = Object.fromEntries(
  CONTENT_STYLES.map((s) => [s.id, s]),
) as Record<ContentStyle, { id: ContentStyle; nameKo: string; nameEn: string }>;

// ---------------------------------------------------------------------------
// 인플루언서 규모(티어)
// ---------------------------------------------------------------------------
export type InfluencerTier = "mega" | "macro" | "micro";

export const TIERS: Record<InfluencerTier, { label: string; nameKo: string; range: string; color: string }> = {
  mega: { label: "Mega", nameKo: "메가", range: "1M+ 팔로워", color: "#7C3AED" },
  macro: { label: "Macro", nameKo: "매크로", range: "100K–1M 팔로워", color: "#1A56DB" },
  micro: { label: "Micro", nameKo: "마이크로", range: "10K–100K 팔로워", color: "#0E9F6E" },
};

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
      "주간 콘텐츠 탐색 20개 제한",
      "브랜드 필터 상위 5개만 노출",
      "수익화 지표(ROAS/매출) 블러 처리",
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
      "110개 브랜드 필터 무제한",
      "콘텐츠 탐색 무제한 · 틱톡 임베드 재생",
      "추정 매출 / ROAS 전체 오픈",
      "모바일 뷰어 제공",
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
  name: "K-Trend Analytics",
  version: "v6.0",
  tagline: "글로벌 틱톡 K-뷰티 콘텐츠 조회·분석 전문 B2B SaaS",
  updateNote: "매주 월·목 오전 9시 AI 트렌드 업데이트",
};

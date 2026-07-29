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

// 타겟 국가 (US + 동남아 4개국 활성. PH/ID는 추후 확장)
export interface Country { id: string; nameKo: string; flag: string; active: boolean }
export const COUNTRIES: Country[] = [
  { id: "US", nameKo: "미국", flag: "🇺🇸", active: true },
  { id: "TH", nameKo: "태국", flag: "🇹🇭", active: true },
  { id: "VN", nameKo: "베트남", flag: "🇻🇳", active: true },
  { id: "MY", nameKo: "말레이시아", flag: "🇲🇾", active: true },
  { id: "SG", nameKo: "싱가포르", flag: "🇸🇬", active: true },
  { id: "PH", nameKo: "필리핀", flag: "🇵🇭", active: false },
  { id: "ID", nameKo: "인도네시아", flag: "🇮🇩", active: false },
];
// 동남아 크롤링 대상(프록시 국가코드로 지역 타게팅). US는 기본 시장.
export const SEA_COUNTRIES = ["TH", "VN", "MY", "SG"] as const;
export const COUNTRY_MAP: Record<string, Country> = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));

// ---------------------------------------------------------------------------
// 틱톡샵 온보딩 트랙 (롤백 가능 — ONBOARDING.enabled=false 로 끄면 탭/페이지 전부 숨김)
// 흐름: 회원가입 → 최소 정보 입력 → 기본 결제(₩3,000,000) → apply.tpartners 로 이동
// ---------------------------------------------------------------------------
export const ONBOARDING = {
  enabled: true,
  navLabel: "틱톡샵 입점",
  path: "/onboarding",
  // Onboarding Track 결제 완료 후 이동할 외부 신청 페이지 (환경변수로 오버라이드 가능)
  applyUrl: process.env.NEXT_PUBLIC_ONBOARDING_APPLY_URL || "https://apply.tpartners.live",
} as const;

// ⚠️ 결제 테스트 모드 — true면 모든 결제 금액(Pro·몰 입점 트랙)을 ₩1,000으로 강제한다.
// 실제 결제 테스트가 끝나면 반드시 false로 되돌릴 것. (운영 금액은 그대로 보존)
export const PAY_TEST_MODE = false;
export const testPrice = (real: number): number => (PAY_TEST_MODE ? 1000 : real);
const wonLabel = (n: number): string => "₩" + n.toLocaleString();

// GloveK 몰 입점 트랙 — 메인은 Ready / Live Focus (사이트 내 구독 결제),
// Onboarding Track은 결제 후 apply.tpartners 로 이동.
export type MallTrackId = "live" | "guarantee" | "onboarding";
export interface MallTrack {
  id: MallTrackId;
  name: string;
  tagline: string;
  price: number;
  priceLabel: string;
  commissionLabel: string;
  features: string[];
  highlight: boolean;             // Live Focus = 추천(상단 핑크 라인)
  dark: boolean;                  // Onboarding = 다크 헤더
  flow: "subscribe" | "apply";    // subscribe=사이트 내 구독 / apply=결제 후 apply.tpartners
  inquiry?: boolean;              // true면 금액 미표시·결제 없이 '가격 문의'로 처리
  minTermNote?: string;           // 권장 최소 이용 기간 안내
  fixedPrice?: boolean;           // true면 고정가 — 국가수 곱셈·다국가/약정 할인 미적용 (Guarantee)
}

export const MALL_TRACKS: MallTrack[] = [
  {
    id: "live", name: "Live Focus Track", tagline: "초기 파일럿부터 자체 브랜드 채널 운영까지",
    price: testPrice(490_000), priceLabel: wonLabel(testPrice(490_000)), commissionLabel: "판매 수수료 10%",
    features: ["벤더 매칭 및 제안 (비독점)", "어필리에이트 캠페인 운영", "제품 상세페이지 번역 지원", "무가 라이브 커머스 지원 (월 4회)", "유가 시딩 캠페인 운영", "무가 시딩 캠페인 20개~", "최대 5개 제품 등록 가능"],
    highlight: true, dark: false, flow: "subscribe", minTermNote: "최소 6개월 권장",
  },
  {
    id: "guarantee", name: "Guarantee Track", tagline: "온보딩 보장 — 입점부터 자체 브랜드 채널 오픈까지",
    price: testPrice(1_000_000), priceLabel: wonLabel(testPrice(1_000_000)), commissionLabel: "판매 수수료 10%",
    features: ["인증/입점 · 물류 · 번역 지원", "무가 라이브 커머스 월 6회", "무가 시딩 30개~", "최대 10개 제품 등록", "6개월 내 온보딩 보장", "Live Focus 구성 × 2배 제공"],
    highlight: false, dark: true, flow: "subscribe", minTermNote: "최소 6개월 약정", fixedPrice: true,
  },
  {
    id: "onboarding", name: "Onboarding Track", tagline: "메가 스케일업 & 채널 독립",
    price: testPrice(3_000_000), priceLabel: "가격 문의", commissionLabel: "판매 수수료 10%",
    features: ["GMV 달성 캠페인 운영 대행", "브랜드 자체 채널 온보딩 지원", "메가셀럽 및 대형 캠페인 제안", "제품 수량 제한 없이 등록 가능"],
    highlight: false, dark: true, flow: "apply", inquiry: true,
  },
];

export const MALL_TRACK_MAP: Record<MallTrackId, MallTrack> =
  Object.fromEntries(MALL_TRACKS.map((t) => [t.id, t])) as Record<MallTrackId, MallTrack>;

// 모든 트랙 공통 제공 혜택
export const MALL_COMMON_BENEFITS = [
  "틱톡샵 입점 @Glovek",
  "Glovek 플랫폼 이용권",
  "물류/CS 대행 (물류비 별도)",
  "인플루언서 제품 노출 지원",
];

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
    price: "₩0",
    priceNote: "무료",
    tagline: "로그인하고 브랜드 레퍼런스 둘러보기",
    cta: "무료로 시작하기",
    features: [
      "로그인 후 브랜드 1개 레퍼런스 열람",
      "콘텐츠 성과 지표 전체 (조회수·참여율·ROAS·매출)",
      "계정 이름 공개 · 콘텐츠 틱톡 열람 가능",
      "인플루언서 DB·브랜드 리포트는 Pro부터",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: wonLabel(testPrice(89_000)),
    priceNote: "/ 월",
    tagline: "마케터를 위한 풀 액세스",
    popular: true,
    cta: "Pro 구독하기",
    features: [
      "결제 즉시 이용 · 매월 자동결제 (언제든 해지)",
      "최대 20개 브랜드 레퍼런스 열람",
      "인플루언서 전체 DB 접근 (성과·컨택)",
      "브랜드 성장 리포트 열람 (PDF 다운로드 제외)",
      "인플루언서 제안 월 30회",
    ],
  },
  {
    id: "enterprise",
    name: "Advance",
    price: "₩159,000",
    priceNote: "/ 월",
    tagline: "에이전시·브랜드를 위한 무제한",
    cta: "Advance 시작하기",
    features: [
      "Pro의 모든 기능 포함",
      "모든 브랜드 무제한 열람",
      "미수록 브랜드 추가 추적 요청 가능",
      "브랜드 리포트 PDF 다운로드",
      "인플루언서 제안 월 무제한 + 동시 제안",
    ],
  },
];

// 브랜드 레퍼런스 열람 한도 (테스트2 BM). 비로그인=1, Basic=3, Pro=20. Advance는 제한 없음.
export const GUEST_BRAND_LIMIT = 1;
export const BASIC_BRAND_LIMIT = 1;
export const PRO_BRAND_LIMIT = 20;
// 브랜드 추가 후 변경(제거) 잠금 시간
export const BRAND_LOCK_HOURS = 24;

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

// K-Trend Analytics — 공통 메타데이터 (국가 / 카테고리 / 콘텐츠 스타일 / 인플루언서 규모)

export interface Country {
  code: string;
  nameEn: string;
  nameKo: string;
  flag: string;
  /** 틱톡 샵 활성화 수준 */
  shopLevel: "매우 높음" | "높음" | "보통";
  focus: string;
}

export const COUNTRIES: Country[] = [
  { code: "US", nameEn: "United States", nameKo: "미국", flag: "🇺🇸", shopLevel: "매우 높음", focus: "선케어, 세럼, 스킨케어 세트" },
  { code: "TH", nameEn: "Thailand", nameKo: "태국", flag: "🇹🇭", shopLevel: "높음", focus: "메이크업, 쿠션, 립케어" },
  { code: "VN", nameEn: "Vietnam", nameKo: "베트남", flag: "🇻🇳", shopLevel: "매우 높음", focus: "미백 스킨케어, 마스크팩, 트러블 케어" },
  { code: "PH", nameEn: "Philippines", nameKo: "필리핀", flag: "🇵🇭", shopLevel: "높음", focus: "선스틱, 클렌징 밤, 올인원" },
  { code: "MY", nameEn: "Malaysia", nameKo: "말레이시아", flag: "🇲🇾", shopLevel: "보통", focus: "수분 크림, 민감성 피부 케어" },
  { code: "SG", nameEn: "Singapore", nameKo: "싱가포르", flag: "🇸🇬", shopLevel: "보통", focus: "안티에이징, 프리미엄 앰플, 립 글로우" },
];

export type CategoryKey = "skincare" | "makeup" | "lipcare" | "suncare" | "mask";

export interface Category {
  key: CategoryKey;
  labelKo: string;
  labelEn: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { key: "skincare", labelKo: "스킨케어", labelEn: "Skincare", emoji: "🧴" },
  { key: "makeup", labelKo: "메이크업", labelEn: "Makeup", emoji: "💄" },
  { key: "lipcare", labelKo: "립케어", labelEn: "Lip Care", emoji: "👄" },
  { key: "suncare", labelKo: "선케어", labelEn: "Sun Care", emoji: "☀️" },
  { key: "mask", labelKo: "마스크팩", labelEn: "Mask", emoji: "🎭" },
];

export type ContentStyle = "Skit" | "GRWM" | "ASMR" | "Review";

export const CONTENT_STYLES: { key: ContentStyle; labelKo: string }[] = [
  { key: "GRWM", labelKo: "GRWM" },
  { key: "Review", labelKo: "리뷰" },
  { key: "ASMR", labelKo: "ASMR" },
  { key: "Skit", labelKo: "스킷" },
];

export type InfluencerTier = "Mega" | "Macro" | "Micro";

export const TIERS: { key: InfluencerTier; labelKo: string; range: string }[] = [
  { key: "Mega", labelKo: "메가", range: "1M+ 팔로워" },
  { key: "Macro", labelKo: "매크로", range: "100K–1M 팔로워" },
  { key: "Micro", labelKo: "마이크로", range: "10K–100K 팔로워" },
];

/** 브랜드 / 아바타 그라데이션 팔레트 (index 기반 결정적 매핑) */
export const GRADIENTS: [string, string][] = [
  ["#fb7185", "#f43f5e"],
  ["#f472b6", "#db2777"],
  ["#c084fc", "#9333ea"],
  ["#818cf8", "#4f46e5"],
  ["#60a5fa", "#2563eb"],
  ["#38bdf8", "#0284c7"],
  ["#2dd4bf", "#0d9488"],
  ["#34d399", "#059669"],
  ["#a3e635", "#65a30d"],
  ["#fbbf24", "#d97706"],
  ["#fb923c", "#ea580c"],
  ["#f87171", "#dc2626"],
];

export function gradientFor(index: number): [string, string] {
  return GRADIENTS[index % GRADIENTS.length];
}

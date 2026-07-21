// 제품 카테고리 확장 택소노미 — 신규(롤백 가능). 기존 meta.ts(3대+9소분류)는 미변경.
// /category 허브 및 향후 제품 분류의 기준. 실 카테고리별 집계는 제품 분류(P1) 후 채워진다.
export interface ProdCategory {
  id: string;
  nameKo: string;
  icon: string;
  subs: string[];
}

export const PRODUCT_TAXONOMY: ProdCategory[] = [
  { id: "skincare", nameKo: "스킨케어", icon: "💧", subs: ["토너·스킨", "에센스·세럼·앰플", "크림·모이스처라이저", "클렌징(폼·오일·워터)", "마스크·팩", "선케어", "스팟·트러블", "아이케어", "미스트"] },
  { id: "makeup", nameKo: "메이크업", icon: "💄", subs: ["베이스(쿠션·파운데이션·프라이머)", "립(틴트·립스틱·밤)", "아이(섀도·라이너·마스카라)", "치크·컨투어", "브로우"] },
  { id: "haircare", nameKo: "헤어케어", icon: "💇", subs: ["샴푸·트리트먼트", "헤어에센스·오일", "스타일링", "두피케어"] },
  { id: "body", nameKo: "바디·퍼스널케어", icon: "🧴", subs: ["바디워시·로션", "핸드·풋", "향(퍼퓸)", "데오"] },
  { id: "inner", nameKo: "이너뷰티", icon: "💊", subs: ["콜라겐", "유산균", "기타 건기식"] },
];

// 가격대 밴드(USD) — 카테고리·제품 필터용.
export const PRICE_BANDS: { label: string; min: number; max: number | null }[] = [
  { label: "~$10", min: 0, max: 10 },
  { label: "$10–25", min: 10, max: 25 },
  { label: "$25–50", min: 25, max: 50 },
  { label: "$50+", min: 50, max: null },
];

// 제품 자동 분류 — 제목 키워드 기반(롤백 가능, 읽기 시 계산). PRODUCT_TAXONOMY category id로 매핑.
// TikTok Shop 제목이 영어 위주라 영문 키워드 중심 + 일부 한글. 매칭 실패 시 "other".

export type CategoryId = "skincare" | "makeup" | "haircare" | "body" | "inner" | "other";

const RULES: { id: Exclude<CategoryId, "other">; kw: RegExp }[] = [
  { id: "makeup", kw: /\b(cushion|foundation|primer|concealer|lip|tint|lipstick|gloss|lip balm|eyeshadow|eye shadow|eyeliner|eye liner|mascara|blush|contour|bronzer|highlighter|brow|eyebrow|makeup|make-up|setting spray)\b|틴트|쿠션|파운데이션|립스틱|마스카라|아이라이너|섀도/i },
  { id: "haircare", kw: /\b(shampoo|conditioner|hair treatment|hair oil|hair essence|hair serum|hair mask|scalp|styling|hair spray|hair loss)\b|샴푸|트리트먼트|헤어|두피/i },
  { id: "inner", kw: /\b(collagen|probiotic|supplement|vitamin|gummies|inner beauty|capsule|tablet)\b|콜라겐|유산균|건기식|이너뷰티/i },
  { id: "body", kw: /\b(body wash|body lotion|body cream|body scrub|hand cream|foot cream|perfume|fragrance|eau de|deodorant|shower)\b|바디|핸드크림|향수|데오/i },
  { id: "skincare", kw: /\b(serum|toner|essence|ampoule|cream|moisturizer|moisturiser|lotion|cleanser|cleansing|cleansing oil|face wash|mask|sheet mask|sunscreen|sun stick|sun cream|spf|acne|spot|eye cream|mist|hydrating|snail|cica|retinol|niacinamide|hyaluronic|collagen cream|pdrn|toner pad|exfoliat|peeling|pore)\b|세럼|토너|에센스|앰플|크림|클렌징|마스크|선크림|선스틱|자외선|미스트|패드/i },
];

export function classifyProduct(title?: string | null): CategoryId {
  const t = (title || "").toLowerCase();
  if (!t) return "other";
  for (const r of RULES) if (r.kw.test(t)) return r.id;
  return "other";
}

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  skincare: "스킨케어", makeup: "메이크업", haircare: "헤어케어", body: "바디·퍼스널케어", inner: "이너뷰티", other: "기타",
};
export const CATEGORY_ICON: Record<CategoryId, string> = {
  skincare: "💧", makeup: "💄", haircare: "💇", body: "🧴", inner: "💊", other: "📦",
};

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

// ── 서브카테고리(세분화) — 대분류 위 추가 레이어. 기존 CategoryId 흐름 미변경(비파괴) ──
// 규칙은 구체적→일반 순으로 평가(먼저 매칭되는 것 채택). 실패 시 <parent>_etc 폴백.
export type SubCategoryId =
  | "toner" | "serum" | "cream" | "cleanser" | "maskpack" | "suncare" | "eyecare" | "skincare_etc"
  | "base" | "lip" | "eye" | "cheek" | "makeup_etc"
  | "shampoo" | "hair_treatment" | "hair_styling" | "scalp" | "haircare_etc"
  | "body_wash" | "body_lotion" | "hand_foot" | "fragrance" | "body_etc"
  | "collagen" | "probiotic" | "vitamin" | "inner_etc"
  | "other";

// parent별 서브 규칙(순서 중요). etc는 규칙 없이 폴백으로 부여.
const SUB_RULES: Record<Exclude<CategoryId, "other">, { id: SubCategoryId; kw: RegExp }[]> = {
  skincare: [
    { id: "suncare", kw: /\b(sunscreen|sun stick|sun cream|sun serum|sunblock|spf|uv|자외선)\b|선크림|선스틱|선세럼|선블록/i },
    { id: "cleanser", kw: /\b(cleanser|cleansing|cleansing oil|cleansing balm|face wash|foam|micellar|makeup remover)\b|클렌징|클렌저|폼|워시|리무버/i },
    { id: "maskpack", kw: /\b(sheet mask|face mask|mask pack|sleeping mask|toner pad|pad|patch)\b|마스크팩|시트마스크|슬리핑팩|패드|패치/i },
    { id: "eyecare", kw: /\b(eye cream|eye serum|eye patch|eye gel)\b|아이크림|아이세럼|눈가/i },
    { id: "serum", kw: /\b(serum|ampoule|essence|booster)\b|세럼|앰플|에센스|부스터/i },
    { id: "toner", kw: /\b(toner|skin|astringent|softener)\b|토너|스킨|화장수/i },
    { id: "cream", kw: /\b(cream|moisturizer|moisturiser|lotion|gel|emulsion|balm|mist)\b|크림|로션|모이스처|수분|미스트|밤/i },
  ],
  makeup: [
    { id: "lip", kw: /\b(lip|tint|lipstick|gloss|lip balm|lip mask|lip oil)\b|립|틴트|립스틱|글로스/i },
    { id: "eye", kw: /\b(eyeshadow|eye shadow|eyeliner|eye liner|mascara|brow|eyebrow|lash)\b|아이|섀도|라이너|마스카라|브로우/i },
    { id: "cheek", kw: /\b(blush|cheek|contour|bronzer|highlighter|shading)\b|블러셔|치크|컨투어|하이라이터|쉐딩/i },
    { id: "base", kw: /\b(cushion|foundation|primer|concealer|bb|cc|base|powder|setting spray|tone up)\b|쿠션|파운데이션|프라이머|컨실러|베이스|파우더|톤업/i },
  ],
  haircare: [
    { id: "scalp", kw: /\b(scalp|hair loss|anti-hair|hair growth|tonic)\b|두피|탈모|토닉/i },
    { id: "hair_styling", kw: /\b(styling|hair spray|wax|pomade|gel|hair mist|heat protect)\b|스타일링|스프레이|왁스|포마드/i },
    { id: "hair_treatment", kw: /\b(treatment|hair mask|hair oil|hair essence|hair serum|ampoule|leave-in)\b|트리트먼트|헤어마스크|헤어오일|헤어에센스|헤어앰플/i },
    { id: "shampoo", kw: /\b(shampoo|conditioner|rinse|cleanser)\b|샴푸|컨디셔너|린스/i },
  ],
  body: [
    { id: "fragrance", kw: /\b(perfume|fragrance|eau de|cologne|deodorant|body mist)\b|향수|퍼퓸|데오|바디미스트/i },
    { id: "hand_foot", kw: /\b(hand cream|hand|foot cream|foot|nail|cuticle)\b|핸드크림|핸드|풋크림|풋|네일/i },
    { id: "body_wash", kw: /\b(body wash|shower|soap|scrub|bath|cleanser)\b|바디워시|샤워|비누|스크럽|입욕/i },
    { id: "body_lotion", kw: /\b(body lotion|body cream|body oil|body butter|body serum|lotion)\b|바디로션|바디크림|바디오일/i },
  ],
  inner: [
    { id: "collagen", kw: /\b(collagen)\b|콜라겐/i },
    { id: "probiotic", kw: /\b(probiotic|lactobacillus|gut|prebiotic)\b|유산균|프로바이오틱|장/i },
    { id: "vitamin", kw: /\b(vitamin|supplement|gummies|capsule|tablet|omega|zinc|biotin)\b|비타민|보충제|영양제|캡슐|정/i },
  ],
};

const SUB_ETC: Record<Exclude<CategoryId, "other">, SubCategoryId> = {
  skincare: "skincare_etc", makeup: "makeup_etc", haircare: "haircare_etc", body: "body_etc", inner: "inner_etc",
};

export function subClassifyProduct(title?: string | null, parent?: CategoryId): { parent: CategoryId; sub: SubCategoryId } {
  const p = parent ?? classifyProduct(title);
  if (p === "other") return { parent: "other", sub: "other" };
  const t = (title || "").toLowerCase();
  for (const r of SUB_RULES[p]) if (r.kw.test(t)) return { parent: p, sub: r.id };
  return { parent: p, sub: SUB_ETC[p] };
}

export const SUBCATEGORY_LABEL: Record<SubCategoryId, string> = {
  toner: "토너·스킨", serum: "세럼·앰플·에센스", cream: "크림·로션", cleanser: "클렌징", maskpack: "마스크팩·패드", suncare: "선케어", eyecare: "아이케어", skincare_etc: "스킨케어 기타",
  base: "베이스·쿠션", lip: "립", eye: "아이", cheek: "치크·컨투어", makeup_etc: "메이크업 기타",
  shampoo: "샴푸·컨디셔너", hair_treatment: "트리트먼트·헤어케어", hair_styling: "스타일링", scalp: "두피·탈모", haircare_etc: "헤어 기타",
  body_wash: "바디워시·샤워", body_lotion: "바디로션·크림", hand_foot: "핸드·풋", fragrance: "향수·데오", body_etc: "바디 기타",
  collagen: "콜라겐", probiotic: "유산균", vitamin: "비타민·보충제", inner_etc: "이너뷰티 기타",
  other: "기타",
};

// 대분류 → 하위 서브 목록(필터 UI용, etc 포함).
export const SUBS_BY_PARENT: Record<CategoryId, SubCategoryId[]> = {
  skincare: ["toner", "serum", "cream", "cleanser", "maskpack", "suncare", "eyecare", "skincare_etc"],
  makeup: ["base", "lip", "eye", "cheek", "makeup_etc"],
  haircare: ["shampoo", "hair_treatment", "hair_styling", "scalp", "haircare_etc"],
  body: ["body_wash", "body_lotion", "hand_foot", "fragrance", "body_etc"],
  inner: ["collagen", "probiotic", "vitamin", "inner_etc"],
  other: ["other"],
};

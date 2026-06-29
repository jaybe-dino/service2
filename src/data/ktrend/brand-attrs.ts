// 브랜드 필터 속성 (출처: GloveK 브랜드 분류 시트, 110개). 아이콘 제외.
// 4개 facet: ① 제품 카테고리 · ② 브랜드 규모 · ③ 마케팅 포지셔닝 · ⑤ 번들 전략
// (④ 틱톡 성숙도 · ⑥ 인기 국가는 제외)
export type ProductCat = "멀티" | "스킨케어" | "색조" | "더마·클리니컬" | "헤어·바디";
export type BrandScale = "메가" | "미들" | "인디";
export type Positioning = "오리진 스토리" | "매스 프레스티지" | "아이덴티티 익스프레션" | "메디컬 오소리티" | "이노베이션 테크" | "클린 컨셔스";
export type BundleStrategy = "시즌·테마" | "루틴세트" | "미니·트라이얼" | "단품 위주";

export interface BrandAttrs {
  productCat: ProductCat | null;
  scale: BrandScale | null;
  positioning: Positioning | null;
  bundle: BundleStrategy | null;
}

export const PRODUCT_CATS: ProductCat[] = ["멀티", "스킨케어", "색조", "더마·클리니컬", "헤어·바디"];
export const BRAND_SCALES: BrandScale[] = ["메가", "미들", "인디"];
export const POSITIONINGS: Positioning[] = ["오리진 스토리", "매스 프레스티지", "아이덴티티 익스프레션", "메디컬 오소리티", "이노베이션 테크", "클린 컨셔스"];
export const BUNDLE_STRATEGIES: BundleStrategy[] = ["시즌·테마", "루틴세트", "미니·트라이얼", "단품 위주"];

// UI 필터 렌더용 facet 메타
export const BRAND_FACETS = [
  { key: "productCat", label: "제품 카테고리", values: PRODUCT_CATS },
  { key: "scale", label: "브랜드 규모", values: BRAND_SCALES },
  { key: "positioning", label: "마케팅 포지셔닝", values: POSITIONINGS },
  { key: "bundle", label: "번들 전략", values: BUNDLE_STRATEGIES },
] as const;
export type BrandFacetKey = (typeof BRAND_FACETS)[number]["key"];

export const normBrandKey = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// 시트 기반 정적 매핑 (브랜드명 정규화 키 → 속성)
const RAW: Record<string, BrandAttrs> = {
  "innisfree": { productCat: "멀티", scale: "메가", positioning: "오리진 스토리", bundle: "시즌·테마" },
  "laneige": { productCat: "스킨케어", scale: "메가", positioning: "매스 프레스티지", bundle: "시즌·테마" },
  "sulwhasoo": { productCat: "스킨케어", scale: "메가", positioning: "오리진 스토리", bundle: "루틴세트" },
  "thefaceshop": { productCat: "멀티", scale: "메가", positioning: "매스 프레스티지", bundle: "시즌·테마" },
  "etudehouse": { productCat: "색조", scale: "메가", positioning: "매스 프레스티지", bundle: "미니·트라이얼" },
  "hera": { productCat: "색조", scale: "메가", positioning: "아이덴티티 익스프레션", bundle: "시즌·테마" },
  "iope": { productCat: "더마·클리니컬", scale: "메가", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "mamonde": { productCat: "스킨케어", scale: "메가", positioning: "매스 프레스티지", bundle: "시즌·테마" },
  "missha": { productCat: "멀티", scale: "메가", positioning: "매스 프레스티지", bundle: "루틴세트" },
  "holikaholika": { productCat: "멀티", scale: "메가", positioning: "매스 프레스티지", bundle: "미니·트라이얼" },
  "naturerepublic": { productCat: "스킨케어", scale: "메가", positioning: "오리진 스토리", bundle: "시즌·테마" },
  "skinfood": { productCat: "멀티", scale: "메가", positioning: "오리진 스토리", bundle: "시즌·테마" },
  "tonymoly": { productCat: "멀티", scale: "메가", positioning: "매스 프레스티지", bundle: "미니·트라이얼" },
  "ryo": { productCat: "헤어·바디", scale: "미들", positioning: "오리진 스토리", bundle: "루틴세트" },
  "anua": { productCat: "스킨케어", scale: "미들", positioning: "오리진 스토리", bundle: "루틴세트" },
  "biodance": { productCat: "스킨케어", scale: "인디", positioning: "이노베이션 테크", bundle: "미니·트라이얼" },
  "numbuzin": { productCat: "스킨케어", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "tocobo": { productCat: "스킨케어", scale: "인디", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "mixsoon": { productCat: "스킨케어", scale: "인디", positioning: "이노베이션 테크", bundle: "단품 위주" },
  "barulab": { productCat: "더마·클리니컬", scale: "인디", positioning: "메디컬 오소리티", bundle: "미니·트라이얼" },
  "chasinrabbits": { productCat: "스킨케어", scale: "인디", positioning: "클린 컨셔스", bundle: "단품 위주" },
  "bonajour": { productCat: "스킨케어", scale: "인디", positioning: "클린 컨셔스", bundle: "단품 위주" },
  "heveblue": { productCat: "더마·클리니컬", scale: "인디", positioning: "메디컬 오소리티", bundle: "단품 위주" },
  "celimax": { productCat: "스킨케어", scale: "인디", positioning: "오리진 스토리", bundle: "미니·트라이얼" },
  "fwee": { productCat: "색조", scale: "인디", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "laka": { productCat: "색조", scale: "인디", positioning: "클린 컨셔스", bundle: "단품 위주" },
  "eqqualberry": { productCat: "스킨케어", scale: "인디", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "cosdebaha": { productCat: "스킨케어", scale: "인디", positioning: "이노베이션 테크", bundle: "미니·트라이얼" },
  "sioris": { productCat: "스킨케어", scale: "인디", positioning: "클린 컨셔스", bundle: "단품 위주" },
  "jumiso": { productCat: "스킨케어", scale: "인디", positioning: "이노베이션 테크", bundle: "미니·트라이얼" },
  "benton": { productCat: "스킨케어", scale: "인디", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "romnd": { productCat: "색조", scale: "미들", positioning: "아이덴티티 익스프레션", bundle: "미니·트라이얼" },
  "banilaco": { productCat: "색조", scale: "미들", positioning: "아이덴티티 익스프레션", bundle: "미니·트라이얼" },
  "milktouch": { productCat: "색조", scale: "인디", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "tirtir": { productCat: "더마·클리니컬", scale: "미들", positioning: "이노베이션 테크", bundle: "미니·트라이얼" },
  "sungbooneditor": { productCat: "색조", scale: "인디", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "kaja": { productCat: "색조", scale: "미들", positioning: "아이덴티티 익스프레션", bundle: "미니·트라이얼" },
  "hince": { productCat: "색조", scale: "미들", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "espoir": { productCat: "색조", scale: "미들", positioning: "아이덴티티 익스프레션", bundle: "미니·트라이얼" },
  "unleashia": { productCat: "색조", scale: "인디", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "amuse": { productCat: "색조", scale: "미들", positioning: "클린 컨셔스", bundle: "미니·트라이얼" },
  "lilybyred": { productCat: "색조", scale: "미들", positioning: "아이덴티티 익스프레션", bundle: "미니·트라이얼" },
  "bbia": { productCat: "색조", scale: "인디", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "merzy": { productCat: "색조", scale: "인디", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "colorgram": { productCat: "색조", scale: "인디", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "dasique": { productCat: "색조", scale: "미들", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "peripera": { productCat: "색조", scale: "미들", positioning: "아이덴티티 익스프레션", bundle: "미니·트라이얼" },
  "clio": { productCat: "색조", scale: "미들", positioning: "매스 프레스티지", bundle: "미니·트라이얼" },
  "cosrx": { productCat: "스킨케어", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "centellian24": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "drjart": { productCat: "더마·클리니컬", scale: "메가", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "mediheal": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "medicube": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "isntree": { productCat: "스킨케어", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "roundlab": { productCat: "스킨케어", scale: "미들", positioning: "오리진 스토리", bundle: "루틴세트" },
  "purito": { productCat: "스킨케어", scale: "미들", positioning: "클린 컨셔스", bundle: "루틴세트" },
  "goodal": { productCat: "스킨케어", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "skinlab": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "cnplaboratory": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "dermatory": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "dralthea": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "aestura": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "neogendermalogy": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "pyunkangyul": { productCat: "스킨케어", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "rovectin": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "bywishtrend": { productCat: "스킨케어", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "axisy": { productCat: "스킨케어", scale: "인디", positioning: "클린 컨셔스", bundle: "루틴세트" },
  "dewytree": { productCat: "스킨케어", scale: "인디", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "heimish": { productCat: "스킨케어", scale: "인디", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "seoulceuticals": { productCat: "더마·클리니컬", scale: "인디", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "neogen": { productCat: "스킨케어", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "drg": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "easydew": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "acwell": { productCat: "스킨케어", scale: "인디", positioning: "이노베이션 테크", bundle: "미니·트라이얼" },
  "peachlily": { productCat: "스킨케어", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "huxley": { productCat: "스킨케어", scale: "미들", positioning: "오리진 스토리", bundle: "시즌·테마" },
  "imfrom": { productCat: "스킨케어", scale: "미들", positioning: "오리진 스토리", bundle: "루틴세트" },
  "glowrecipe": { productCat: "스킨케어", scale: "미들", positioning: "오리진 스토리", bundle: "루틴세트" },
  "klairs": { productCat: "스킨케어", scale: "미들", positioning: "클린 컨셔스", bundle: "루틴세트" },
  "belif": { productCat: "스킨케어", scale: "미들", positioning: "오리진 스토리", bundle: "시즌·테마" },
  "dalba": { productCat: "스킨케어", scale: "미들", positioning: "오리진 스토리", bundle: "루틴세트" },
  "aromatica": { productCat: "스킨케어", scale: "미들", positioning: "클린 컨셔스", bundle: "루틴세트" },
  "blancnature": { productCat: "스킨케어", scale: "인디", positioning: "클린 컨셔스", bundle: "단품 위주" },
  "hanyul": { productCat: "스킨케어", scale: "미들", positioning: "오리진 스토리", bundle: "시즌·테마" },
  "graymelin": { productCat: "스킨케어", scale: "인디", positioning: "이노베이션 테크", bundle: "미니·트라이얼" },
  "kerasys": { productCat: "헤어·바디", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "moremo": { productCat: "헤어·바디", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "masil": { productCat: "헤어·바디", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "lador": { productCat: "헤어·바디", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "daenggimeori": { productCat: "헤어·바디", scale: "미들", positioning: "오리진 스토리", bundle: "루틴세트" },
  "miseenscene": { productCat: "헤어·바디", scale: "메가", positioning: "매스 프레스티지", bundle: "시즌·테마" },
  "amosprofessional": { productCat: "헤어·바디", scale: "미들", positioning: "오리진 스토리", bundle: "루틴세트" },
  "lbb": { productCat: "색조", scale: "인디", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "ndp": { productCat: "더마·클리니컬", scale: "인디", positioning: "메디컬 오소리티", bundle: "단품 위주" },
  "skin1004": { productCat: "스킨케어", scale: "미들", positioning: "오리진 스토리", bundle: "루틴세트" },
  "elizavecca": { productCat: "스킨케어", scale: "미들", positioning: "아이덴티티 익스프레션", bundle: "미니·트라이얼" },
  "haruharuwonder": { productCat: "스킨케어", scale: "미들", positioning: "오리진 스토리", bundle: "루틴세트" },
  "vitabridc12": { productCat: "더마·클리니컬", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "drgroot": { productCat: "헤어·바디", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "grafen": { productCat: "스킨케어", scale: "인디", positioning: "이노베이션 테크", bundle: "단품 위주" },
  "velyvely": { productCat: "스킨케어", scale: "인디", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "vtcosmetics": { productCat: "더마·클리니컬", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "torriden": { productCat: "스킨케어", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "dermallmatrix": { productCat: "더마·클리니컬", scale: "인디", positioning: "메디컬 오소리티", bundle: "단품 위주" },
  "brmud": { productCat: "스킨케어", scale: "인디", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "abib": { productCat: "스킨케어", scale: "미들", positioning: "이노베이션 테크", bundle: "루틴세트" },
  "manyo": { productCat: "스킨케어", scale: "미들", positioning: "오리진 스토리", bundle: "루틴세트" },
  "jmsolution": { productCat: "더마·클리니컬", scale: "미들", positioning: "메디컬 오소리티", bundle: "루틴세트" },
  "blab": { productCat: "스킨케어", scale: "인디", positioning: "아이덴티티 익스프레션", bundle: "단품 위주" },
  "houseofhur": { productCat: "스킨케어", scale: "미들", positioning: "오리진 스토리", bundle: "시즌·테마" },
};

export const BRAND_ATTRS: Record<string, BrandAttrs> = RAW;

// 신규(크롤링) 브랜드 자동 분류.
// 시트에 있으면 그 값을, 없으면 대분류(category) 기반으로 제품 카테고리만 추정하고
// 나머지는 미분류(null)로 둔다. ⚠️ AI 분류 연동 지점: 이 폴백을 LLM 호출로 교체하면
// 신규 수집 브랜드의 규모/포지셔닝/번들까지 자동 채울 수 있다.
export function classifyBrandAttrs(name: string, categoryId?: string): BrandAttrs {
  const hit = BRAND_ATTRS[normBrandKey(name)];
  if (hit) return hit;
  const productCat: ProductCat | null =
    categoryId === "makeup" ? "색조" : categoryId === "haircare" ? "헤어·바디" : categoryId === "skincare" ? "스킨케어" : null;
  return { productCat, scale: null, positioning: null, bundle: null };
}

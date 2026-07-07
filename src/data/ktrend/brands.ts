// 실제 K-뷰티 브랜드 DB (출처: brands_1to100_MASTER.xlsx, 98개 브랜드)
// + 확장 브랜드 마스터 (출처: K-뷰티 422 브랜드 리스트, 신규 376개) — 수집 1차학습 대상
import raw from "./real-brands.json";
import collectMaster from "./collect-brands.json";
import seedBrandCat from "./seed-brand-category.json";
import type { CategoryId, SubCategoryId } from "./meta";
import { classifyBrandAttrs, type BrandAttrs } from "./brand-attrs";

// 브랜드 철자 정규화 키(소문자 + 영숫자만) — 철자/문장부호/대소문자 변형을 하나로 통합.
// 예: "Dr. G"=="Dr.G", "Mary & May"=="Mary&May", "TONYMOLY"=="Tony Moly", "SU:M37°"=="Sum37".
export function normKey(name: string): string {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// 수집 브랜드 카테고리 오버라이드(정규화 키 → skincare|makeup|haircare).
// 정적 시드에 없는 신규 브랜드가 올바른 카테고리로 등록되도록(태국·베트남 데이터의 메이크업/헤어케어).
const CAT_OVERRIDE: Record<string, CategoryId> = Object.fromEntries(
  Object.entries(seedBrandCat as Record<string, string>).map(([k, v]) => [normKey(k), v as CategoryId]),
);

export interface Brand {
  id: string;
  name: string;
  az: string; // A-Z 퀵 탭 키
  category: CategoryId;
  subCategory: SubCategoryId; // 세부 카테고리
  attrs: BrandAttrs; // 필터 속성(제품 카테고리·규모·포지셔닝·번들) — 시트/AI 분류
  rank: number;
  videos: number;
  influencers: number;
  totalViews: number;
  avgViews: number;
  maxViews: number;
  adCount: number;
  shopCount: number;
  shopRatio: number; // %
}

// 브랜드명 → 세부 카테고리 (도메인 지식 기반 큐레이션). 미지정은 대분류에서 폴백.
const SUB_BY_NAME: Record<string, SubCategoryId> = {
  // 더마·진정
  "Dr. Althea": "derma", "Dr. Jart+": "derma", "Dr. G": "derma", "CNP Laboratory": "derma",
  Aestura: "derma", Centellian24: "derma", SKIN1004: "derma", "Pyunkang Yul": "derma",
  Rovectin: "derma", "Skin & Lab": "derma", Anua: "derma", Purito: "derma", Klairs: "derma",
  Benton: "derma", "Mary & May": "derma", "Some By Mi": "derma", Numbuzin: "derma",
  Torriden: "derma", Isntree: "derma", Kaine: "derma", "Axis-Y": "derma", "Haruharu Wonder": "derma",
  iUNIK: "derma", Sioris: "derma", Nacific: "derma", "Vitabrid C12": "derma",
  // 선케어
  Tocobo: "suncare", "Round Lab": "suncare", Bonajour: "suncare",
  // 클렌징
  Mixsoon: "cleansing", "Sungboon Editor": "cleansing", "Ma:nyo": "cleansing",
  // 마스크·팩
  Mediheal: "mask", "JM Solution": "mask", Biodance: "mask", Dewytree: "mask", Abib: "mask", Barulab: "mask",
  // 메이크업
  TirTir: "makeup", Clio: "makeup", Espoir: "makeup", IOPE: "makeup", Hince: "makeup",
  Unleashia: "makeup", "Holika Holika": "makeup", "Vely Vely": "makeup", "Chasin Rabbits": "makeup",
  Laka: "makeup", Hera: "makeup", Graymelin: "makeup", "House of Hur": "makeup",
  // 립
  "Rom&nd": "lip", Peripera: "lip", Bbia: "lip", Merzy: "lip", Dasique: "lip", Lilybyred: "lip",
  Colorgram: "lip", "3CE": "lip", Fwee: "lip", Kaja: "lip", Amuse: "lip", "Milk Touch": "lip",
  // 헤어케어
  Kerasys: "hair", "Dr. Groot": "hair", Ryo: "hair", Masil: "hair", "Mise en Scene": "hair",
  "Amos Professional": "hair", Lador: "hair", Moremo: "hair", "Daeng Gi Meo Ri": "hair", Grafen: "hair",
  // 바디케어
  Aromatica: "body",
};

function subFallback(cat: CategoryId): SubCategoryId {
  if (cat === "makeup") return "makeup";
  if (cat === "haircare") return "hair";
  return "skincare";
}

function slugId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "brand";
}
function azKey(name: string): string {
  return /^[A-Za-z]/.test(name) ? name[0].toUpperCase() : "#";
}

const seedBrands: Brand[] = (raw as Omit<Brand, "subCategory" | "attrs">[])
  .slice()
  .sort((a, b) => a.rank - b.rank)
  .map((b) => ({ ...b, subCategory: SUB_BY_NAME[b.name] ?? subFallback(b.category), attrs: classifyBrandAttrs(b.name, b.category) }));

// 확장 마스터의 신규 브랜드(서비스 미수록분)를 디렉터리에 합류.
// 콘텐츠 통계는 0에서 시작 → 수집 1차학습 후 loadContent가 실수치로 갱신.
type MasterRow = { name: string; category: CategoryId; subCategory: SubCategoryId; isNew: boolean };
const seedNorm = new Set(seedBrands.map((b) => normKey(b.name)));
const extraSeen = new Set<string>();
const extraBrands: Brand[] = (collectMaster as MasterRow[])
  .filter((m) => {
    const k = normKey(m.name);
    if (!m.isNew || !k || seedNorm.has(k) || extraSeen.has(k)) return false; // 기존·내부 중복 제거
    extraSeen.add(k);
    return true;
  })
  .map((m, i) => ({
    id: `m-${slugId(m.name)}`,
    name: m.name,
    az: azKey(m.name),
    category: m.category,
    subCategory: m.subCategory,
    attrs: classifyBrandAttrs(m.name, m.category),
    rank: 1000 + i,
    videos: 0,
    influencers: 0,
    totalViews: 0,
    avgViews: 0,
    maxViews: 0,
    adCount: 0,
    shopCount: 0,
    shopRatio: 0,
  }));

export const BRANDS: Brand[] = [...seedBrands, ...extraBrands];

export const BRAND_MAP: Record<string, Brand> = Object.fromEntries(
  BRANDS.map((b) => [b.id, b]),
);

// 브랜드명(정규화) → Brand. 수집 데이터(DB)는 brand_name으로 참조되므로 이름 기준 룩업 필요.
export const BRAND_BY_NAME: Record<string, Brand> = Object.fromEntries(
  BRANDS.map((b) => [b.name.toLowerCase(), b]),
);

// 철자 정규화 룩업 — 같은 브랜드의 다른 표기를 통합. 먼저 등록된(정적 시드) 표기가 캐논.
export const BRAND_BY_NORM: Record<string, Brand> = {};
for (const b of BRANDS) {
  const nk = normKey(b.name);
  if (nk && !(nk in BRAND_BY_NORM)) BRAND_BY_NORM[nk] = b;
}

let dynSeq = 0;

// 정적 시드에 없는, 수집으로 새로 발굴된 브랜드를 런타임 등록.
// (BRANDS/BRAND_MAP/BRAND_BY_NAME에 합류시켜 리스트·필터·상세가 함께 동작)
export function ensureBrandByName(name: string): Brand {
  const key = name.trim().toLowerCase();
  const existing = BRAND_BY_NAME[key];
  if (existing) return existing;
  // 철자 변형 통합: 정규화 키로 기존 브랜드와 매칭되면 그 브랜드로 합류(별도 신규 생성 안 함).
  const nk = normKey(name);
  const normHit = BRAND_BY_NORM[nk];
  if (normHit) { BRAND_BY_NAME[key] = normHit; return normHit; }
  const category: CategoryId = CAT_OVERRIDE[nk] ?? "skincare"; // 오버라이드 우선, 없으면 스킨케어
  const subCategory: SubCategoryId = SUB_BY_NAME[name] ?? subFallback(category);
  const az = /^[A-Za-z]/.test(name) ? name[0].toUpperCase() : "#";
  const brand: Brand = {
    id: `db-${++dynSeq}-${key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "brand"}`,
    name,
    az,
    category,
    subCategory,
    attrs: classifyBrandAttrs(name, category),
    rank: 1000 + dynSeq,
    videos: 0,
    influencers: 0,
    totalViews: 0,
    avgViews: 0,
    maxViews: 0,
    adCount: 0,
    shopCount: 0,
    shopRatio: 0,
  };
  BRANDS.push(brand);
  BRAND_MAP[brand.id] = brand;
  BRAND_BY_NAME[key] = brand;
  if (nk && !(nk in BRAND_BY_NORM)) BRAND_BY_NORM[nk] = brand; // 이후 철자 변형이 이 브랜드로 통합되도록
  if (!BRAND_AZ_KEYS.includes(az)) BRAND_AZ_KEYS.push(az);
  return brand;
}

export const BRAND_AZ_KEYS: string[] = Array.from(new Set(BRANDS.map((b) => b.az))).sort(
  (a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)),
);

export const POPULAR_BRAND_IDS: string[] = BRANDS.slice(0, 5).map((b) => b.id);

export function isPopular(id: string): boolean {
  return POPULAR_BRAND_IDS.includes(id);
}

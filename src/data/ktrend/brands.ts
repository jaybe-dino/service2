// 실제 K-뷰티 브랜드 DB (출처: brands_1to100_MASTER.xlsx, 98개 브랜드)
import raw from "./real-brands.json";
import type { CategoryId, SubCategoryId } from "./meta";

export interface Brand {
  id: string;
  name: string;
  az: string; // A-Z 퀵 탭 키
  category: CategoryId;
  subCategory: SubCategoryId; // 세부 카테고리
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

export const BRANDS: Brand[] = (raw as Omit<Brand, "subCategory">[])
  .slice()
  .sort((a, b) => a.rank - b.rank)
  .map((b) => ({ ...b, subCategory: SUB_BY_NAME[b.name] ?? subFallback(b.category) }));

export const BRAND_MAP: Record<string, Brand> = Object.fromEntries(
  BRANDS.map((b) => [b.id, b]),
);

export const BRAND_AZ_KEYS: string[] = Array.from(new Set(BRANDS.map((b) => b.az))).sort(
  (a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)),
);

export const POPULAR_BRAND_IDS: string[] = BRANDS.slice(0, 5).map((b) => b.id);

export function isPopular(id: string): boolean {
  return POPULAR_BRAND_IDS.includes(id);
}

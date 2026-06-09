// 실제 K-뷰티 브랜드 DB (출처: brands_1to100_MASTER.xlsx, 98개 브랜드)
import raw from "./real-brands.json";
import type { CategoryId } from "./meta";

export interface Brand {
  id: string;
  name: string;
  az: string; // A-Z 퀵 탭 키
  category: CategoryId;
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

export const BRANDS: Brand[] = (raw as Brand[]).slice().sort((a, b) => a.rank - b.rank);

export const BRAND_MAP: Record<string, Brand> = Object.fromEntries(
  BRANDS.map((b) => [b.id, b]),
);

// A-Z 퀵 탭에 노출할 키 목록 (실제 데이터가 있는 글자만)
export const BRAND_AZ_KEYS: string[] = Array.from(new Set(BRANDS.map((b) => b.az))).sort(
  (a, b) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b)),
);

// 상위 랭크 브랜드 (Basic 플랜 노출 / featured)
export const POPULAR_BRAND_IDS: string[] = BRANDS.slice(0, 5).map((b) => b.id);

export function isPopular(id: string): boolean {
  return POPULAR_BRAND_IDS.includes(id);
}

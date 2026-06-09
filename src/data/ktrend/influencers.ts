// 실제 틱톡 어필리에이트 크리에이터 DB (상위 600명, 총 조회수 기준)
// 출처: brands_1to100_MASTER.xlsx — 팔로워 부재로 티어는 평균 조회수 기반 산출.
import raw from "./real-influencers.json";
import type { InfluencerTier } from "./meta";

export interface Influencer {
  handle: string;
  tier: InfluencerTier;
  videos: number;
  totalViews: number;
  avgViews: number;
  brands: string[]; // 협업 브랜드명 목록
}

export const INFLUENCERS: Influencer[] = raw as Influencer[];

export const INFLUENCER_MAP: Record<string, Influencer> = Object.fromEntries(
  INFLUENCERS.map((i) => [i.handle, i]),
);

// Add-on(컨택 라인) 결제 시 해금되는 정보 — 데모용 결정론적 생성
export function contactFor(handle: string): { email: string; whatsapp: string; avgRateUSD: number } {
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) & 0xffffff;
  return {
    email: `${handle}@creators.tiktokone.io`,
    whatsapp: `+1 ${200 + (h % 700)} ${1000 + (h % 9000)}`,
    avgRateUSD: 250 + (h % 12) * 180,
  };
}

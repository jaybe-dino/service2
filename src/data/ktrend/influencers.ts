// 검증된 글로벌 틱톡 어필리에이트 크리에이터 DB (v6.0)
import type { ContentStyle, CountryCode, InfluencerTier } from "./meta";

export interface Influencer {
  id: string;
  handle: string; // @handle
  name: string;
  tier: InfluencerTier;
  country: CountryCode;
  followers: number; // 명
  avgViews: number; // 평균 조회수
  contributedRevenueUSD: number; // 누적 기여 매출
  authenticity: number; // 진정성 지수 0-100
  styles: ContentStyle[];
  demographics: { female: number; ageCore: string }; // 시청자 인구통계 요약
  // Add-on(컨택 라인) 결제 시 해금되는 정보 — 기본은 잠금
  contact: { email: string; whatsapp: string; avgRateUSD: number };
}

const SEED: Array<
  [string, string, InfluencerTier, CountryCode, number, ContentStyle[]]
> = [
  ["glowwithava", "Ava Rodriguez", "mega", "US", 2_400_000, ["review", "grwm"]],
  ["skinwithmin", "Min Park", "macro", "US", 680_000, ["review", "asmr"]],
  ["bkkbeautybabe", "Ploy Sirikul", "mega", "TH", 1_350_000, ["grwm", "haul"]],
  ["dermdiary", "Dr. Hana Lee", "macro", "US", 410_000, ["review", "tutorial"]],
  ["saigonglow", "Linh Nguyen", "macro", "VN", 520_000, ["review", "skit"]],
  ["manilamatte", "Bea Santos", "macro", "PH", 360_000, ["grwm", "tutorial"]],
  ["kllglowup", "Aisha Rahman", "micro", "MY", 78_000, ["review", "haul"]],
  ["sgskinfile", "Rachel Tan", "micro", "SG", 54_000, ["review", "asmr"]],
  ["tiktokcushion", "Maya Cruz", "macro", "PH", 290_000, ["grwm", "review"]],
  ["seoulsunny", "Sunny Cho", "mega", "US", 1_120_000, ["haul", "grwm"]],
  ["acneslayer", "Trang Vo", "micro", "VN", 92_000, ["review", "skit"]],
  ["bangkokbarrier", "Nan Phong", "micro", "TH", 61_000, ["asmr", "review"]],
  ["glassskinguru", "Chloe Kim", "macro", "US", 740_000, ["tutorial", "review"]],
  ["mukimuki", "Putri Sari", "micro", "MY", 44_000, ["grwm", "haul"]],
  ["lipfirstph", "Joy Reyes", "macro", "PH", 330_000, ["grwm", "tutorial"]],
  ["serumscience", "Dr. Owen Wells", "mega", "US", 1_680_000, ["review", "tutorial"]],
  ["dewydani", "Dani Pham", "micro", "VN", 88_000, ["grwm", "review"]],
  ["sgslowbeauty", "Felicia Ong", "micro", "SG", 39_000, ["asmr", "review"]],
  ["thaitoneup", "Mook Chai", "macro", "TH", 470_000, ["grwm", "haul"]],
  ["kbeautykate", "Kate Miller", "mega", "US", 2_050_000, ["review", "haul"]],
  ["porelessploy", "Ploy Kanya", "micro", "TH", 67_000, ["review", "asmr"]],
  ["mylittlemask", "Sofia Reyes", "macro", "PH", 240_000, ["asmr", "tutorial"]],
  ["halalglow", "Nurul Izzah", "macro", "MY", 180_000, ["review", "grwm"]],
  ["nightroutinenyc", "Emma Stone", "macro", "US", 560_000, ["asmr", "tutorial"]],
];

const tierMultiplier: Record<InfluencerTier, number> = { mega: 1, macro: 0.22, micro: 0.09 };

export const INFLUENCERS: Influencer[] = SEED.map(
  ([handle, name, tier, country, followers, styles], i) => {
    const avgViews = Math.round(followers * (0.35 + ((i % 5) * 0.05)));
    const contributedRevenueUSD = Math.round(
      followers * tierMultiplier[tier] * (12 + (i % 7)),
    );
    return {
      id: handle,
      handle,
      name,
      tier,
      country,
      followers,
      avgViews,
      contributedRevenueUSD,
      authenticity: 78 + ((i * 7) % 21), // 78–98
      styles,
      demographics: {
        female: 62 + ((i * 3) % 30), // 62–91%
        ageCore: ["18–24", "18–24", "25–34", "25–34", "16–24"][i % 5],
      },
      contact: {
        email: `${handle}@creators.tiktokone.io`,
        whatsapp: `+1 ${200 + (i % 700)} ${1000 + i}`,
        avgRateUSD: 250 + ((i % 12) * 180),
      },
    };
  },
);

export const INFLUENCER_MAP: Record<string, Influencer> = Object.fromEntries(
  INFLUENCERS.map((inf) => [inf.id, inf]),
);

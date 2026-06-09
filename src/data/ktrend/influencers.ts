// K-Trend Analytics — 검증된 틱톡 샵 어필리에이트 크리에이터 DB (시드 데이터)

import { COUNTRIES, type InfluencerTier, type CategoryKey } from "./meta";

export interface Influencer {
  id: string;
  handle: string;
  displayName: string;
  country: string;
  tier: InfluencerTier;
  followers: number;
  avgViews: number;
  engagement: number; // %
  authenticity: number; // 진정성 지수 0–100
  categories: CategoryKey[];
  avgCommission: number; // %
  estRatePerPost: number; // USD (Pro 잠금)
  email: string; // Pro 잠금
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(77123);
const between = (a: number, b: number) => a + rand() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

const NAMES = [
  ["dewy.diaries", "Aria Tan"], ["seoul.skin", "Mina Park"], ["glow.with.bee", "Bea Cruz"],
  ["thai.beauty.hub", "Ploy S."], ["viet.glow.girl", "Linh Nguyen"], ["manila.muse", "Carla R."],
  ["kbeauty.finds", "Jess Lim"], ["sg.skincare.lab", "Wei Ling"], ["glassskin.goals", "Nadia A."],
  ["honeyglow.co", "Sara Wong"], ["serum.savvy", "Kelly Ong"], ["the.skin.edit", "Rina M."],
  ["poreless.dream", "Tina Vo"], ["soft.skin.club", "May Tan"], ["that.glow.girl", "Joy P."],
  ["skintellectual", "Dr. Hana K."], ["daily.glow.up", "Mei Chen"], ["beauty.by.ari", "Ari L."],
  ["kbeauty.addict", "Fern T."], ["dewy.in.manila", "Bianca G."], ["skinfirst.tok", "Yuki S."],
  ["glow.recipe.diaries", "Hannah J."], ["the.makeup.muse", "Zoe Ng"], ["korea.beauty.tok", "Suzy H."],
];

function gen(): Influencer[] {
  const tiers: InfluencerTier[] = ["Mega", "Macro", "Micro"];
  const cats: CategoryKey[] = ["skincare", "makeup", "lipcare", "suncare", "mask"];
  return NAMES.map(([handle, displayName], i) => {
    const tier = tiers[i % 3];
    const followers =
      tier === "Mega" ? Math.round(between(1_100_000, 6_500_000))
      : tier === "Macro" ? Math.round(between(140_000, 980_000))
      : Math.round(between(14_000, 130_000));
    const avgViews = Math.round(followers * between(0.25, 0.9));
    const cat1 = cats[Math.floor(rand() * cats.length)];
    const cat2 = cats[Math.floor(rand() * cats.length)];
    return {
      id: `inf_${i}`,
      handle,
      displayName,
      country: pick(COUNTRIES).code,
      tier,
      followers,
      avgViews,
      engagement: +between(3.2, 12.4).toFixed(1),
      authenticity: Math.round(between(72, 98)),
      categories: cat1 === cat2 ? [cat1] : [cat1, cat2],
      avgCommission: Math.round(between(10, 24)),
      estRatePerPost: Math.round(between(250, 8500) / 50) * 50,
      email: `collab@${handle.replace(/\./g, "")}.creator`,
    };
  }).sort((a, b) => b.followers - a.followers);
}

export const INFLUENCERS: Influencer[] = gen();

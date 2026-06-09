// K-Trend Analytics — 틱톡 콘텐츠 시드 데이터 생성기
// 결정적(seeded) 의사난수로 안정적인 카드 목록을 생성한다. (SSR/CSR 일관성 보장)

import { BRANDS } from "./brands";
import { COUNTRIES, CONTENT_STYLES, type ContentStyle, type InfluencerTier, type CategoryKey } from "./meta";

export interface ContentItem {
  id: string;
  brandId: string;
  creator: string;
  country: string;
  category: CategoryKey;
  style: ContentStyle;
  tier: InfluencerTier;
  caption: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  /** 매소너리 카드 높이 비율 (틱톡 세로 영상 다양성) */
  aspect: number;
  daysAgo: number;
  // 틱톡 샵 어필리에이트 지표
  commission: number; // %
  estRevenue: number; // USD
  estRoas: number;
  estCpm: number; // USD
  trending: boolean;
}

// ---- 결정적 PRNG (mulberry32) ----
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260609);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + rand() * (max - min);

const CREATOR_HANDLES = [
  "glowwith", "kbeautyfinds", "skinqueen", "seoulskin", "thaibeautyhub", "vietglow",
  "manilamakeup", "kbeautymy", "sgskincare", "dewydiaries", "serumsavvy", "glassskingoals",
  "koreabeautytok", "skincarescience", "themakeupmuse", "honeyglow", "porelessdream",
  "asianbeautyedit", "skinfirst", "thatglowgirl", "beautybyari", "softskinclub",
  "glowupwithme", "kbeautyaddict", "skintellectual", "dailyglowup", "theskinedit",
];

const CAPTIONS_BY_STYLE: Record<ContentStyle, string[]> = {
  GRWM: [
    "GRWM using only viral K-beauty 🧖‍♀️",
    "Get ready with me ft. my new {brand} haul",
    "Morning skincare GRWM — glass skin edition ✨",
    "GRWM for a date night with {brand}",
  ],
  Review: [
    "Honest review after 30 days of {brand} 🔬",
    "Is {brand} worth the hype? Full review",
    "Testing the viral {brand} so you don't have to",
    "{brand} before & after — I'm shocked 😳",
  ],
  ASMR: [
    "ASMR skincare unboxing ✨ {brand}",
    "Relaxing {brand} application ASMR 🤍",
    "ASMR: applying {brand} step by step",
    "Whispered {brand} routine ASMR 🌙",
  ],
  Skit: [
    "POV: your skin after {brand} 💅",
    "When she asks about my glass skin… {brand}",
    "Me explaining {brand} to my whole family 😂",
    "The {brand} effect (a skit) 🎬",
  ],
};

function formatCaption(template: string, brandName: string): string {
  return template.replace(/\{brand\}/g, brandName);
}

const TIERS: InfluencerTier[] = ["Mega", "Macro", "Micro"];

function viewsForTier(tier: InfluencerTier): number {
  switch (tier) {
    case "Mega":
      return Math.round(between(1_200_000, 9_800_000));
    case "Macro":
      return Math.round(between(180_000, 1_400_000));
    case "Micro":
      return Math.round(between(12_000, 220_000));
  }
}

function generate(): ContentItem[] {
  const items: ContentItem[] = [];
  let counter = 0;

  // 브랜드당 1–3개 콘텐츠 생성
  for (const brand of BRANDS) {
    const n = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const tier = pick(TIERS);
      const country = pick(COUNTRIES).code;
      const category = pick(brand.categories);
      const style = pick(CONTENT_STYLES).key;
      const views = viewsForTier(tier);
      const likeRatio = between(0.06, 0.18);
      const likes = Math.round(views * likeRatio);
      const comments = Math.round(likes * between(0.02, 0.08));
      const shares = Math.round(likes * between(0.03, 0.12));
      const commission = Math.round(between(8, 25));
      const estCpm = +between(3.5, 14).toFixed(2);
      const conversion = between(0.004, 0.02);
      const aov = between(18, 42);
      const estRevenue = Math.round(views * conversion * aov);
      const adSpend = (views / 1000) * estCpm;
      const estRoas = +(estRevenue / Math.max(adSpend, 1)).toFixed(1);
      const daysAgo = Math.floor(between(0, 21));
      const trending = views > 800_000 && daysAgo <= 5 && rand() > 0.45;

      items.push({
        id: `c_${counter++}`,
        brandId: brand.id,
        creator: pick(CREATOR_HANDLES) + (Math.floor(rand() * 90) + 10),
        country,
        category,
        style,
        tier,
        caption: formatCaption(pick(CAPTIONS_BY_STYLE[style]), brand.name),
        views,
        likes,
        comments,
        shares,
        aspect: pick([1.33, 1.5, 1.6, 1.77]),
        daysAgo,
        commission,
        estRevenue,
        estRoas,
        estCpm,
        trending,
      });
    }
  }

  // 조회수 기준 정렬 (탐색기 기본 정렬)
  return items.sort((a, b) => b.views - a.views);
}

export const CONTENT: ContentItem[] = generate();

export const TRENDING_CONTENT = CONTENT.filter((c) => c.trending);

export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

export function formatUsd(n: number): string {
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return "$" + n.toLocaleString("en-US");
}

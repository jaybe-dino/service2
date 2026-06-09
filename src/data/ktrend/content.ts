// 틱톡 콘텐츠(영상) 리스팅 데이터 (v6.0)
// 모든 리스팅은 "콘텐츠별"로 조회되며, 브랜드 · 카테고리 · 인플루언서 · 국가 · 스타일로 필터링된다.
//
// ⚠️ 데이터 출처에 대하여:
//   실서비스 V1 단계는 틱톡 샵 오픈 DB 스크래핑 + AI 예측, V2는 틱톡원(TikTok One) 다이렉트 API.
//   본 빌드는 정적 배포(MVP UI) 단계이므로, 실제 크롤링 대신 전 브랜드/국가/카테고리/인플루언서
//   조합을 망라하는 결정론적 샘플 데이터셋을 생성한다(개수 제한 없음).
import { BRANDS } from "./brands";
import { INFLUENCERS } from "./influencers";
import type { CategoryId, ContentStyle, CountryCode } from "./meta";
import { CATEGORY_MAP, CONTENT_STYLES } from "./meta";

export interface Content {
  id: string;
  brandId: string;
  influencerId: string;
  country: CountryCode;
  category: CategoryId;
  subCategory: string;
  style: ContentStyle;
  caption: string;
  hashtags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  commissionRate: number; // %
  estRoasX: number; // 추정 ROAS 배수
  estRevenueUSD: number; // 추정 기여 매출
  cpmUSD: number; // 예상 CPM 단가
  postedDaysAgo: number;
  viralScore: number; // 0-100, 바이럴 감지용
  hue: number; // 썸네일 그라데이션 색상 (정적 placeholder)
  tiktokUrl: string;
}

// 결정론적 PRNG (mulberry32) — 빌드 간 동일 데이터 보장
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STYLE_IDS = CONTENT_STYLES.map((s) => s.id);

const CAPTION_TEMPLATES: Record<ContentStyle, string[]> = {
  review: [
    "{brand} {sub} 솔직 30일 리뷰 🤍 모공이 진짜 줄었어요",
    "Honest review: {brand} {sub} — is the hype real? 🧴",
    "{brand} {sub} before & after (no filter) 😳",
  ],
  grwm: [
    "GRWM with {brand} {sub} ☀️ 데일리 글로우 완성",
    "Get ready with me ft. {brand} — {sub} routine 💄",
    "아침 GRWM 🌿 {brand} {sub} 하나로 끝",
  ],
  asmr: [
    "{brand} {sub} ASMR 🫧 제형 보다가 힐링됨",
    "Slime-y {brand} {sub} ASMR application 🐌",
    "텍스처 ASMR: {brand} {sub} 발리는 소리 🎧",
  ],
  skit: [
    "POV: 친구가 {brand} {sub} 쓰고 피부 미쳤을 때 😂",
    "When she asks why my skin glows… {brand} {sub} 🤫",
    "{brand} {sub} 안 쓰는 사람 vs 쓰는 사람 스킷 🎬",
  ],
  haul: [
    "K-beauty haul 🛒 {brand} {sub} 포함 5개 추천",
    "틱톡샵 장바구니 공개 🧺 {brand} {sub} 강추",
    "Massive {brand} haul — {sub} is the star ⭐",
  ],
  tutorial: [
    "{brand} {sub} 200% 활용법 튜토리얼 📚",
    "How to layer {brand} {sub} for glass skin ✨",
    "{sub} 바르는 순서 완벽 정리 ({brand}) 📝",
  ],
};

const HASHTAG_BASE = ["#kbeauty", "#tiktokshop", "#skincare", "#koreanskincare"];

function buildContent(): Content[] {
  const items: Content[] = [];
  let n = 0;

  for (let bi = 0; bi < BRANDS.length; bi++) {
    const brand = BRANDS[bi];
    // 브랜드별 3~5개 콘텐츠 생성 (제한 없음, 전 브랜드 커버)
    const rng = mulberry32(bi * 1000 + 7);
    const count = 3 + Math.floor(rng() * 3); // 3..5

    for (let k = 0; k < count; k++) {
      const r = mulberry32(bi * 1000 + k * 31 + 13);

      const country =
        brand.topMarkets[Math.floor(r() * brand.topMarkets.length)];
      const category = brand.primaryCategory;
      const sub =
        CATEGORY_MAP[category].sub[
          Math.floor(r() * CATEGORY_MAP[category].sub.length)
        ];
      const style = STYLE_IDS[Math.floor(r() * STYLE_IDS.length)];

      // 같은 국가의 인플루언서 우선 매칭, 없으면 전체에서
      const localInfluencers = INFLUENCERS.filter((inf) => inf.country === country);
      const pool = localInfluencers.length ? localInfluencers : INFLUENCERS;
      const influencer = pool[Math.floor(r() * pool.length)];

      // 규모/국가 기반 지표 산출
      const base = influencer.avgViews;
      const views = Math.round(base * (0.4 + r() * 2.2));
      const likes = Math.round(views * (0.06 + r() * 0.08));
      const comments = Math.round(likes * (0.02 + r() * 0.05));
      const shares = Math.round(likes * (0.04 + r() * 0.06));
      const commissionRate = Math.round((8 + r() * 17) * 10) / 10; // 8.0–25.0%
      const estRoasX = Math.round((1.8 + r() * 5.4) * 10) / 10; // 1.8–7.2x
      const cpmUSD = Math.round((3 + r() * 12) * 10) / 10;
      const estRevenueUSD = Math.round((views / 1000) * cpmUSD * estRoasX * (0.8 + r() * 0.6));
      const postedDaysAgo = 1 + Math.floor(r() * 60);
      const viralScore = Math.min(
        100,
        Math.round((views / (base + 1)) * 28 + estRoasX * 6 + r() * 12),
      );

      const tpl =
        CAPTION_TEMPLATES[style][Math.floor(r() * CAPTION_TEMPLATES[style].length)];
      const caption = tpl
        .replaceAll("{brand}", brand.nameEn)
        .replaceAll("{sub}", sub);

      items.push({
        id: `c${(++n).toString().padStart(4, "0")}`,
        brandId: brand.id,
        influencerId: influencer.id,
        country,
        category,
        subCategory: sub,
        style,
        caption,
        hashtags: [
          ...HASHTAG_BASE,
          `#${brand.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        ],
        views,
        likes,
        comments,
        shares,
        commissionRate,
        estRoasX,
        estRevenueUSD,
        cpmUSD,
        postedDaysAgo,
        viralScore,
        hue: Math.floor(r() * 360),
        tiktokUrl: `https://www.tiktok.com/@${influencer.handle}/video/${7000000000000000000 + n}`,
      });
    }
  }

  return items;
}

export const CONTENT: Content[] = buildContent();

// 정렬 옵션
export type SortKey = "viral" | "views" | "roas" | "revenue" | "recent";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "viral", label: "바이럴 점수순" },
  { key: "views", label: "조회수순" },
  { key: "roas", label: "추정 ROAS순" },
  { key: "revenue", label: "추정 매출순" },
  { key: "recent", label: "최신순" },
];

export function sortContent(list: Content[], key: SortKey): Content[] {
  const arr = [...list];
  switch (key) {
    case "views":
      return arr.sort((a, b) => b.views - a.views);
    case "roas":
      return arr.sort((a, b) => b.estRoasX - a.estRoasX);
    case "revenue":
      return arr.sort((a, b) => b.estRevenueUSD - a.estRevenueUSD);
    case "recent":
      return arr.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
    case "viral":
    default:
      return arr.sort((a, b) => b.viralScore - a.viralScore);
  }
}

// 숫자 포맷 헬퍼
export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export function fmtUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n}`;
}

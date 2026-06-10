// 틱톡 콘텐츠(영상) 데이터 — 실제 11,703건 (public/data/videos.json 런타임 로드)
// 출처: brands_1to100_MASTER.xlsx. 조회/좋아요/댓글/공유/광고/Shop/날짜/실제 URL은 실데이터.
// 수익화 지표(수수료율·추정 ROAS·추정 매출)는 V1 AI 예측 모델 추정치(라벨: 추정).
import { BRANDS } from "./brands";
import { INFLUENCER_MAP } from "./influencers";
import { BASE_PATH, CATEGORY_MAP, tierOf, type CategoryId, type InfluencerTier } from "./meta";
import { isOfficialHandle } from "./official";

export interface Content {
  id: string;
  brandId: string;
  influencerId: string; // handle
  category: CategoryId;
  tier: InfluencerTier;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number; // %
  isAd: boolean;
  isShop: boolean;
  date: string;
  postedDaysAgo: number;
  commissionRate: number; // % (추정)
  estRoasX: number; // 추정
  estRevenueUSD: number; // 추정
  cpmUSD: number; // 추정
  viralScore: number; // 0-100
  hue: number;
  rand: number; // 세션 내 랜덤 정렬용
  tiktokUrl: string;
}

interface RawVideos {
  fields: string[];
  rows: [number, string, number, number, number, number, number, number, string, string][];
}

const REF_DATE = Date.UTC(2026, 5, 9); // 2026-06-09 기준 경과일 산출

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}

function mapRow(r: RawVideos["rows"][number], i: number): Content | null {
  const [bidx, handle, views, likes, comments, shares, ad, shop, date, vid] = r;
  const brand = BRANDS[bidx];
  if (!brand) return null;

  const engagementRate =
    views > 0 ? Math.round(((likes + comments + shares) / views) * 1000) / 10 : 0;

  const isShop = shop === 1;
  const isAd = ad === 1;
  const h = hashStr(handle + vid);

  // 추정 수익화 지표 (결정론적)
  const commissionRate = Math.round((8 + (isShop ? 6 : 0) + (h % 100) / 10) * 10) / 10; // 8~24%
  const estRoasX = Math.round(Math.min(8, Math.max(1.5, 1.5 + engagementRate * 0.6 + (h % 30) / 20)) * 10) / 10;
  const cpmUSD = Math.round((3 + (h % 110) / 10) * 10) / 10; // 3~14
  const estRevenueUSD = Math.round((views / 1000) * cpmUSD * estRoasX * (isShop ? 1.2 : 0.7));

  const postedDaysAgo = date
    ? Math.max(0, Math.round((REF_DATE - Date.parse(date)) / 86_400_000))
    : 0;

  const viralScore = Math.min(
    100,
    Math.round(Math.log10(views + 10) * 11 + engagementRate * 1.2 + (isShop ? 6 : 0)),
  );

  return {
    id: `v${i}`,
    brandId: brand.id,
    influencerId: handle,
    category: brand.category,
    tier: INFLUENCER_MAP[handle]?.tier ?? tierOf(views),
    views,
    likes,
    comments,
    shares,
    engagementRate,
    isAd,
    isShop,
    date,
    postedDaysAgo,
    commissionRate,
    estRoasX,
    estRevenueUSD,
    cpmUSD,
    viralScore,
    hue: h % 360,
    rand: Math.random(),
    tiktokUrl: vid ? `https://www.tiktok.com/@${handle}/video/${vid}` : `https://www.tiktok.com/@${handle}`,
  };
}

let cache: Promise<Content[]> | null = null;

export function loadContent(): Promise<Content[]> {
  if (cache) return cache;
  cache = fetch(`${BASE_PATH}/data/videos.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`videos.json ${res.status}`);
      return res.json() as Promise<RawVideos>;
    })
    .then((data) =>
      data.rows
        .map((r, i) => mapRow(r, i))
        .filter((c): c is Content => c !== null)
        // 브랜드 공식/샵 계정 콘텐츠는 전 영역에서 제외
        .filter((c) => !isOfficialHandle(c.influencerId)),
    );
  return cache;
}

// 랜덤 샘플 (메인/앞단 노출용)
export function randomSample(list: Content[], n: number): Content[] {
  return [...list].sort((a, b) => a.rand - b.rand).slice(0, n);
}

// ---------------------------------------------------------------------------
// 정렬 / 포맷 헬퍼
// ---------------------------------------------------------------------------
export type SortKey = "random" | "viral" | "views" | "engagement" | "revenue" | "recent";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "random", label: "랜덤" },
  { key: "viral", label: "바이럴 점수순" },
  { key: "views", label: "조회수순" },
  { key: "engagement", label: "참여율순" },
  { key: "revenue", label: "추정 매출순" },
  { key: "recent", label: "최신순" },
];

export function sortContent(list: Content[], key: SortKey): Content[] {
  const arr = [...list];
  switch (key) {
    case "random":
      return arr.sort((a, b) => a.rand - b.rand);
    case "views":
      return arr.sort((a, b) => b.views - a.views);
    case "engagement":
      return arr.sort((a, b) => b.engagementRate - a.engagementRate);
    case "revenue":
      return arr.sort((a, b) => b.estRevenueUSD - a.estRevenueUSD);
    case "recent":
      return arr.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
    case "viral":
    default:
      return arr.sort((a, b) => b.viralScore - a.viralScore);
  }
}

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

export { CATEGORY_MAP };

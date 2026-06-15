// 틱톡 콘텐츠(영상) 데이터 — 실제 11,703건 (public/data/videos.json 런타임 로드)
// 출처: brands_1to100_MASTER.xlsx. 조회/좋아요/댓글/공유/광고/Shop/날짜/실제 URL은 실데이터.
// 수익화 지표(수수료율·추정 ROAS·추정 매출)는 V1 AI 예측 모델 추정치(라벨: 추정).
import { BRANDS, BRAND_MAP, ensureBrandByName, type Brand } from "./brands";
import { INFLUENCER_MAP } from "./influencers";
import { BASE_PATH, CATEGORY_MAP, tierOf, type CategoryId, type InfluencerTier, type SubCategoryId } from "./meta";
import { isOfficialHandle } from "./official";

export interface Content {
  id: string;
  brandId: string;
  influencerId: string; // handle
  category: CategoryId;
  subCategory: SubCategoryId;
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
  country: string; // 타겟 국가 코드 (현재 전량 US, 추후 확장)
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

// 핵심 지표 → Content (정적/DB 공통 사용). brand는 호출부에서 해석.
function buildContent(args: {
  id: string;
  brand: Brand;
  handle: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  isAd: boolean;
  isShop: boolean;
  date: string;
  tiktokUrl: string;
  hashSeed: string;
  country?: string;
}): Content {
  const { id, brand, handle, views, likes, comments, shares, isAd, isShop, date, tiktokUrl } = args;
  const engagementRate =
    views > 0 ? Math.round(((likes + comments + shares) / views) * 1000) / 10 : 0;
  const h = hashStr(args.hashSeed);

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
    id,
    brandId: brand.id,
    influencerId: handle,
    category: brand.category,
    subCategory: brand.subCategory,
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
    tiktokUrl,
    country: args.country || "US",
  };
}

function mapRow(r: RawVideos["rows"][number], i: number): Content | null {
  const [bidx, handle, views, likes, comments, shares, ad, shop, date, vid] = r;
  const brand = BRANDS[bidx];
  if (!brand) return null;
  return buildContent({
    id: `v${i}`,
    brand,
    handle,
    views,
    likes,
    comments,
    shares,
    isAd: ad === 1,
    isShop: shop === 1,
    date,
    tiktokUrl: vid ? `https://www.tiktok.com/@${handle}/video/${vid}` : `https://www.tiktok.com/@${handle}`,
    hashSeed: handle + vid,
  });
}

// DB(수집) 영상 컴팩트 행: [video_id, brand, handle, views, likes, comments, shares, is_ad, is_shop, posted_at, url, country]
type DbRow = [string, string, string, number, number, number, number, number, number, string, string, string];

function mapDbRow(r: DbRow): Content | null {
  const [videoId, brandName, handle, views, likes, comments, shares, ad, shop, date, url, country] = r;
  if (!handle || !brandName) return null;
  const brand = ensureBrandByName(brandName); // 정적 시드에 없으면 런타임 등록
  return buildContent({
    id: `db:${videoId}`,
    brand,
    handle,
    country,
    views,
    likes,
    comments,
    shares,
    isAd: ad === 1,
    isShop: shop === 1,
    date,
    tiktokUrl: url || `https://www.tiktok.com/@${handle}/video/${videoId}`,
    hashSeed: handle + videoId,
  });
}

// 틱톡 video_id 추출 (정적/DB 중복 제거 키, 콘텐츠 블락 키)
export function tiktokVideoId(url: string): string | null {
  const m = url.match(/\/video\/(\d+)/);
  return m ? m[1] : null;
}

let cache: Promise<Content[]> | null = null;

async function loadStatic(): Promise<Content[]> {
  const res = await fetch(`${BASE_PATH}/data/videos.json`);
  if (!res.ok) throw new Error(`videos.json ${res.status}`);
  const data = (await res.json()) as RawVideos;
  return data.rows.map((r, i) => mapRow(r, i)).filter((c): c is Content => c !== null);
}

// 브랜드명(소문자) → 실 커미션율(%) (A안 틱톡샵 데이터)
export type BrandCommission = Record<string, number>;

// 수집(DB) 피드 + 블락리스트 + 샵 커미션 — 실패해도 정적 데이터로 동작하도록 폴백
async function loadDb(): Promise<{ list: Content[]; blockedHandles: Set<string>; blockedBrands: Set<string>; blockedVideos: Set<string>; commission: BrandCommission }> {
  const empty = { list: [] as Content[], blockedHandles: new Set<string>(), blockedBrands: new Set<string>(), blockedVideos: new Set<string>(), commission: {} as BrandCommission };
  try {
    const res = await fetch(`${BASE_PATH}/api/feed`, { cache: "no-store" });
    if (!res.ok) return empty;
    const data = (await res.json()) as {
      videos?: DbRow[]; blockedHandles?: string[]; blockedBrands?: string[]; blockedVideos?: string[];
      brandShop?: Record<string, { commission: number | null }>;
    };
    const commission: BrandCommission = {};
    for (const [name, s] of Object.entries(data.brandShop ?? {})) {
      if (s && s.commission != null) commission[name] = s.commission;
    }
    return {
      list: (data.videos ?? []).map((r) => mapDbRow(r)).filter((c): c is Content => c !== null),
      blockedHandles: new Set(data.blockedHandles ?? []),
      blockedBrands: new Set((data.blockedBrands ?? []).map((b) => b.toLowerCase())),
      blockedVideos: new Set(data.blockedVideos ?? []),
      commission,
    };
  } catch {
    return empty;
  }
}

let staticCache: Promise<Content[]> | null = null;
function getStatic(): Promise<Content[]> {
  if (!staticCache) staticCache = loadStatic();
  return staticCache;
}

type DbResult = { list: Content[]; blockedHandles: Set<string>; blockedBrands: Set<string>; blockedVideos: Set<string>; commission: BrandCommission };

// 정적+수집 병합 → 가시성 필터 → 신규 브랜드 통계 backfill
function finalize(staticList: Content[], db: DbResult): Content[] {
  const dbList = db.list;
  // 정적 데이터에 이미 있는 틱톡 영상은 중복 제외 (DB가 정적을 덮어쓰지 않음)
  const seen = new Set<string>();
  for (const c of staticList) {
    const vid = tiktokVideoId(c.tiktokUrl);
    if (vid) seen.add(vid);
  }
  const merged = [...staticList];
  for (const c of dbList) {
    const vid = tiktokVideoId(c.tiktokUrl);
    if (vid && seen.has(vid)) continue;
    if (vid) seen.add(vid);
    merged.push(c);
  }

  // 제외: ① 브랜드 공식/샵 계정 ② 블락된 인플루언서/브랜드/콘텐츠 (정적+DB 공통)
  const visible = merged.filter((c) => {
    if (isOfficialHandle(c.influencerId)) return false;
    if (db.blockedHandles.has(c.influencerId)) return false;
    if (db.blockedBrands.has((BRAND_MAP[c.brandId]?.name ?? "").toLowerCase())) return false;
    const vid = tiktokVideoId(c.tiktokUrl);
    if (vid && db.blockedVideos.has(vid)) return false;
    return true;
  });

  // A안: 틱톡샵 실 커미션율이 있는 브랜드는 콘텐츠 수수료율을 실측값으로 대체
  if (Object.keys(db.commission).length) {
    for (const c of visible) {
      const name = (BRAND_MAP[c.brandId]?.name ?? "").toLowerCase();
      const real = db.commission[name];
      if (real != null) c.commissionRate = real;
    }
  }

  // 수집으로 새로 등록된 브랜드(db-*/m-*)의 통계를 실제 콘텐츠 기준으로 갱신
  const byBrand = new Map<string, Content[]>();
  for (const c of visible) {
    if (!c.brandId.startsWith("db-") && !c.brandId.startsWith("m-")) continue;
    const arr = byBrand.get(c.brandId);
    if (arr) arr.push(c);
    else byBrand.set(c.brandId, [c]);
  }
  for (const [brandId, items] of byBrand) {
    const b = BRAND_MAP[brandId];
    if (!b) continue;
    const handles = new Set(items.map((c) => c.influencerId));
    const totalViews = items.reduce((s, c) => s + c.views, 0);
    const shopCount = items.filter((c) => c.isShop).length;
    b.videos = items.length;
    b.influencers = handles.size;
    b.totalViews = totalViews;
    b.avgViews = Math.round(totalViews / items.length);
    b.maxViews = items.reduce((m, c) => Math.max(m, c.views), 0);
    b.adCount = items.filter((c) => c.isAd).length;
    b.shopCount = shopCount;
    b.shopRatio = Math.round((shopCount / items.length) * 1000) / 10;
  }

  return visible;
}

export function loadContent(): Promise<Content[]> {
  if (cache) return cache;
  cache = (async () => {
    const [staticList, db] = await Promise.all([getStatic(), loadDb()]);
    return finalize(staticList, db);
  })();
  return cache;
}

// 단계적 로드: 정적 데이터로 먼저 렌더(빠름) → 수집 DB 병합 후 다시 갱신.
// onUpdate가 phase별로 2회 호출됨 (static → full). 첫 호출로 화면을 즉시 채운다.
export function loadContentStaged(onUpdate: (list: Content[]) => void): void {
  let done = false;
  getStatic().then((s) => {
    if (done) return; // 전체본이 이미 도착했으면 정적본은 건너뜀
    // 정적 단계: 공식계정만 제외 (블락은 전체 단계에서 반영 — 보통 소수)
    onUpdate(s.filter((c) => !isOfficialHandle(c.influencerId)));
  });
  loadContent().then((full) => {
    done = true;
    onUpdate(full);
  });
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
  { key: "revenue", label: "매출순" },
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

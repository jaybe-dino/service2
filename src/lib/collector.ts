// 콘텐츠 수집기 어댑터 — 매니지드 스크래핑 API(provider) 교체식.
// 키 미설정 시 빈 결과 반환(파이프라인은 정상 동작, 실제 수집만 비활성).
//
// 지원 예정 provider: apify(TikTok Scraper) / tikapi / ensembledata.
// 환경변수: SCRAPER_PROVIDER, SCRAPER_API_KEY, (apify) APIFY_ACTOR

export interface CollectedVideo {
  videoId: string;
  handle: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  isAd: boolean;
  isShop: boolean;
  date: string; // YYYY-MM-DD
  url: string;
}

export interface CollectInput {
  brandName: string;
  handle?: string | null;
  hashtags?: string | null;
  sinceDate?: string | null; // 증분: 이 날짜 이후만
  backfillDays?: number | null; // 1차학습: 최근 N일치(예: 365)
  limit?: number;
  region?: string | null; // 지역 타게팅 국가코드(예: TH/VN/MY/SG). 없으면 US(프록시 미지정).
}

export function scraperConfigured(): boolean {
  return Boolean(process.env.SCRAPER_API_KEY);
}

export function scraperProvider(): string {
  return process.env.SCRAPER_PROVIDER || "apify";
}

// 브랜드 해시태그 변형 접미사 — 브랜드명에 붙여 더 넓게 수집(디테일↑). 모두 브랜드 프리픽스라 귀속 유지.
// env COLLECT_TAG_SUFFIXES(콤마구분)로 조정. 빈 문자열("")은 브랜드명 그대로.
const DEFAULT_TAG_SUFFIXES = ["", "review", "haul", "skincare", "makeup", "tutorial", "grwm", "beforeafter"];
function tagSuffixes(): string[] {
  const raw = process.env.COLLECT_TAG_SUFFIXES;
  const list = raw ? raw.split(",").map((s) => s.trim()) : DEFAULT_TAG_SUFFIXES;
  return Array.from(new Set(list));
}

// 해시태그 후보: 명시값 있으면 그대로, 없으면 브랜드명 기반으로 여러 변형 생성(상세 수집).
function hashtagsFor(input: CollectInput): string[] {
  if (input.hashtags) return input.hashtags.split(/[,\s#]+/).filter(Boolean);
  const slug = input.brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!slug) return [];
  return tagSuffixes().map((suf) => `${slug}${suf}`).filter(Boolean);
}

// Apify dataset 아이템 → CollectedVideo (수집 단계 중복 방지: sinceDate 이후만)
export function mapApifyItems(items: Array<Record<string, unknown>>, sinceDate?: string | null): CollectedVideo[] {
  return items
    .map((it): CollectedVideo | null => {
      const id = String(it.id ?? it.videoId ?? "");
      if (!id) return null;
      const author = (it.authorMeta as { name?: string })?.name ?? String(it.authorName ?? "");
      const created = it.createTimeISO ? String(it.createTimeISO).slice(0, 10) : "";
      return {
        videoId: id,
        handle: author,
        views: Number(it.playCount ?? 0),
        likes: Number(it.diggCount ?? 0),
        comments: Number(it.commentCount ?? 0),
        shares: Number(it.shareCount ?? 0),
        isAd: Boolean(it.isAd ?? false),
        isShop: Boolean(it.isSponsored ?? false),
        date: created,
        url: String(it.webVideoUrl ?? `https://www.tiktok.com/@${author}/video/${id}`),
      };
    })
    .filter((v): v is CollectedVideo => v !== null)
    .filter((v) => !sinceDate || v.date > sinceDate);
}

// 수집 시작 날짜(1차학습 backfillDays 우선, 없으면 sinceDate)
function oldestDate(input: CollectInput): string | null {
  if (input.backfillDays) return new Date(Date.now() - input.backfillDays * 86_400_000).toISOString().slice(0, 10);
  return input.sinceDate ?? null;
}

function apifyInput(input: CollectInput): Record<string, unknown> {
  const body: Record<string, unknown> = {
    hashtags: hashtagsFor(input),
    profiles: input.handle ? [input.handle] : [],
    resultsPerPage: input.limit ?? 20, // 비용 최소화 기본값
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
  };
  const oldest = oldestDate(input);
  if (oldest) body.oldestPostDateUnified = oldest; // 수집 단계에서 기간 제한 → 중복/비용 절감
  // 지역 타게팅: 해당 국가 프록시로 요청 → 틱톡이 그 지역 맞춤 콘텐츠를 서빙(US/미지정은 프록시 안 붙임).
  const region = (input.region || "").toUpperCase();
  if (region && region !== "US") {
    body.proxyConfiguration = { useApifyProxy: true, apifyProxyCountry: region };
  }
  return body;
}

// ── Apify TikTok Scraper 동기 어댑터 (소량/즉시 수집용) ──
async function collectViaApify(input: CollectInput): Promise<CollectedVideo[]> {
  const token = process.env.SCRAPER_API_KEY!;
  const actor = process.env.APIFY_ACTOR || "clockworks~tiktok-scraper";
  const res = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(apifyInput(input)),
  });
  if (!res.ok) throw new Error(`apify ${res.status}`);
  const items = (await res.json()) as Array<Record<string, unknown>>;
  return mapApifyItems(items, oldestDate(input));
}

// ── B안: 비동기 run 시작 (대량 1차학습/주간수집). 완료 시 Apify webhook이 ingest 호출 ──
// webhookUrl 예: https://<도메인>/api/ingest/apify?secret=<INGEST_SECRET>
export async function startApifyRun(input: CollectInput, webhookUrl?: string): Promise<string> {
  if (!scraperConfigured()) throw new Error("SCRAPER_API_KEY 미설정");
  const token = process.env.SCRAPER_API_KEY!;
  const actor = process.env.APIFY_ACTOR || "clockworks~tiktok-scraper";
  let qs = `?token=${token}`;
  if (webhookUrl) {
    // 완료 시 brandName 태깅하여 우리 ingest 엔드포인트 호출 (per-brand 매핑 유지)
    const webhooks = [
      {
        eventTypes: ["ACTOR.RUN.SUCCEEDED"],
        requestUrl: webhookUrl,
        payloadTemplate: JSON.stringify({
          brandName: input.brandName,
          region: input.region || "US",
          datasetId: "{{resource.defaultDatasetId}}",
          runId: "{{resource.id}}",
        }),
      },
    ];
    qs += `&webhooks=${encodeURIComponent(Buffer.from(JSON.stringify(webhooks)).toString("base64"))}`;
  }
  const res = await fetch(`https://api.apify.com/v2/acts/${actor}/runs${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(apifyInput(input)),
  });
  if (!res.ok) throw new Error(`apify start ${res.status}`);
  const data = (await res.json()) as { data?: { id?: string } };
  return data?.data?.id ?? "";
}

// 완료된 run의 dataset을 가져와 매핑 (webhook ingest / 폴링에서 사용)
export async function fetchApifyDataset(datasetId: string, sinceDate?: string | null): Promise<CollectedVideo[]> {
  if (!scraperConfigured()) throw new Error("SCRAPER_API_KEY 미설정");
  const token = process.env.SCRAPER_API_KEY!;
  const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`);
  if (!res.ok) throw new Error(`apify dataset ${res.status}`);
  const items = (await res.json()) as Array<Record<string, unknown>>;
  return mapApifyItems(items, sinceDate);
}

// run 상태 조회 (폴링 방식: webhook이 차단돼도 우리가 직접 결과를 가져옴)
export async function fetchApifyRun(runId: string): Promise<{ status: string; datasetId?: string }> {
  if (!scraperConfigured()) throw new Error("SCRAPER_API_KEY 미설정");
  const token = process.env.SCRAPER_API_KEY!;
  const res = await fetch(`https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}?token=${token}`);
  if (!res.ok) throw new Error(`apify run ${res.status}`);
  const data = (await res.json()) as { data?: { status?: string; defaultDatasetId?: string } };
  return { status: data?.data?.status ?? "UNKNOWN", datasetId: data?.data?.defaultDatasetId };
}

export async function collectBrand(input: CollectInput): Promise<CollectedVideo[]> {
  if (!scraperConfigured()) return []; // 키 없음 → 수집 스킵(파이프라인은 진행)
  const provider = scraperProvider();
  switch (provider) {
    case "apify":
      return collectViaApify(input);
    // case "tikapi": return collectViaTikApi(input);
    // case "ensembledata": return collectViaEnsemble(input);
    default:
      return collectViaApify(input);
  }
}

// ───────────────────────────── A안: TikTok Shop 상품 수집 ─────────────────────────────
// 실 커미션율(제휴 마켓플레이스 공개값) + 가격·판매수 → 추정 매출(가격×판매수).
export interface ShopProduct {
  productId: string;
  brandName: string | null;
  title: string | null;
  price: number | null;
  currency: string | null;
  soldCount: number;
  commissionRate: number | null; // %
  url: string | null;
}

export function shopConfigured(): boolean {
  return Boolean(process.env.SCRAPER_API_KEY && process.env.SHOP_ACTOR);
}

function numOr(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const m = v.replace(/[, ]/g, "").match(/[\d.]+/);
    if (m) return Number(m[0]);
  }
  return null;
}
// "1.2K sold" / "3,400" / 1200 → 1200
function parseSold(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  const s = String(v ?? "").toLowerCase().replace(/[, ]/g, "");
  const m = s.match(/([\d.]+)\s*([km]?)/);
  if (!m) return 0;
  let n = Number(m[1]);
  if (m[2] === "k") n *= 1_000;
  else if (m[2] === "m") n *= 1_000_000;
  return Math.round(n);
}
// "15%" / 0.15 / 15 → 15 (퍼센트)
function parseCommission(v: unknown): number | null {
  const n = numOr(v);
  if (n === null) return null;
  return n > 0 && n <= 1 ? Math.round(n * 1000) / 10 : Math.round(n * 10) / 10;
}

export function mapShopItems(items: Array<Record<string, unknown>>, brandFallback?: string): ShopProduct[] {
  return items
    .map((it): ShopProduct | null => {
      const productId = String(it.id ?? it.productId ?? it.product_id ?? "");
      if (!productId) return null;
      const priceRaw = it.price ?? it.salePrice ?? it.priceVal ?? (it as { priceInfo?: { price?: unknown } }).priceInfo?.price;
      return {
        productId,
        brandName: String(it.brand ?? it.sellerName ?? it.shopName ?? brandFallback ?? "") || null,
        title: String(it.title ?? it.name ?? it.productName ?? "") || null,
        price: numOr(priceRaw),
        currency: String(it.currency ?? "USD"),
        soldCount: parseSold(it.soldCount ?? it.sales ?? it.sold ?? it.soldCountText),
        commissionRate: parseCommission(it.commissionRate ?? it.commission ?? it.openCommissionRate ?? it.commission_rate),
        url: String(it.url ?? it.productUrl ?? "") || null,
      };
    })
    .filter((p): p is ShopProduct => p !== null);
}

// 비동기 Shop run 시작 (브랜드명/해시태그 기반 상품 검색)
export async function startShopRun(brandName: string, webhookUrl?: string): Promise<string> {
  if (!shopConfigured()) throw new Error("SHOP_ACTOR/SCRAPER_API_KEY 미설정");
  const token = process.env.SCRAPER_API_KEY!;
  const actor = process.env.SHOP_ACTOR!;
  let qs = `?token=${token}`;
  if (webhookUrl) {
    const webhooks = [{
      eventTypes: ["ACTOR.RUN.SUCCEEDED"],
      requestUrl: webhookUrl,
      payloadTemplate: JSON.stringify({ brandName, datasetId: "{{resource.defaultDatasetId}}", kind: "shop" }),
    }];
    qs += `&webhooks=${encodeURIComponent(Buffer.from(JSON.stringify(webhooks)).toString("base64"))}`;
  }
  // 검색 입력은 actor마다 키가 달라서(가장 흔한 실패 원인) 일반 키 '슈퍼셋'을 전달한다.
  // 특정 actor 스키마에 정확히 맞추려면 SHOP_ACTOR_INPUT(JSON, {{keyword}} 치환)으로 완전 오버라이드.
  const maxItems = Number(process.env.SHOP_MAX_ITEMS ?? 100);
  let body: Record<string, unknown>;
  if (process.env.SHOP_ACTOR_INPUT) {
    try {
      body = JSON.parse(process.env.SHOP_ACTOR_INPUT.replace(/\{\{\s*keyword\s*\}\}/g, brandName));
    } catch {
      body = { keyword: brandName };
    }
  } else {
    body = {
      // 검색어 계열 (actor별로 하나만 사용됨, 나머지는 무시)
      keyword: brandName, search: brandName, query: brandName,
      keywords: [brandName], searchQueries: [brandName],
      // 결과 수 상한 계열
      maxItems, maxResults: maxItems, resultsLimit: maxItems,
      // 지역(선택) — 제공 시 전달. 미제공 시 프록시 exit IP를 따름.
      ...(process.env.SHOP_COUNTRY ? { country: process.env.SHOP_COUNTRY } : {}),
    };
  }
  const res = await fetch(`https://api.apify.com/v2/acts/${actor}/runs${qs}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`apify shop start ${res.status}`);
  const data = (await res.json()) as { data?: { id?: string } };
  return data?.data?.id ?? "";
}

export async function fetchShopDataset(datasetId: string, brandFallback?: string): Promise<ShopProduct[]> {
  if (!scraperConfigured()) throw new Error("SCRAPER_API_KEY 미설정");
  const token = process.env.SCRAPER_API_KEY!;
  const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`);
  if (!res.ok) throw new Error(`apify shop dataset ${res.status}`);
  const items = (await res.json()) as Array<Record<string, unknown>>;
  return mapShopItems(items, brandFallback);
}

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
}

export function scraperConfigured(): boolean {
  return Boolean(process.env.SCRAPER_API_KEY);
}

export function scraperProvider(): string {
  return process.env.SCRAPER_PROVIDER || "apify";
}

// 해시태그 후보: 명시값 없으면 브랜드명 기반 생성
function hashtagsFor(input: CollectInput): string[] {
  if (input.hashtags) return input.hashtags.split(/[,\s#]+/).filter(Boolean);
  const slug = input.brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [slug, `${slug}review`, `${slug}haul`].filter(Boolean);
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

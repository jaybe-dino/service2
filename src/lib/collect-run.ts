import { sql, ensureSchema } from "./db";
import {
  startApifyRun, fetchApifyRun, fetchApifyDataset, scraperConfigured,
  startShopRun, fetchShopDataset, shopConfigured,
  type CollectedVideo, type ShopProduct,
} from "./collector";
import { isOfficialHandle } from "@/data/ktrend/official";
import { BRANDS } from "@/data/ktrend/brands";
import { DEFAULT_CRAWL_RULES, type CrawlRules } from "./crawl-rules";
import { SEA_COUNTRIES } from "@/data/ktrend/meta";

// 수집 가능 지역: US(기본) + 동남아 4개국. admin_settings(collect_regions)로 켬.
const ALLOWED_REGIONS = new Set<string>(["US", ...SEA_COUNTRIES]);

// 수집 대상 지역 목록 — admin_settings(key='collect_regions') 우선, 없으면 env, 기본 ['US'].
// 동남아를 켜면 각 브랜드를 지역별 프록시로 크롤해 국가 태깅한다(지역당 1 run).
export async function getCollectRegions(): Promise<string[]> {
  let regions: string[] = [];
  try {
    const r = await sql`SELECT value FROM admin_settings WHERE key='collect_regions' LIMIT 1`;
    const v = r.rows[0]?.value as { regions?: unknown } | unknown[] | undefined;
    const arr = Array.isArray(v) ? v : ((v as { regions?: unknown })?.regions ?? []);
    regions = (Array.isArray(arr) ? arr : []).map((x) => String(x).toUpperCase()).filter((x) => ALLOWED_REGIONS.has(x));
  } catch { /* 폴백 */ }
  if (!regions.length) {
    regions = (process.env.COLLECT_REGIONS || process.env.COLLECT_COUNTRY || "US")
      .split(",").map((x) => x.trim().toUpperCase()).filter((x) => ALLOWED_REGIONS.has(x));
  }
  return regions.length ? Array.from(new Set(regions)) : ["US"];
}

const MAX_ATTEMPTS = 3; // 재시도 상한 — 초과 시 'failed'로 격리
// 수집 깊이/배치 — 환경변수로 조절. 기본값은 Apify 월 상한 $100 기준(하드 상한이 안전망).
// 수집 강도 — admin_settings(key='collect_tuning')로 어드민에서 실시간 조정. env는 폴백 기본값.
export interface CollectTuning {
  initialLimit: number; // 신규 1차 백필 깊이(브랜드당 영상 수)
  refreshLimit: number; // 정기 증분 깊이
  maxPending: number;   // 한 번 실행 시 신규 시작 개수
  maxRefresh: number;   // 한 번 실행 시 갱신 시작 개수
  maxPoll: number;      // 한 번 실행 시 결과 적재(회수) 개수
}
export const DEFAULT_TUNING: CollectTuning = {
  initialLimit: Number(process.env.COLLECT_INITIAL_LIMIT ?? 500),
  refreshLimit: Number(process.env.COLLECT_REFRESH_LIMIT ?? 100),
  maxPending: Number(process.env.COLLECT_MAX_PENDING ?? 4),
  maxRefresh: Number(process.env.COLLECT_MAX_REFRESH ?? 6),
  maxPoll: Number(process.env.COLLECT_MAX_POLL ?? 2),
};
const clampPos = (n: unknown, def: number, max: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v > 0 ? Math.min(v, max) : def;
};
export async function getCollectTuning(): Promise<CollectTuning> {
  try {
    const r = await sql`SELECT value FROM admin_settings WHERE key='collect_tuning' LIMIT 1`;
    const v = (r.rows[0]?.value ?? {}) as Partial<CollectTuning>;
    return {
      initialLimit: clampPos(v.initialLimit, DEFAULT_TUNING.initialLimit, 1000),
      refreshLimit: clampPos(v.refreshLimit, DEFAULT_TUNING.refreshLimit, 500),
      maxPending: clampPos(v.maxPending, DEFAULT_TUNING.maxPending, 100),
      maxRefresh: clampPos(v.maxRefresh, DEFAULT_TUNING.maxRefresh, 100),
      maxPoll: clampPos(v.maxPoll, DEFAULT_TUNING.maxPoll, 12), // 60초 제한 고려 상한
    };
  } catch { return DEFAULT_TUNING; }
}
const BACKFILL_DAYS = Number(process.env.COLLECT_BACKFILL_DAYS ?? 365); // 신규 1차학습 기간
const REFRESH_SINCE_DAYS = 30; // 증분 수집 기간

async function getRules(): Promise<CrawlRules> {
  const r = await sql`SELECT value FROM admin_settings WHERE key='crawl_rules' LIMIT 1`;
  return { ...DEFAULT_CRAWL_RULES, ...(r.rows[0]?.value ?? {}) };
}

// 수집 실패만 Slack 통지(설정된 경우). 조용한 실패 방지, 비용 0.
async function notifyFailure(msg: string) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `⚠️ [Glovek 수집] ${msg}` }),
    });
  } catch {
    /* 통지 실패는 무시 */
  }
}

async function getBlocked(): Promise<{ handles: Set<string>; brands: Set<string>; videos: Set<string> }> {
  const r = await sql<{ kind: string; value: string }>`SELECT kind, value FROM blocklist`;
  return {
    handles: new Set(r.rows.filter((x) => x.kind === "handle").map((x) => x.value)),
    brands: new Set(r.rows.filter((x) => x.kind === "brand").map((x) => x.value)),
    videos: new Set(r.rows.filter((x) => x.kind === "video").map((x) => x.value)),
  };
}

async function upsertVideos(brandName: string, vids: CollectedVideo[], rules: CrawlRules, region?: string | null): Promise<number> {
  const blocked = await getBlocked();
  if (blocked.brands.has(brandName)) return 0; // 블락 브랜드는 적재하지 않음

  // 필터 + 배치 내 중복 video_id 제거
  const seen = new Set<string>();
  const rows = vids.filter((v) => {
    if (!v.videoId || seen.has(v.videoId)) return false;
    if (rules.excludeOfficialAccounts && isOfficialHandle(v.handle)) return false;
    if (blocked.handles.has(v.handle)) return false;
    if (blocked.videos.has(v.videoId)) return false;
    if (rules.minViews && v.views < rules.minViews) return false;
    seen.add(v.videoId);
    return true;
  });
  if (!rows.length) return 0;

  // 배치 INSERT (1건씩 → 타임아웃 방지). 100행씩 묶어서.
  // 국가 태깅: 수집 잡의 region 우선(동남아 타게팅), 없으면 env/기본 US.
  const country = (region || process.env.COLLECT_COUNTRY || "US").toUpperCase();
  const COLS = 12;
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const placeholders = chunk
      .map((_, j) => {
        const b = j * COLS;
        return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11},$${b + 12})`;
      })
      .join(",");
    const params: unknown[] = [];
    for (const v of chunk) {
      params.push(v.videoId, brandName, v.handle, v.views, v.likes, v.comments, v.shares, v.isAd, v.isShop, v.date, v.url, country);
    }
    await sql.query(
      `INSERT INTO videos (video_id, brand_name, handle, views, likes, comments, shares, is_ad, is_shop, posted_at, url, country)
       VALUES ${placeholders}
       ON CONFLICT (video_id) DO UPDATE SET views=EXCLUDED.views, likes=EXCLUDED.likes, comments=EXCLUDED.comments, shares=EXCLUDED.shares, collected_at=now()`,
      params,
    );
  }
  return rows.length;
}

// 콘텐츠 → 브랜드 통계 재계산 (수집된 videos 기준)
async function recomputeBrandStats(brandName: string) {
  await sql`INSERT INTO brand_stats (brand_name, videos, influencers, total_views, avg_views, max_views, shop_count, updated_at)
    SELECT brand_name, count(*)::int, count(distinct handle)::int, sum(views)::bigint,
           (sum(views)/GREATEST(count(*),1))::bigint, max(views)::bigint,
           sum(case when is_shop then 1 else 0 end)::int, now()
    FROM videos WHERE brand_name=${brandName} GROUP BY brand_name
    ON CONFLICT (brand_name) DO UPDATE SET
      videos=EXCLUDED.videos, influencers=EXCLUDED.influencers, total_views=EXCLUDED.total_views,
      avg_views=EXCLUDED.avg_views, max_views=EXCLUDED.max_views, shop_count=EXCLUDED.shop_count, updated_at=now()`;
}

// 콘텐츠 → 인플루언서(크리에이터) 집계/갱신 (해당 브랜드와 협업한 핸들 전체 재계산)
async function recomputeCreatorsForBrand(brandName: string) {
  await sql`INSERT INTO creators (handle, videos, total_views, avg_views, brands, updated_at)
    SELECT v.handle, count(*)::int, sum(v.views)::bigint, (sum(v.views)/GREATEST(count(*),1))::bigint,
           array_agg(distinct v.brand_name), now()
    FROM videos v
    WHERE v.handle IN (SELECT DISTINCT handle FROM videos WHERE brand_name=${brandName})
    GROUP BY v.handle
    ON CONFLICT (handle) DO UPDATE SET
      videos=EXCLUDED.videos, total_views=EXCLUDED.total_views, avg_views=EXCLUDED.avg_views,
      brands=EXCLUDED.brands, updated_at=now()`;
}

// 브랜드→콘텐츠→인플루언서 연계: 영상 적재 후 통계/크리에이터 동시 갱신
async function syncDerived(brandName: string) {
  await recomputeBrandStats(brandName);
  await recomputeCreatorsForBrand(brandName);
}

// ── A안: 틱톡샵 상품 적재 + 브랜드 샵 통계(실 커미션율·추정 GMV) ──
async function recomputeBrandShopStats(brandName: string) {
  await sql`INSERT INTO brand_shop_stats (brand_name, products, avg_commission, total_sold, est_gmv, updated_at)
    SELECT brand_name, count(*)::int, round(avg(commission_rate)::numeric, 1),
           sum(COALESCE(sold_count,0))::bigint,
           sum(COALESCE(price,0) * COALESCE(sold_count,0)), now()
    FROM products WHERE brand_name=${brandName} GROUP BY brand_name
    ON CONFLICT (brand_name) DO UPDATE SET
      products=EXCLUDED.products, avg_commission=EXCLUDED.avg_commission,
      total_sold=EXCLUDED.total_sold, est_gmv=EXCLUDED.est_gmv, updated_at=now()`;
}

export async function ingestProducts(brandName: string, products: ShopProduct[], country = "US"): Promise<number> {
  await ensureSchema();
  const cc = (country || "US").toUpperCase();
  const seen = new Set<string>();
  const rows = products.filter((p) => p.productId && !seen.has(p.productId) && seen.add(p.productId));
  if (rows.length) {
    const COLS = 9; // + country
    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const placeholders = chunk.map((_, j) => {
        const b = j * COLS;
        return `(${Array.from({ length: COLS }, (_, k) => `$${b + k + 1}`).join(",")})`;
      }).join(",");
      const params: unknown[] = [];
      for (const p of chunk) {
        // product_id는 국가 프리픽스(US:...)로 저장 → 같은 상품이 국가별로 구분 저장.
        // brand_name은 검색한 브랜드로 고정(우리 브랜드와 매핑 보장)
        params.push(`${cc}:${p.productId}`, brandName, p.title, p.price, p.currency, p.soldCount, p.commissionRate, p.url, cc);
      }
      await sql.query(
        `INSERT INTO products (product_id, brand_name, title, price, currency, sold_count, commission_rate, url, country)
         VALUES ${placeholders}
         ON CONFLICT (product_id) DO UPDATE SET brand_name=EXCLUDED.brand_name, price=EXCLUDED.price,
           sold_count=EXCLUDED.sold_count, commission_rate=EXCLUDED.commission_rate, country=EXCLUDED.country, collected_at=now()`,
        params,
      );
    }
    await recomputeBrandShopStats(brandName);
  }
  await sql`INSERT INTO collection_runs (kind, target, status, collected) VALUES ('shop_ingest', ${brandName}, 'ok', ${rows.length})`;
  return rows.length;
}

// B안 webhook 적재 공용 함수: dedup upsert → 통계/인플루언서 갱신 → 추적/로그 갱신
export async function ingestVideos(brandName: string, vids: CollectedVideo[], region?: string | null): Promise<number> {
  await ensureSchema();
  const rules = await getRules();
  const c = await upsertVideos(brandName, vids, rules, region); // video_id 멱등 = 중복 저장 차단
  if (c > 0) await syncDerived(brandName);
  await sql`INSERT INTO brand_tracking (brand_name, last_collected_at, updated_at)
            VALUES (${brandName}, now(), now())
            ON CONFLICT (brand_name) DO UPDATE SET last_collected_at=now(), updated_at=now()`;
  // 비동기 수집 완료 → 신규 브랜드 요청을 active로 전환
  await sql`UPDATE brand_requests SET status='active', collected=${c}, updated_at=now()
            WHERE brand_name=${brandName} AND status IN ('collecting','pending')`;
  await sql`INSERT INTO collection_runs (kind, target, status, collected) VALUES ('ingest', ${brandName}, 'ok', ${c})`;
  return c;
}

async function cursor(): Promise<number> {
  const r = await sql`SELECT value FROM admin_settings WHERE key='collect_cursor' LIMIT 1`;
  return Number((r.rows[0]?.value as { idx?: number })?.idx ?? 0);
}
async function setCursor(idx: number) {
  await sql`INSERT INTO admin_settings (key, value, updated_at) VALUES ('collect_cursor', ${JSON.stringify({ idx })}::jsonb, now())
            ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`;
}

export interface CollectSummary {
  configured: boolean;
  mode: "async" | "skipped";
  polledDone: number;
  ingested: number;
  kickedNew: number;
  kickedRefresh: number;
  reason?: string;
}

// 수집 결과를 받을 webhook URL (선택). webhook이 차단돼도 폴링이 결과를 가져옴.
function ingestWebhook(baseUrl?: string): string | undefined {
  if (!baseUrl) return undefined;
  const secret = process.env.INGEST_SECRET || process.env.CRON_SECRET;
  return `${baseUrl}/api/ingest/apify${secret ? `?secret=${encodeURIComponent(secret)}` : ""}`;
}

// 폴링(pull): 진행 중 run의 완료 여부를 직접 확인 → 끝났으면 dataset 가져와 적재.
// (Apify→우리 webhook 인바운드가 막혀도 동작 — 아웃바운드만 사용)
async function pollJobs(maxPoll: number): Promise<{ ingested: number; done: number }> {
  const jobs = await sql<{ run_id: string; brand_name: string; since_date: string | null; kind: string; region: string | null }>`
    SELECT run_id, brand_name, since_date, kind, region FROM collect_jobs WHERE status='running' ORDER BY created_at ASC LIMIT ${maxPoll}`;
  let ingested = 0;
  let done = 0;
  for (const j of jobs.rows) {
    try {
      const run = await fetchApifyRun(j.run_id);
      if (run.status === "SUCCEEDED" && run.datasetId) {
        let c = 0;
        if (j.kind === "shop") {
          const products = await fetchShopDataset(run.datasetId, j.brand_name);
          c = await ingestProducts(j.brand_name, products, j.region || "US"); // region = 수집 국가
        } else {
          const vids = await fetchApifyDataset(run.datasetId, j.since_date);
          c = await ingestVideos(j.brand_name, vids, j.region);
        }
        await sql`UPDATE collect_jobs SET status='done', collected=${c}, updated_at=now() WHERE run_id=${j.run_id}`;
        ingested += c;
        done += 1;
      } else if (["FAILED", "ABORTED", "TIMED-OUT", "TIMED_OUT"].includes(run.status)) {
        await sql`UPDATE collect_jobs SET status='failed', updated_at=now() WHERE run_id=${j.run_id}`;
        await sql`INSERT INTO collection_runs (kind, target, status, error) VALUES ('poll', ${j.brand_name}, 'error', ${run.status})`;
      }
      // RUNNING/READY 등은 다음 폴링까지 대기
    } catch (e) {
      await sql`INSERT INTO collection_runs (kind, target, status, error) VALUES ('poll', ${j.brand_name}, 'error', ${String(e).slice(0, 200)})`;
    }
  }
  return { ingested, done };
}

// B안 비동기 수집 사이클: Apify run을 "시작"만 하고(빠름) 결과는 webhook(ingest)으로 받음.
// → 서버리스 60초 제한 무관하게 브랜드당 수천 건 깊게 수집 가능.
export async function runCollection(opts: { maxPending?: number; maxRefresh?: number; maxPoll?: number; baseUrl?: string } = {}): Promise<CollectSummary> {
  await ensureSchema();
  const configured = scraperConfigured();
  const webhook = ingestWebhook(opts.baseUrl);
  // 수집 강도: admin_settings(DB) 우선, 없으면 env/기본값. opts로 강제 지정 시 그 값 우선.
  const tuning = await getCollectTuning();
  const maxPending = opts.maxPending ?? tuning.maxPending;
  const maxRefresh = opts.maxRefresh ?? tuning.maxRefresh;
  const maxPoll = opts.maxPoll ?? tuning.maxPoll;

  if (!configured) return { configured, mode: "skipped", polledDone: 0, ingested: 0, kickedNew: 0, kickedRefresh: 0, reason: "SCRAPER_API_KEY 미설정" };

  // 시간 예산: 함수 60초 제한 내에서 안전하게 멈추도록 (설정값이 커도 504 방지)
  const startedAt = Date.now();
  const TIME_BUDGET_MS = 45_000;
  const outOfTime = () => Date.now() - startedAt > TIME_BUDGET_MS;

  // 0) 진행 중 run 결과 먼저 적재 (폴링) — 타임아웃 방지 위해 한 번에 maxPoll개만
  const poll = await pollJobs(maxPoll);

  let kickedNew = 0;
  let kickedRefresh = 0;
  const backfillSince = new Date(Date.now() - BACKFILL_DAYS * 86_400_000).toISOString().slice(0, 10);
  const regions = await getCollectRegions(); // ['US'] 또는 ['US','TH','VN','MY','SG'] 등

  // 1) 신규 브랜드: 1년치 깊은 백필 run 시작 (pending → collecting). 지역마다 프록시 타게팅으로 1 run.
  const pending = await sql<{ id: number; brand_name: string; handle: string | null; hashtags: string | null; attempts: number }>`
    SELECT id, brand_name, handle, hashtags, attempts FROM brand_requests WHERE status='pending' ORDER BY created_at ASC LIMIT ${maxPending}`;
  for (const req of pending.rows) {
    if (outOfTime()) break;
    try {
      for (const region of regions) {
        if (outOfTime()) break;
        const runId = await startApifyRun(
          { brandName: req.brand_name, handle: req.handle, hashtags: req.hashtags, backfillDays: BACKFILL_DAYS, limit: tuning.initialLimit, region },
          webhook,
        );
        if (runId) await sql`INSERT INTO collect_jobs (run_id, brand_name, since_date, region) VALUES (${runId}, ${req.brand_name}, ${backfillSince}, ${region}) ON CONFLICT (run_id) DO NOTHING`;
        if (runId) kickedNew += 1;
      }
      await sql`UPDATE brand_requests SET status='collecting', updated_at=now() WHERE id=${req.id}`;
      await sql`INSERT INTO brand_tracking (brand_name, hashtags, updated_at)
                VALUES (${req.brand_name}, ${req.hashtags}, now())
                ON CONFLICT (brand_name) DO UPDATE SET hashtags=COALESCE(EXCLUDED.hashtags, brand_tracking.hashtags), updated_at=now()`;
      await sql`INSERT INTO collection_runs (kind, target, status) VALUES ('kick_new', ${req.brand_name}, 'started')`;
    } catch (e) {
      const next = (req.attempts ?? 0) + 1;
      const status = next >= MAX_ATTEMPTS ? "failed" : "pending";
      await sql`UPDATE brand_requests SET status=${status}, attempts=${next}, note=${String(e).slice(0, 200)}, updated_at=now() WHERE id=${req.id}`;
      await sql`INSERT INTO collection_runs (kind, target, status, error) VALUES ('kick_new', ${req.brand_name}, 'error', ${String(e).slice(0, 200)})`;
      if (status === "failed") await notifyFailure(`신규 브랜드 '${req.brand_name}' 수집 시작 ${MAX_ATTEMPTS}회 실패 → 격리`);
    }
  }

  // 2) 정기 갱신: due 브랜드 증분 run 시작. 중복 kick 방지 위해 last_collected_at 선갱신.
  const since = new Date(Date.now() - REFRESH_SINCE_DAYS * 86_400_000).toISOString().slice(0, 10);
  const due = await sql<{ brand_name: string; hashtags: string | null }>`
    SELECT brand_name, hashtags FROM brand_tracking
    WHERE tracked = true
      AND (last_collected_at IS NULL OR last_collected_at < now() - make_interval(hours => interval_hours))
    ORDER BY last_collected_at ASC NULLS FIRST
    LIMIT ${maxRefresh}`;

  const targets: { name: string; hashtags: string | null }[] = due.rows.map((r) => ({ name: r.brand_name, hashtags: r.hashtags }));

  // 추적 테이블이 비어있으면 기존 브랜드를 라운드로빈으로 시드
  if (targets.length === 0 && BRANDS.length) {
    let idx = await cursor();
    for (let k = 0; k < maxRefresh; k++) {
      targets.push({ name: BRANDS[idx % BRANDS.length].name, hashtags: null });
      idx += 1;
    }
    await setCursor(idx);
  }

  for (const t of targets) {
    if (outOfTime()) break;
    try {
      for (const region of regions) {
        if (outOfTime()) break;
        const runId = await startApifyRun({ brandName: t.name, hashtags: t.hashtags, sinceDate: since, limit: tuning.refreshLimit, region }, webhook);
        if (runId) await sql`INSERT INTO collect_jobs (run_id, brand_name, since_date, region) VALUES (${runId}, ${t.name}, ${since}, ${region}) ON CONFLICT (run_id) DO NOTHING`;
        if (runId) kickedRefresh += 1;
      }
      await sql`INSERT INTO brand_tracking (brand_name, last_collected_at, updated_at)
                VALUES (${t.name}, now(), now())
                ON CONFLICT (brand_name) DO UPDATE SET last_collected_at=now(), updated_at=now()`;
      await sql`INSERT INTO collection_runs (kind, target, status) VALUES ('kick_refresh', ${t.name}, 'started')`;
    } catch (e) {
      await sql`INSERT INTO collection_runs (kind, target, status, error) VALUES ('kick_refresh', ${t.name}, 'error', ${String(e).slice(0, 200)})`;
    }
  }

  return { configured, mode: "async", polledDone: poll.done, ingested: poll.ingested, kickedNew, kickedRefresh };
}

export interface ShopSummary { configured: boolean; mode: "async" | "skipped"; polledDone: number; ingested: number; kicked: number; reason?: string }

// A안 틱톡샵 상품 수집 사이클: 완료분 적재(폴링) + 미수집 브랜드 N개 shop run 시작.
export async function runShopCollection(opts: { maxShop?: number; baseUrl?: string } = {}): Promise<ShopSummary> {
  await ensureSchema();
  if (!shopConfigured()) return { configured: false, mode: "skipped", polledDone: 0, ingested: 0, kicked: 0, reason: "SHOP_ACTOR 미설정" };
  const webhook = ingestWebhook(opts.baseUrl);
  const maxShop = opts.maxShop ?? 3;
  // 다국가: SHOP_COUNTRIES(콤마) 순회. 미설정 시 US 단일.
  const countries = (process.env.SHOP_COUNTRIES || "US")
    .split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

  const poll = await pollJobs(2 * countries.length); // video/shop 공용 폴링(국가수만큼 여유)

  // 아직 샵 통계가 없는 추적 브랜드 우선, 없으면 오래된 순
  const due = await sql<{ brand_name: string }>`
    SELECT bt.brand_name FROM brand_tracking bt
    LEFT JOIN brand_shop_stats bss ON bss.brand_name = bt.brand_name
    WHERE bt.tracked = true
    ORDER BY bss.updated_at ASC NULLS FIRST, bt.brand_name ASC
    LIMIT ${maxShop}`;

  let kicked = 0;
  for (const b of due.rows) {
    for (const cc of countries) {
      try {
        const runId = await startShopRun(b.brand_name, webhook, cc);
        // 수집 국가는 collect_jobs.region에 저장 → pollJobs가 ingestProducts에 국가로 전달.
        if (runId) await sql`INSERT INTO collect_jobs (run_id, brand_name, kind, region) VALUES (${runId}, ${b.brand_name}, 'shop', ${cc}) ON CONFLICT (run_id) DO NOTHING`;
        await sql`INSERT INTO collection_runs (kind, target, status) VALUES ('kick_shop', ${`${b.brand_name}·${cc}`}, 'started')`;
        kicked += 1;
      } catch (e) {
        await sql`INSERT INTO collection_runs (kind, target, status, error) VALUES ('kick_shop', ${`${b.brand_name}·${cc}`}, 'error', ${String(e).slice(0, 200)})`;
      }
    }
  }
  return { configured: true, mode: "async", polledDone: poll.done, ingested: poll.ingested, kicked };
}

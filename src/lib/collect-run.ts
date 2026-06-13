import { sql, ensureSchema } from "./db";
import { startApifyRun, scraperConfigured, type CollectedVideo } from "./collector";
import { isOfficialHandle } from "@/data/ktrend/official";
import { BRANDS } from "@/data/ktrend/brands";
import { DEFAULT_CRAWL_RULES, type CrawlRules } from "./crawl-rules";

const MAX_ATTEMPTS = 3; // 재시도 상한 — 초과 시 'failed'로 격리
// 수집 깊이/배치 — 환경변수로 조절. 기본값은 Apify 월 상한 $100 기준(하드 상한이 안전망).
const INITIAL_LIMIT = Number(process.env.COLLECT_INITIAL_LIMIT ?? 500); // 신규 1차 백필 깊이
const REFRESH_LIMIT = Number(process.env.COLLECT_REFRESH_LIMIT ?? 100); // 정기 증분 깊이
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

async function upsertVideos(brandName: string, vids: CollectedVideo[], rules: CrawlRules): Promise<number> {
  const blocked = await getBlocked();
  if (blocked.brands.has(brandName)) return 0; // 블락 브랜드는 적재하지 않음
  let n = 0;
  for (const v of vids) {
    if (rules.excludeOfficialAccounts && isOfficialHandle(v.handle)) continue;
    if (blocked.handles.has(v.handle)) continue; // 블락 인플루언서 제외
    if (blocked.videos.has(v.videoId)) continue; // 블락 콘텐츠 제외
    if (rules.minViews && v.views < rules.minViews) continue;
    await sql`INSERT INTO videos (video_id, brand_name, handle, views, likes, comments, shares, is_ad, is_shop, posted_at, url, collected_at)
      VALUES (${v.videoId}, ${brandName}, ${v.handle}, ${v.views}, ${v.likes}, ${v.comments}, ${v.shares}, ${v.isAd}, ${v.isShop}, ${v.date}, ${v.url}, now())
      ON CONFLICT (video_id) DO UPDATE SET views=EXCLUDED.views, likes=EXCLUDED.likes, comments=EXCLUDED.comments, shares=EXCLUDED.shares, collected_at=now()`;
    n += 1;
  }
  return n;
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

// B안 webhook 적재 공용 함수: dedup upsert → 통계/인플루언서 갱신 → 추적/로그 갱신
export async function ingestVideos(brandName: string, vids: CollectedVideo[]): Promise<number> {
  await ensureSchema();
  const rules = await getRules();
  const c = await upsertVideos(brandName, vids, rules); // video_id 멱등 = 중복 저장 차단
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
  kickedNew: number;
  kickedRefresh: number;
  reason?: string;
}

// 수집 결과를 받을 webhook URL (Apify가 run 완료 시 호출 → /api/ingest/apify)
function ingestWebhook(baseUrl?: string): string | undefined {
  if (!baseUrl) return undefined;
  const secret = process.env.INGEST_SECRET || process.env.CRON_SECRET;
  return `${baseUrl}/api/ingest/apify${secret ? `?secret=${encodeURIComponent(secret)}` : ""}`;
}

// B안 비동기 수집 사이클: Apify run을 "시작"만 하고(빠름) 결과는 webhook(ingest)으로 받음.
// → 서버리스 60초 제한 무관하게 브랜드당 수천 건 깊게 수집 가능.
export async function runCollection(opts: { maxPending?: number; maxRefresh?: number; baseUrl?: string } = {}): Promise<CollectSummary> {
  await ensureSchema();
  const configured = scraperConfigured();
  const webhook = ingestWebhook(opts.baseUrl);
  const maxPending = opts.maxPending ?? 5;
  const maxRefresh = opts.maxRefresh ?? 10;

  if (!configured) return { configured, mode: "skipped", kickedNew: 0, kickedRefresh: 0, reason: "SCRAPER_API_KEY 미설정" };
  if (!webhook) return { configured, mode: "skipped", kickedNew: 0, kickedRefresh: 0, reason: "수집 결과 수신 URL(baseUrl) 없음" };

  let kickedNew = 0;
  let kickedRefresh = 0;

  // 1) 신규 브랜드: 1년치 깊은 백필 run 시작 (pending → collecting). 결과는 webhook이 적재 → active.
  const pending = await sql<{ id: number; brand_name: string; handle: string | null; hashtags: string | null; attempts: number }>`
    SELECT id, brand_name, handle, hashtags, attempts FROM brand_requests WHERE status='pending' ORDER BY created_at ASC LIMIT ${maxPending}`;
  for (const req of pending.rows) {
    try {
      await startApifyRun(
        { brandName: req.brand_name, handle: req.handle, hashtags: req.hashtags, backfillDays: BACKFILL_DAYS, limit: INITIAL_LIMIT },
        webhook,
      );
      await sql`UPDATE brand_requests SET status='collecting', updated_at=now() WHERE id=${req.id}`;
      await sql`INSERT INTO brand_tracking (brand_name, hashtags, updated_at)
                VALUES (${req.brand_name}, ${req.hashtags}, now())
                ON CONFLICT (brand_name) DO UPDATE SET hashtags=COALESCE(EXCLUDED.hashtags, brand_tracking.hashtags), updated_at=now()`;
      await sql`INSERT INTO collection_runs (kind, target, status) VALUES ('kick_new', ${req.brand_name}, 'started')`;
      kickedNew += 1;
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
    try {
      await startApifyRun({ brandName: t.name, hashtags: t.hashtags, sinceDate: since, limit: REFRESH_LIMIT }, webhook);
      await sql`INSERT INTO brand_tracking (brand_name, last_collected_at, updated_at)
                VALUES (${t.name}, now(), now())
                ON CONFLICT (brand_name) DO UPDATE SET last_collected_at=now(), updated_at=now()`;
      await sql`INSERT INTO collection_runs (kind, target, status) VALUES ('kick_refresh', ${t.name}, 'started')`;
      kickedRefresh += 1;
    } catch (e) {
      await sql`INSERT INTO collection_runs (kind, target, status, error) VALUES ('kick_refresh', ${t.name}, 'error', ${String(e).slice(0, 200)})`;
    }
  }

  return { configured, mode: "async", kickedNew, kickedRefresh };
}

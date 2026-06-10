import { sql, ensureSchema } from "./db";
import { collectBrand, scraperConfigured, type CollectedVideo } from "./collector";
import { isOfficialHandle } from "@/data/ktrend/official";
import { BRANDS } from "@/data/ktrend/brands";
import { DEFAULT_CRAWL_RULES, type CrawlRules } from "./crawl-rules";

async function getRules(): Promise<CrawlRules> {
  const r = await sql`SELECT value FROM admin_settings WHERE key='crawl_rules' LIMIT 1`;
  return { ...DEFAULT_CRAWL_RULES, ...(r.rows[0]?.value ?? {}) };
}

async function upsertVideos(brandName: string, vids: CollectedVideo[], rules: CrawlRules): Promise<number> {
  let n = 0;
  for (const v of vids) {
    if (rules.excludeOfficialAccounts && isOfficialHandle(v.handle)) continue;
    if (rules.minViews && v.views < rules.minViews) continue;
    await sql`INSERT INTO videos (video_id, brand_name, handle, views, likes, comments, shares, is_ad, is_shop, posted_at, url, collected_at)
      VALUES (${v.videoId}, ${brandName}, ${v.handle}, ${v.views}, ${v.likes}, ${v.comments}, ${v.shares}, ${v.isAd}, ${v.isShop}, ${v.date}, ${v.url}, now())
      ON CONFLICT (video_id) DO UPDATE SET views=EXCLUDED.views, likes=EXCLUDED.likes, comments=EXCLUDED.comments, shares=EXCLUDED.shares, collected_at=now()`;
    n += 1;
  }
  return n;
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
  pendingProcessed: number;
  brandsRefreshed: number;
  collected: number;
}

// 한 번의 수집 사이클 (서버리스 시간제한 고려해 소량 배치)
export async function runCollection(opts: { maxPending?: number; maxRefresh?: number } = {}): Promise<CollectSummary> {
  await ensureSchema();
  const rules = await getRules();
  const configured = scraperConfigured();
  const maxPending = opts.maxPending ?? 3;
  const maxRefresh = opts.maxRefresh ?? 5;
  let collected = 0;

  // 1) 신규 브랜드 요청 처리 (pending → active)
  const pending = await sql<{ id: number; brand_name: string; handle: string | null; hashtags: string | null }>`
    SELECT id, brand_name, handle, hashtags FROM brand_requests WHERE status='pending' ORDER BY created_at ASC LIMIT ${maxPending}`;
  for (const req of pending.rows) {
    await sql`UPDATE brand_requests SET status='collecting', updated_at=now() WHERE id=${req.id}`;
    try {
      const vids = await collectBrand({ brandName: req.brand_name, handle: req.handle, hashtags: req.hashtags, limit: 60 });
      const c = await upsertVideos(req.brand_name, vids, rules);
      collected += c;
      await sql`UPDATE brand_requests SET status='active', collected=${c}, updated_at=now() WHERE id=${req.id}`;
      await sql`INSERT INTO collection_runs (kind, target, status, collected) VALUES ('new_brand', ${req.brand_name}, 'ok', ${c})`;
    } catch (e) {
      await sql`UPDATE brand_requests SET status='pending', note=${String(e).slice(0, 200)}, updated_at=now() WHERE id=${req.id}`;
      await sql`INSERT INTO collection_runs (kind, target, status, error) VALUES ('new_brand', ${req.brand_name}, 'error', ${String(e).slice(0, 200)})`;
    }
  }

  // 2) 기존 브랜드 증분 갱신 (커서로 라운드로빈)
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  let idx = await cursor();
  let refreshed = 0;
  for (let k = 0; k < maxRefresh && BRANDS.length; k++) {
    const brand = BRANDS[idx % BRANDS.length];
    idx += 1;
    try {
      const vids = await collectBrand({ brandName: brand.name, sinceDate: since, limit: 40 });
      const c = await upsertVideos(brand.name, vids, rules);
      collected += c;
      refreshed += 1;
      if (c > 0) await sql`INSERT INTO collection_runs (kind, target, status, collected) VALUES ('refresh', ${brand.name}, 'ok', ${c})`;
    } catch (e) {
      await sql`INSERT INTO collection_runs (kind, target, status, error) VALUES ('refresh', ${brand.name}, 'error', ${String(e).slice(0, 200)})`;
    }
  }
  await setCursor(idx);

  return { configured, pendingProcessed: pending.rows.length, brandsRefreshed: refreshed, collected };
}

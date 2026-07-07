import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 태국 K-뷰티 데이터(중복 제거·병합 완료) → DB videos에 country='TH'로 적재.
// 소스: public/data/th-videos.json (컴팩트 시드). 멱등(ON CONFLICT UPDATE).
// 적재 후 브랜드/크리에이터 통계 재계산(브랜드·인플루언서 매칭 반영).
interface Seed { country: string; fields: string[]; rows: (string | number)[][] }

function originOf(req: Request): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    req.headers.get("origin") ||
    (req.headers.get("host") ? `https://${req.headers.get("host")}` : "")
  );
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const origin = originOf(req);
  if (!origin) return NextResponse.json({ error: "origin 확인 불가" }, { status: 500 });

  // 시드 로드
  let seed: Seed;
  try {
    const res = await fetch(`${origin}/data/th-videos.json`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: `시드 로드 실패 ${res.status}` }, { status: 502 });
    seed = (await res.json()) as Seed;
  } catch (e) {
    return NextResponse.json({ error: `시드 로드 오류: ${String(e).slice(0, 160)}` }, { status: 502 });
  }
  const rows = Array.isArray(seed?.rows) ? seed.rows : [];
  const country = (seed?.country || "TH").toUpperCase();
  if (!rows.length) return NextResponse.json({ error: "시드 데이터 없음" }, { status: 400 });

  // rows: [video_id, brand, handle, views, likes, comments, shares, is_ad, is_shop, date]
  const brands = new Set<string>();
  const handles = new Set<string>();
  const clean = rows
    .map((r) => {
      const [vid, brand, handle, views, likes, comments, shares, ad, shop, date] = r;
      if (!vid || !brand || !handle) return null;
      brands.add(String(brand));
      handles.add(String(handle));
      return {
        vid: String(vid), brand: String(brand), handle: String(handle),
        views: Number(views) || 0, likes: Number(likes) || 0, comments: Number(comments) || 0, shares: Number(shares) || 0,
        ad: Number(ad) === 1, shop: Number(shop) === 1, date: String(date || ""),
        url: `https://www.tiktok.com/@${handle}/video/${vid}`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  // 배치 upsert (300행 = 3600 파라미터, 안전).
  const COLS = 12;
  const CHUNK = 300;
  let inserted = 0;
  for (let i = 0; i < clean.length; i += CHUNK) {
    const batch = clean.slice(i, i + CHUNK);
    const ph = batch
      .map((_, j) => {
        const b = j * COLS;
        return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11},$${b + 12})`;
      })
      .join(",");
    const params: unknown[] = [];
    for (const v of batch) params.push(v.vid, v.brand, v.handle, v.views, v.likes, v.comments, v.shares, v.ad, v.shop, v.date, v.url, country);
    await sql.query(
      `INSERT INTO videos (video_id, brand_name, handle, views, likes, comments, shares, is_ad, is_shop, posted_at, url, country)
       VALUES ${ph}
       ON CONFLICT (video_id) DO UPDATE SET brand_name=EXCLUDED.brand_name, handle=EXCLUDED.handle,
         views=EXCLUDED.views, likes=EXCLUDED.likes, comments=EXCLUDED.comments, shares=EXCLUDED.shares,
         is_ad=EXCLUDED.is_ad, is_shop=EXCLUDED.is_shop, posted_at=EXCLUDED.posted_at, url=EXCLUDED.url,
         country=EXCLUDED.country, collected_at=now()`,
      params,
    );
    inserted += batch.length;
  }

  // 브랜드 통계 재계산(적재된 브랜드 대상) — 브랜드↔콘텐츠 매칭 반영.
  const brandList = Array.from(brands);
  await sql`
    INSERT INTO brand_stats (brand_name, videos, influencers, total_views, avg_views, max_views, shop_count, updated_at)
    SELECT brand_name, count(*)::int, count(distinct handle)::int, sum(views)::bigint,
           (sum(views)/GREATEST(count(*),1))::bigint, max(views)::bigint,
           sum(case when is_shop then 1 else 0 end)::int, now()
    FROM videos WHERE brand_name = ANY(${brandList as unknown as string}) GROUP BY brand_name
    ON CONFLICT (brand_name) DO UPDATE SET
      videos=EXCLUDED.videos, influencers=EXCLUDED.influencers, total_views=EXCLUDED.total_views,
      avg_views=EXCLUDED.avg_views, max_views=EXCLUDED.max_views, shop_count=EXCLUDED.shop_count, updated_at=now()`;

  // 크리에이터(인플루언서) 집계 재계산 — 인플루언서↔브랜드 매칭 반영.
  const handleList = Array.from(handles);
  await sql`
    INSERT INTO creators (handle, videos, total_views, avg_views, brands, updated_at)
    SELECT handle, count(*)::int, sum(views)::bigint, (sum(views)/GREATEST(count(*),1))::bigint,
           array_agg(distinct brand_name), now()
    FROM videos WHERE handle = ANY(${handleList as unknown as string}) GROUP BY handle
    ON CONFLICT (handle) DO UPDATE SET
      videos=EXCLUDED.videos, total_views=EXCLUDED.total_views, avg_views=EXCLUDED.avg_views,
      brands=EXCLUDED.brands, updated_at=now()`;

  await sql`INSERT INTO collection_runs (kind, target, status, collected) VALUES ('seed_th', ${country}, 'ok', ${inserted})`;

  return NextResponse.json({ ok: true, country, inserted, brands: brandList.length, creators: handleList.length });
}

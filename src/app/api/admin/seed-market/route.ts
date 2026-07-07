import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { COUNTRIES } from "@/data/ktrend/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 국가별 K-뷰티 시드(중복 제거·언어 필터 완료)를 DB videos에 country=<CC>로 적재.
// 소스: public/data/<cc>-videos.json. 멱등 + 클린 교체(해당 국가 기존분 제거 후 삽입).
// 국가별 언어/쿼리 필터는 시드 생성 단계에서 이미 적용됨(태국=타이어, 베트남=베트남어).
interface Seed { country: string; fields: string[]; rows: (string | number)[][] }

// 시드 가능 국가 = 활성 국가 중 US 외(US는 정적 시드).
const SEEDABLE = new Set(COUNTRIES.filter((c) => c.active && c.id !== "US").map((c) => c.id));

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

  const body = (await req.json().catch(() => ({}))) as { country?: string };
  const country = String(body?.country || "").trim().toUpperCase();
  if (!SEEDABLE.has(country)) {
    return NextResponse.json({ error: `지원하지 않는 국가: ${country || "(없음)"} (가능: ${[...SEEDABLE].join(",")})` }, { status: 400 });
  }

  const origin = originOf(req);
  if (!origin) return NextResponse.json({ error: "origin 확인 불가" }, { status: 500 });

  // 시드 로드
  let seed: Seed;
  try {
    const res = await fetch(`${origin}/data/${country.toLowerCase()}-videos.json`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: `시드 로드 실패 ${res.status} (${country})` }, { status: 502 });
    seed = (await res.json()) as Seed;
  } catch (e) {
    return NextResponse.json({ error: `시드 로드 오류: ${String(e).slice(0, 160)}` }, { status: 502 });
  }
  const rows = Array.isArray(seed?.rows) ? seed.rows : [];
  if (!rows.length) return NextResponse.json({ error: "시드 데이터 없음" }, { status: 400 });

  // rows: [video_id, brand, handle, views, likes, comments, shares, is_ad, is_shop, date, tier?]
  const brands = new Set<string>();
  const handles = new Set<string>();
  const clean = rows
    .map((r) => {
      const [vid, brand, handle, views, likes, comments, shares, ad, shop, date, tier] = r;
      if (!vid || !brand || !handle) return null;
      brands.add(String(brand));
      handles.add(String(handle));
      const t = String(tier || "");
      return {
        vid: String(vid), brand: String(brand), handle: String(handle),
        views: Number(views) || 0, likes: Number(likes) || 0, comments: Number(comments) || 0, shares: Number(shares) || 0,
        ad: Number(ad) === 1, shop: Number(shop) === 1, date: String(date || ""),
        tier: (t === "mega" || t === "macro" || t === "micro") ? t : null,
        url: `https://www.tiktok.com/@${handle}/video/${vid}`,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  // 클린 리시드: 이 국가의 기존 시드분 제거(섞여 들어간 글로벌/타국 행 정리).
  // (해당 국가 크롤링은 별도 opt-in이므로 현재 country=<CC>는 이 시드가 유일한 소스)
  await sql`DELETE FROM videos WHERE country=${country}`;

  const COLS = 13;
  const CHUNK = 300;
  let inserted = 0;
  for (let i = 0; i < clean.length; i += CHUNK) {
    const batch = clean.slice(i, i + CHUNK);
    const ph = batch
      .map((_, j) => {
        const b = j * COLS;
        return `(${Array.from({ length: COLS }, (_, k) => `$${b + k + 1}`).join(",")})`;
      })
      .join(",");
    const params: unknown[] = [];
    for (const v of batch) params.push(v.vid, v.brand, v.handle, v.views, v.likes, v.comments, v.shares, v.ad, v.shop, v.date, v.url, country, v.tier);
    await sql.query(
      `INSERT INTO videos (video_id, brand_name, handle, views, likes, comments, shares, is_ad, is_shop, posted_at, url, country, tier)
       VALUES ${ph}
       ON CONFLICT (video_id) DO UPDATE SET brand_name=EXCLUDED.brand_name, handle=EXCLUDED.handle,
         views=EXCLUDED.views, likes=EXCLUDED.likes, comments=EXCLUDED.comments, shares=EXCLUDED.shares,
         is_ad=EXCLUDED.is_ad, is_shop=EXCLUDED.is_shop, posted_at=EXCLUDED.posted_at, url=EXCLUDED.url,
         country=EXCLUDED.country, tier=EXCLUDED.tier, collected_at=now()`,
      params,
    );
    inserted += batch.length;
  }

  // 브랜드 통계 재계산(적재 브랜드) — 브랜드↔콘텐츠 매칭 반영.
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

  // 크리에이터 집계 재계산 — 인플루언서↔브랜드 매칭 반영.
  const handleList = Array.from(handles);
  await sql`
    INSERT INTO creators (handle, videos, total_views, avg_views, brands, updated_at)
    SELECT handle, count(*)::int, sum(views)::bigint, (sum(views)/GREATEST(count(*),1))::bigint,
           array_agg(distinct brand_name), now()
    FROM videos WHERE handle = ANY(${handleList as unknown as string}) GROUP BY handle
    ON CONFLICT (handle) DO UPDATE SET
      videos=EXCLUDED.videos, total_views=EXCLUDED.total_views, avg_views=EXCLUDED.avg_views,
      brands=EXCLUDED.brands, updated_at=now()`;

  await sql`INSERT INTO collection_runs (kind, target, status, collected) VALUES ('seed_market', ${country}, 'ok', ${inserted})`;

  return NextResponse.json({ ok: true, country, inserted, brands: brandList.length, creators: handleList.length });
}

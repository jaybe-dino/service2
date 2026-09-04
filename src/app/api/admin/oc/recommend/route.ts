import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { BRAND_BY_NORM, normKey } from "@/data/ktrend/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 제품 맞춤 크리에이터 추천 — 냉정한 v1: ①유사 제품 이력(동일 브랜드 판매) ②유사 콘텐츠 이력(동일
// 카테고리 브랜드 판매) ③활성도(최근 영상일) 3축 + 정량 필터(국가·팔로워·이메일)·수량.
// 점수 = 동일브랜드(≤50) + 동일카테고리(≤30) + 활성도(≤20).

const CAT_KW: [RegExp, string][] = [
  [/스킨|더마|진정|토너|세럼|크림|클렌|선케어|선크림|마스크|팩|앰플|에센스|skincare/i, "skincare"],
  [/메이크업|립|색조|쿠션|파운데|아이|블러셔|틴트|makeup/i, "makeup"],
  [/헤어|샴푸|트리트|염색|두피|hair/i, "haircare"],
];
function productCat(category: string | null): string | null {
  for (const [re, cat] of CAT_KW) if (re.test(category || "")) return cat;
  return null;
}
// kb 브랜드명 → 카테고리 (정적 브랜드 마스터 474종 철자 정규화 매칭)
function brandCat(name: string): string | null {
  return BRAND_BY_NORM[normKey(name)]?.category ?? null;
}

interface Body {
  productId?: number; country?: string; count?: number;
  emailOnly?: boolean; followersMin?: number; followersMax?: number;
  action?: string; emails?: string[]; // materialize: 추천 결과를 oc_creators로 편입
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as Body;

  // 추천 확정 → oc_creators로 비파괴 병합(기존 편입 규칙과 동일) 후 이메일 목록 반환
  if (b.action === "materialize") {
    const emails = Array.from(new Set((b.emails || []).map((e) => String(e).trim().toLowerCase()).filter(Boolean))).slice(0, 5000);
    if (!emails.length) return NextResponse.json({ error: "emails 필요" }, { status: 400 });
    await sql.query(
      `INSERT INTO oc_creators AS t (handle, profile_url, email, contact_status, videos, total_views, avg_views, brands, region, source_list, source_creator_id)
       SELECT DISTINCT ON (lower(ltrim(handle,'@'))) lower(ltrim(handle,'@')), tiktok_url, NULLIF(email,''), 'kb_' || mapping_tier,
         COALESCE(kb_videos,0), COALESCE(kb_plays,0), COALESCE(aff_avg_plays,0), NULLIF(kb_brands,''), region, 'kb-recommend', creator_uid
       FROM kb_creators WHERE lower(email) = ANY($1::text[]) AND handle IS NOT NULL AND ltrim(handle,'@') <> ''
       ORDER BY lower(ltrim(handle,'@')), kb_rpm_usd DESC NULLS LAST
       ON CONFLICT (handle) DO UPDATE SET
         email = COALESCE(NULLIF(t.email,''), EXCLUDED.email),
         brands = COALESCE(NULLIF(t.brands,''), EXCLUDED.brands),
         region = COALESCE(NULLIF(t.region,''), EXCLUDED.region)`, [emails]);
    return NextResponse.json({ ok: true, emails });
  }

  // 제품 컨텍스트
  const p = (await sql`SELECT id, name, brand, category, country FROM oc_products WHERE id = ${Number(b.productId) || 0}`).rows[0];
  if (!p) return NextResponse.json({ error: "제품을 먼저 선택하세요" }, { status: 400 });

  // 매칭 브랜드 집합 구성 — 동일 브랜드 / 동일 카테고리 브랜드 (kb_brands 마스터 기준)
  const kbBrands = (await sql`SELECT brand_en FROM kb_brands`).rows.map((r) => String(r.brand_en));
  const pKey = normKey(String(p.brand || ""));
  const pCat = productCat(p.category);
  const sameBrands = kbBrands.filter((n) => normKey(n) === pKey);
  const catBrands = pCat ? kbBrands.filter((n) => brandCat(n) === pCat) : [];
  if (!sameBrands.length && !catBrands.length) {
    return NextResponse.json({ error: `매칭 기준 없음 — 제품 브랜드(${p.brand || "미입력"})가 kb 브랜드에 없고 카테고리(${p.category || "미입력"})도 분류 불가`, rows: [] }, { status: 400 });
  }

  const count = Math.min(Math.max(1, Number(b.count) || 100), 2000);
  const country = String(b.country || p.country || "").toUpperCase();
  const cond: string[] = [];
  const params: unknown[] = [sameBrands, catBrands];
  const q = (v: unknown) => { params.push(v); return `$${params.length}`; };
  if (["US", "TH", "VN"].includes(country)) cond.push(`c.region = ${q(country)}`);
  if (b.emailOnly !== false) cond.push(`c.email IS NOT NULL AND c.email <> ''`); // 기본: 이메일 보유만
  if (Number.isFinite(b.followersMin)) cond.push(`c.followers >= ${q(Math.floor(b.followersMin!))}`);
  if (Number.isFinite(b.followersMax)) cond.push(`c.followers <= ${q(Math.floor(b.followersMax!))}`);
  params.push(count);

  // 점수: 동일브랜드 영상수×12(≤50) + 카테고리 영상수×2(≤30) + 활성도(90일 내 선형, ≤20)
  const { rows } = await sql.query(
    `WITH aff AS (
       SELECT creator_uid,
         SUM(CASE WHEN brand_en = ANY($1::text[]) THEN video_count ELSE 0 END)::int AS same_videos,
         SUM(CASE WHEN brand_en = ANY($2::text[]) THEN video_count ELSE 0 END)::int AS cat_videos,
         SUM(CASE WHEN brand_en = ANY($1::text[]) OR brand_en = ANY($2::text[]) THEN gmv_usd ELSE 0 END) AS rel_gmv
       FROM kb_creator_brand
       GROUP BY creator_uid
       HAVING SUM(CASE WHEN brand_en = ANY($1::text[]) OR brand_en = ANY($2::text[]) THEN video_count ELSE 0 END) > 0
     )
     SELECT c.creator_uid, c.handle, c.nickname, c.region, c.followers, c.email, c.mapping_tier,
       c.kb_rpm_usd, c.kb_brands, c.tiktok_url, c.kb_last_video_at,
       a.same_videos, a.cat_videos, ROUND(a.rel_gmv)::bigint AS rel_gmv,
       (LEAST(50, a.same_videos * 12)
        + LEAST(30, a.cat_videos * 2)
        + GREATEST(0, LEAST(20, ROUND(20 * (1 - EXTRACT(EPOCH FROM (now() - COALESCE(c.kb_last_video_at, now() - interval '180 days'))) / 7776000))))
       )::int AS score
     FROM aff a JOIN kb_creators c USING (creator_uid)
     ${cond.length ? "WHERE " + cond.join(" AND ") : ""}
     ORDER BY score DESC, c.kb_rpm_usd DESC NULLS LAST
     LIMIT $${params.length}`, params);

  return NextResponse.json({
    product: { id: p.id, name: p.name, brand: p.brand, category: p.category },
    basis: { sameBrands, catBrandCount: catBrands.length, category: pCat },
    total: rows.length,
    rows,
  });
}

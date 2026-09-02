import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// K-Beauty 세그먼트 빌더 — kb_creators 필터 검색 + CSV 내보내기용 페이징.
// 03_views.sql의 운영 뷰(v_outreach_ready, v_micro_high_rpm, v_cold_pool 등)를 필터 조합으로 커버.

interface SegFilter {
  regions?: string[];        // US | TH | VN
  tiers?: string[];          // M1 | M3 | M4 | M5
  followersMin?: number;
  followersMax?: number;
  emailOnly?: boolean;       // email 있는 행만
  contactAny?: boolean;      // 아무 연락 채널이라도 있는 행만
  brand?: string;            // kb_creator_brand 조인 (리빌드 후 사용 가능)
  rpmMin?: number;           // kb_rpm_usd 하한
  kbBrandsMin?: number;      // 판매한 한국 브랜드 수 하한
  platform?: string;         // messaging_platforms LIKE (LINE, Zalo, WhatsApp ...)
}

function buildWhere(f: SegFilter): { where: string; params: unknown[] } {
  const cond: string[] = [];
  const params: unknown[] = [];
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };
  const REGIONS = new Set(["US", "TH", "VN"]);
  const TIERS = new Set(["M1", "M3", "M4", "M5"]);

  const regions = (f.regions || []).filter((r) => REGIONS.has(r));
  if (regions.length) cond.push(`region = ANY(${p(regions)}::text[])`);
  const tiers = (f.tiers || []).filter((t) => TIERS.has(t));
  if (tiers.length) cond.push(`mapping_tier = ANY(${p(tiers)}::text[])`);
  if (Number.isFinite(f.followersMin)) cond.push(`followers >= ${p(Math.floor(f.followersMin!))}`);
  if (Number.isFinite(f.followersMax)) cond.push(`followers <= ${p(Math.floor(f.followersMax!))}`);
  if (f.emailOnly) cond.push(`email IS NOT NULL AND email <> ''`);
  if (f.contactAny) cond.push(`contact_channels IS NOT NULL AND contact_channels <> ''`);
  if (Number.isFinite(f.rpmMin) && f.rpmMin! > 0) cond.push(`kb_rpm_usd >= ${p(f.rpmMin)}`);
  if (Number.isFinite(f.kbBrandsMin) && f.kbBrandsMin! > 0) cond.push(`kb_brands_count >= ${p(Math.floor(f.kbBrandsMin!))}`);
  if (f.platform?.trim()) cond.push(`messaging_platforms ILIKE ${p("%" + f.platform.trim() + "%")}`);
  if (f.brand?.trim()) cond.push(`creator_uid IN (SELECT creator_uid FROM kb_creator_brand WHERE brand_en = ${p(f.brand.trim())})`);
  return { where: cond.length ? "WHERE " + cond.join(" AND ") : "", params };
}

// GET — 브랜드 드롭다운(파생 리빌드 후 채워짐)
export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const { rows } = await sql`SELECT brand_en, creator_count, total_gmv_usd FROM kb_brands ORDER BY total_gmv_usd DESC NULLS LAST LIMIT 300`;
  return NextResponse.json({ brands: rows });
}

// POST { filter, limit?, offset?, countOnly? } → { count, withEmail, rows }
// POST { action:'toOutreach', filter, cap? } → 세그먼트를 oc_creators(메일링 대상)로 병합 편입.
//   병합 규칙(비파괴): 기존 행의 이메일·브랜드·지역·프로필은 비어있을 때만 채움, 지표는 GREATEST.
//   handle 없는 행(M5 다수)은 편입 불가 → skipped로 집계. 재실행해도 안전(멱등).
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as { action?: string; filter?: SegFilter; limit?: number; offset?: number; countOnly?: boolean; cap?: number };

  if (b.action === "toOutreach") {
    const { where, params } = buildWhere(b.filter || {});
    const cap = Math.min(Math.max(1, b.cap || 100_000), 200_000);
    try {
      const totalQ = await sql.query(`SELECT COUNT(*)::int AS n FROM kb_creators ${where}`, params);
      const total = totalQ.rows[0].n as number;
      params.push(cap);
      const r = await sql.query(
        `INSERT INTO oc_creators AS t (handle, profile_url, email, contact_status, videos, total_views, avg_views, brands, region, source_list, source_creator_id)
         SELECT DISTINCT ON (lower(ltrim(handle, '@')))
           lower(ltrim(handle, '@')), tiktok_url, NULLIF(email, ''), 'kb_' || mapping_tier,
           COALESCE(kb_videos, 0), COALESCE(kb_plays, 0), COALESCE(aff_avg_plays, 0),
           NULLIF(kb_brands, ''), region, 'kbeauty-dataset', creator_uid
         FROM kb_creators ${where ? where + " AND" : "WHERE"} handle IS NOT NULL AND ltrim(handle, '@') <> ''
         ORDER BY lower(ltrim(handle, '@')), kb_rpm_usd DESC NULLS LAST
         LIMIT $${params.length}
         ON CONFLICT (handle) DO UPDATE SET
           email = COALESCE(NULLIF(t.email, ''), EXCLUDED.email),
           profile_url = COALESCE(NULLIF(t.profile_url, ''), EXCLUDED.profile_url),
           brands = COALESCE(NULLIF(t.brands, ''), EXCLUDED.brands),
           region = COALESCE(NULLIF(t.region, ''), EXCLUDED.region),
           contact_status = COALESCE(NULLIF(t.contact_status, ''), EXCLUDED.contact_status),
           videos = GREATEST(COALESCE(t.videos, 0), COALESCE(EXCLUDED.videos, 0)),
           total_views = GREATEST(COALESCE(t.total_views, 0), COALESCE(EXCLUDED.total_views, 0)),
           avg_views = GREATEST(COALESCE(t.avg_views, 0), COALESCE(EXCLUDED.avg_views, 0)),
           source_creator_id = COALESCE(NULLIF(t.source_creator_id, ''), EXCLUDED.source_creator_id)
         RETURNING (xmax = 0) AS inserted`, params);
      let inserted = 0, updated = 0;
      for (const row of r.rows) { if (row.inserted) inserted++; else updated++; }
      return NextResponse.json({ ok: true, total, inserted, updated, skipped: Math.max(0, total - inserted - updated), capped: total > cap });
    } catch (e) {
      return NextResponse.json({ error: String(e instanceof Error ? e.message : e).slice(0, 300) }, { status: 500 });
    }
  }
  const filter = b.filter || {};
  const limit = Math.min(Math.max(1, b.limit || 100), 5000);
  const offset = Math.max(0, b.offset || 0);
  const { where, params } = buildWhere(filter);

  try {
    if (b.countOnly) {
      const c = await sql.query(
        `SELECT COUNT(*)::int AS count,
                COUNT(*) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS with_email
         FROM kb_creators ${where}`, params);
      return NextResponse.json({ count: c.rows[0].count, withEmail: c.rows[0].with_email });
    }
    const [c, r] = await Promise.all([
      sql.query(
        `SELECT COUNT(*)::int AS count,
                COUNT(*) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS with_email
         FROM kb_creators ${where}`, params),
      sql.query(
        `SELECT creator_uid, handle, nickname, region, followers, mapping_tier,
                email, instagram_id, messaging_platforms, contact_channels,
                kb_videos, kb_brands_count, kb_brands, kb_video_gmv_usd, kb_rpm_usd, tiktok_url
         FROM kb_creators ${where}
         ORDER BY kb_rpm_usd DESC NULLS LAST, followers DESC
         LIMIT ${limit} OFFSET ${offset}`, params),
    ]);
    return NextResponse.json({ count: c.rows[0].count, withEmail: c.rows[0].with_email, rows: r.rows });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e).slice(0, 300) }, { status: 500 });
  }
}

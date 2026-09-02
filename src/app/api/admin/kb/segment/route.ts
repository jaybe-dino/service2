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
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as { filter?: SegFilter; limit?: number; offset?: number; countOnly?: boolean };
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

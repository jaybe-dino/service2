import { NextResponse } from "next/server";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 글로벌 크리에이터 DB(kb_creators) — 플랫폼 노출용 조회 API.
// 접근: Pro/Advance/체험/관리자 (요금제 BM: "인플루언서 전체 DB 접근(성과·컨택)"은 Pro부터).
// M5(식별자만 있는 행)는 제외 — 서비스 가치가 없는 27만 행으로 목록이 희석되는 것 방지.

async function isProUser(): Promise<boolean> {
  if (await isAdminAuthed()) return true;
  const u = await getCurrentUser();
  if (!u) return false;
  return u.plan === "pro" || u.plan === "enterprise" || (u.pro_until || 0) > Date.now();
}

export async function GET(req: Request) {
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  if (!(await isProUser())) return NextResponse.json({ error: "Pro 전용" }, { status: 403 });
  await ensureSchema();

  const u = new URL(req.url);
  const region = (u.searchParams.get("region") || "").toUpperCase();
  const tier = (u.searchParams.get("tier") || "").toUpperCase();
  const q = (u.searchParams.get("q") || "").trim();
  const contact = u.searchParams.get("contact") === "1";
  const sort = u.searchParams.get("sort") || "rpm";
  const page = Math.max(0, Number(u.searchParams.get("page")) || 0);
  const PAGE = 50;

  const cond: string[] = [`mapping_tier <> 'M5'`];
  const params: unknown[] = [];
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };
  if (["US", "TH", "VN"].includes(region)) cond.push(`region = ${p(region)}`);
  if (["M1", "M3", "M4"].includes(tier)) cond.push(`mapping_tier = ${p(tier)}`);
  if (contact) cond.push(`contact_channels IS NOT NULL AND contact_channels <> ''`);
  if (q) cond.push(`(handle ILIKE ${p("%" + q + "%")} OR nickname ILIKE ${p("%" + q + "%")} OR kb_brands ILIKE ${p("%" + q + "%")})`);
  const where = "WHERE " + cond.join(" AND ");
  const order = sort === "followers" ? "followers DESC" : sort === "gmv" ? "kb_video_gmv_usd DESC NULLS LAST" : "kb_rpm_usd DESC NULLS LAST, followers DESC";

  try {
    const [cnt, rows] = await Promise.all([
      sql.query(`SELECT COUNT(*)::int AS n FROM kb_creators ${where}`, params),
      sql.query(
        `SELECT creator_uid, handle, nickname, region, followers, mapping_tier,
                email, instagram_id, messaging_platforms,
                kb_videos, kb_brands_count, kb_brands, kb_video_gmv_usd, kb_rpm_usd, tiktok_url
         FROM kb_creators ${where} ORDER BY ${order} LIMIT ${PAGE} OFFSET ${page * PAGE}`, params),
    ]);
    return NextResponse.json({ total: cnt.rows[0].n, page, pageSize: PAGE, rows: rows.rows });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e).slice(0, 200) }, { status: 500 });
  }
}

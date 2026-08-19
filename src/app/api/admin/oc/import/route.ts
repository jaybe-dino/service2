import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 크리에이터 CSV 청크 업로드 → oc_creators 업서트.
// 클라이언트가 브라우저에서 CSV를 파싱해 500행 단위 JSON으로 전송(Vercel 4.5MB 바디 제한 회피).
// body: { rows: Array<Record<string,string>> }  (원본 CSV 컬럼명 그대로)

type Row = Record<string, string>;
const toInt = (v: unknown): number | null => {
  const n = parseInt(String(v ?? "").replace(/,/g, "").trim(), 10);
  return Number.isFinite(n) ? n : null;
};
const clean = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s ? s.slice(0, 2000) : null;
};

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  let body: { rows?: Row[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "본문 파싱 실패" }, { status: 400 }); }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return NextResponse.json({ error: "rows 없음" }, { status: 400 });
  if (rows.length > 1000) return NextResponse.json({ error: "청크당 최대 1000행" }, { status: 400 });

  // (handle, profile_url, email, email_source_url, contact_status, videos, total_views, avg_views, brands, region, source_list, source_creator_id, reviewed_at)
  const cols = 13;
  const values: unknown[] = [];
  const tuples: string[] = [];
  let skipped = 0;
  for (const r of rows) {
    const handle = clean(r.handle);
    if (!handle) { skipped++; continue; }
    const base = values.length;
    values.push(
      handle,
      clean(r.profile_url),
      clean(r.public_email),
      clean(r.email_source_url),
      clean(r.contact_status),
      toInt(r.videos),
      toInt(r.total_views),
      toInt(r.avg_views),
      clean(r.brands),
      clean(r.region),
      clean(r.source_list),
      clean(r.source_creator_id),
      clean(r.reviewed_at_utc),
    );
    const ph = Array.from({ length: cols }, (_, i) => `$${base + i + 1}`);
    tuples.push(`(${ph.join(",")})`);
  }
  if (!tuples.length) return NextResponse.json({ inserted: 0, skipped });

  const q = `INSERT INTO oc_creators
    (handle, profile_url, email, email_source_url, contact_status, videos, total_views, avg_views, brands, region, source_list, source_creator_id, reviewed_at)
    VALUES ${tuples.join(",")}
    ON CONFLICT (handle) DO UPDATE SET
      profile_url = COALESCE(EXCLUDED.profile_url, oc_creators.profile_url),
      email = COALESCE(EXCLUDED.email, oc_creators.email),
      email_source_url = COALESCE(EXCLUDED.email_source_url, oc_creators.email_source_url),
      contact_status = COALESCE(EXCLUDED.contact_status, oc_creators.contact_status),
      videos = COALESCE(EXCLUDED.videos, oc_creators.videos),
      total_views = COALESCE(EXCLUDED.total_views, oc_creators.total_views),
      avg_views = COALESCE(EXCLUDED.avg_views, oc_creators.avg_views),
      brands = COALESCE(EXCLUDED.brands, oc_creators.brands),
      region = COALESCE(EXCLUDED.region, oc_creators.region),
      source_list = COALESCE(EXCLUDED.source_list, oc_creators.source_list),
      source_creator_id = COALESCE(EXCLUDED.source_creator_id, oc_creators.source_creator_id),
      reviewed_at = COALESCE(EXCLUDED.reviewed_at, oc_creators.reviewed_at)`;
  try {
    await sql.query(q, values);
    return NextResponse.json({ inserted: tuples.length, skipped });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e).slice(0, 200) }, { status: 500 });
  }
}

// 현재 적재 현황
export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const { rows } = await sql`SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS with_email,
    MAX(imported_at) AS last_import
    FROM oc_creators`;
  return NextResponse.json(rows[0] || { total: 0, with_email: 0 });
}

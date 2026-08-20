import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 매핑 점검 — 업로드한 oc_creators 가 기존 크리에이터 데이터(creators 분석 테이블)와
// 공통 키(handle / email)로 얼마나 연결되는지 확인.
export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const oc = (await sql`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS with_email FROM oc_creators`).rows[0];
  const cr = (await sql`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS with_email FROM creators`).rows[0];

  // handle 기준 교집합 (정확 + 대소문자 무시)
  const hExact = (await sql`SELECT COUNT(*)::int AS n FROM oc_creators o
      WHERE EXISTS (SELECT 1 FROM creators c WHERE c.handle = o.handle)`).rows[0]?.n || 0;
  const hCi = (await sql`SELECT COUNT(*)::int AS n FROM oc_creators o
      WHERE EXISTS (SELECT 1 FROM creators c WHERE lower(c.handle) = lower(o.handle))`).rows[0]?.n || 0;

  // email 기준 교집합
  const eMatch = (await sql`SELECT COUNT(*)::int AS n FROM oc_creators o
      WHERE o.email IS NOT NULL AND o.email <> ''
        AND EXISTS (SELECT 1 FROM creators c WHERE lower(c.email) = lower(o.email))`).rows[0]?.n || 0;

  // 아웃리치 CRM(outreach_targets) 와의 연결
  const targets = (await sql`SELECT COUNT(DISTINCT o.handle)::int AS n FROM oc_creators o
      WHERE EXISTS (SELECT 1 FROM outreach_targets t WHERE t.handle = o.handle)`).rows[0]?.n || 0;

  // 매칭 샘플(양쪽 avg_views 비교)
  const matched = (await sql`SELECT o.handle, o.avg_views AS oc_avg, c.avg_views AS cr_avg, o.email
      FROM oc_creators o JOIN creators c ON c.handle = o.handle
      ORDER BY o.avg_views DESC NULLS LAST LIMIT 8`).rows;
  // 업로드에만 있는(신규) 샘플
  const onlyOc = (await sql`SELECT o.handle, o.avg_views, o.email FROM oc_creators o
      WHERE NOT EXISTS (SELECT 1 FROM creators c WHERE c.handle = o.handle)
      ORDER BY o.avg_views DESC NULLS LAST LIMIT 8`).rows;

  const total = oc?.total || 0;
  return NextResponse.json({
    oc, creators: cr,
    overlap_handle: hExact,
    overlap_handle_ci: hCi,
    overlap_email: eMatch,
    only_in_oc: total - hExact,
    linked_targets: targets,
    match_rate: total ? Math.round((hExact / total) * 1000) / 10 : 0,
    sample_matched: matched,
    sample_only_oc: onlyOc,
  });
}

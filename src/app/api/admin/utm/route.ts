import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// UTM 유입 데이터 집계 (어드민)
export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ bySource: [], byCampaign: [], byMedium: [], recent: [], totals: { visits: 0, signups: 0 } });
  await ensureSchema();

  const bySource = await sql`
    SELECT COALESCE(NULLIF(source,''),'(미지정)') AS key,
      SUM(CASE WHEN kind='visit' THEN 1 ELSE 0 END)::int AS visits,
      SUM(CASE WHEN kind='signup' THEN 1 ELSE 0 END)::int AS signups
    FROM utm_events GROUP BY 1 ORDER BY visits DESC LIMIT 50`;
  const byCampaign = await sql`
    SELECT COALESCE(NULLIF(campaign,''),'(미지정)') AS key,
      SUM(CASE WHEN kind='visit' THEN 1 ELSE 0 END)::int AS visits,
      SUM(CASE WHEN kind='signup' THEN 1 ELSE 0 END)::int AS signups
    FROM utm_events GROUP BY 1 ORDER BY visits DESC LIMIT 50`;
  const byMedium = await sql`
    SELECT COALESCE(NULLIF(medium,''),'(미지정)') AS key,
      SUM(CASE WHEN kind='visit' THEN 1 ELSE 0 END)::int AS visits,
      SUM(CASE WHEN kind='signup' THEN 1 ELSE 0 END)::int AS signups
    FROM utm_events GROUP BY 1 ORDER BY visits DESC LIMIT 50`;
  const recent = await sql`SELECT kind, source, medium, campaign, content, user_email, created_at FROM utm_events ORDER BY created_at DESC LIMIT 100`;
  const totals = await sql`SELECT
      SUM(CASE WHEN kind='visit' THEN 1 ELSE 0 END)::int AS visits,
      SUM(CASE WHEN kind='signup' THEN 1 ELSE 0 END)::int AS signups FROM utm_events`;

  return NextResponse.json({
    bySource: bySource.rows, byCampaign: byCampaign.rows, byMedium: byMedium.rows,
    recent: recent.rows, totals: totals.rows[0] ?? { visits: 0, signups: 0 },
  });
}

import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 제품↔크리에이터 매칭(kalodata형) — 브랜드 이력(oc_creators.brands) 기반.
// 특정 브랜드의 제품과 궁합이 맞는(그 브랜드 콘텐츠 경험이 있는) 크리에이터를 추린다.
// GET ?brand=...&minAvg=&hasEmail=1&limit=
export async function GET(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const u = new URL(req.url);
  const brand = (u.searchParams.get("brand") || "").trim();
  if (!brand) return NextResponse.json({ error: "brand 필요" }, { status: 400 });
  const minAvg = Number(u.searchParams.get("minAvg")) || 0;
  const hasEmail = u.searchParams.get("hasEmail") === "1";
  const limit = Math.min(Math.max(1, Number(u.searchParams.get("limit")) || 100), 500);

  const cond = [`brands ILIKE $1`];
  const params: unknown[] = [`%${brand}%`];
  if (minAvg > 0) { params.push(minAvg); cond.push(`avg_views >= $${params.length}`); }
  if (hasEmail) cond.push(`email IS NOT NULL AND email <> ''`);

  const rows = await sql.query(
    `SELECT handle, email, avg_views, total_views, videos, brands, region
     FROM oc_creators WHERE ${cond.join(" AND ")}
     ORDER BY avg_views DESC NULLS LAST LIMIT ${limit}`,
    params,
  );
  const cnt = await sql.query(
    `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS with_email
     FROM oc_creators WHERE ${cond.join(" AND ")}`,
    params,
  );
  return NextResponse.json({ brand, count: cnt.rows[0]?.n || 0, withEmail: cnt.rows[0]?.with_email || 0, rows: rows.rows });
}

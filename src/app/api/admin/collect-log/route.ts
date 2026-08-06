import { NextResponse } from "next/server";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 수집·적재 결과 로그(관리자) — collection_runs 최근 이력 + 제품/이미지 적재 현황(국가별).
export async function GET(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const kind = new URL(req.url).searchParams.get("kind") || ""; // shop|ingest|kick_shop 등 필터(선택)

  // 최근 수집 실행 로그
  const runs = await sql<{ id: number; kind: string; target: string | null; status: string; collected: number; error: string | null; created_at: string }>`
    SELECT id, kind, target, status, collected, error, created_at FROM collection_runs
    WHERE (${kind} = '' OR kind = ${kind})
    ORDER BY created_at DESC LIMIT 80`;

  // 제품 적재 현황 — 국가별 총/이미지/커미션 + 최근 적재 시각
  const stats = await sql<{ country: string; products: number; with_image: number; with_commission: number; last_collected: string | null }>`
    SELECT upper(coalesce(country,'US')) AS country,
           count(*)::int AS products,
           count(*) FILTER (WHERE image_url IS NOT NULL AND image_url <> '')::int AS with_image,
           count(*) FILTER (WHERE commission_rate IS NOT NULL)::int AS with_commission,
           max(collected_at) AS last_collected
    FROM products GROUP BY upper(coalesce(country,'US')) ORDER BY products DESC`;

  // 샵 잡 상태 요약(진행/완료/실패)
  const jobs = await sql<{ status: string; n: number }>`
    SELECT status, count(*)::int AS n FROM collect_jobs WHERE kind='shop' GROUP BY status`;
  const jobCounts: Record<string, number> = {};
  for (const j of jobs.rows) jobCounts[j.status] = Number(j.n) || 0;

  const totalProducts = stats.rows.reduce((s, r) => s + Number(r.products), 0);
  const totalImage = stats.rows.reduce((s, r) => s + Number(r.with_image), 0);

  return NextResponse.json({
    ok: true,
    summary: { totalProducts, totalImage, imagePct: totalProducts ? Math.round((totalImage / totalProducts) * 100) : 0 },
    byCountry: stats.rows,
    shopJobs: jobCounts,
    runs: runs.rows,
  });
}

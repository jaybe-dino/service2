import { NextResponse } from "next/server";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { fetchApifyRun } from "@/lib/collector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 진단(관리자) — 샵 잡 각각의 실제 Apify run 상태 + 원본 상품 1건(매핑 확인용).
// '9개 shop running인데 productsCount 0' 원인: run이 아직 안 끝났나 / 끝났는데 안 잡히나 / 필드 안 맞나.
export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const token = process.env.SCRAPER_API_KEY || "";

  const jobs = await sql<{ run_id: string; brand_name: string; region: string | null; status: string }>`
    SELECT run_id, brand_name, region, status FROM collect_jobs WHERE kind='shop' ORDER BY created_at DESC LIMIT 9`;

  const out: unknown[] = [];
  let rawSample: unknown = null; // actor 출력 원본 1건(필드명 확인 → mapShopItems 조정)
  for (const j of jobs.rows) {
    let apifyStatus = "?", datasetId: string | undefined, itemCount: number | null = null;
    try {
      const run = await fetchApifyRun(j.run_id);
      apifyStatus = run.status;
      datasetId = run.datasetId;
      if (datasetId) {
        const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true&limit=2`);
        if (res.ok) {
          const items = (await res.json()) as unknown[];
          itemCount = Array.isArray(items) ? items.length : 0;
          if (!rawSample && Array.isArray(items) && items[0]) rawSample = items[0];
        }
      }
    } catch (e) {
      apifyStatus = `ERR: ${String(e).slice(0, 80)}`;
    }
    out.push({ brand: j.brand_name, region: j.region, dbStatus: j.status, apifyStatus, datasetId: datasetId || null, itemCount });
  }
  return NextResponse.json({
    shopJobs: out,
    rawSample,
    note: "apifyStatus로 run 상태(RUNNING/SUCCEEDED/FAILED) 확인. SUCCEEDED인데 itemCount 0이면 검색결과 없음. rawSample로 actor 출력 필드명 확인.",
  });
}

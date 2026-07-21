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
  // 매핑을 정확히 맞추려면 필드명이 핵심 → 최상위/중첩 키 목록도 함께.
  const rawSampleKeys = rawSample && typeof rawSample === "object" ? Object.keys(rawSample as Record<string, unknown>) : [];
  const nestedKeys: Record<string, string[]> = {};
  if (rawSample && typeof rawSample === "object") {
    for (const [k, v] of Object.entries(rawSample as Record<string, unknown>)) {
      if (v && typeof v === "object" && !Array.isArray(v)) nestedKeys[k] = Object.keys(v as Record<string, unknown>).slice(0, 20);
    }
  }
  return NextResponse.json({
    shopJobs: out,
    rawSampleKeys,   // 최상위 필드명 — 이거만 봐도 매핑 가능
    nestedKeys,      // 중첩 객체 필드명(제목/가격이 안쪽에 있는 경우)
    rawSample,       // 원본 1건 전체
    note: "rawSampleKeys/nestedKeys를 보고 제목·가격·판매량 필드명을 찾음. SUCCEEDED인데 itemCount 0이면 검색결과 없음.",
  });
}

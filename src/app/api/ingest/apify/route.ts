import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/db";
import { fetchApifyDataset } from "@/lib/collector";
import { ingestVideos } from "@/lib/collect-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// B안 수집 webhook 수신점.
// Apify run 완료 시 호출 → dataset을 가져와 dedup 적재 + 통계/인플루언서 재계산.
// 보안: ?secret=<INGEST_SECRET 또는 CRON_SECRET> 일치 필요.
// 페이로드: { brandName, datasetId, runId }  (startApifyRun의 payloadTemplate과 일치)
function authorized(req: Request): boolean {
  const secret = process.env.INGEST_SECRET || process.env.CRON_SECRET;
  if (!secret) return true; // 미설정 시 개방(개발용) — 운영은 반드시 설정
  const url = new URL(req.url);
  const got = url.searchParams.get("secret") || req.headers.get("x-ingest-secret");
  return got === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("forbidden", { status: 403 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    brandName?: string;
    region?: string;
    datasetId?: string;
    resource?: { defaultDatasetId?: string };
  };
  const brandName = String(body.brandName ?? "").trim();
  const region = String(body.region ?? "US").trim().toUpperCase() || "US";
  const datasetId = body.datasetId || body.resource?.defaultDatasetId;
  if (!brandName || !datasetId) {
    return NextResponse.json({ error: "brandName/datasetId 필요" }, { status: 400 });
  }

  try {
    const vids = await fetchApifyDataset(datasetId);
    const collected = await ingestVideos(brandName, vids, region);
    return NextResponse.json({ ok: true, brand: brandName, collected });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 500 });
  }
}

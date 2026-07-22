import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/db";
import { fetchApifyDataset, fetchShopDataset } from "@/lib/collector";
import { ingestVideos, ingestProducts } from "@/lib/collect-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// B안 수집 webhook 수신점.
// Apify run 완료 시 호출 → dataset을 가져와 dedup 적재 + 통계/인플루언서 재계산.
// 보안: ?secret=<INGEST_SECRET 또는 CRON_SECRET> 일치 필요.
// 페이로드: { brandName, datasetId, runId, kind?, region? }  (startApifyRun/startShopRun의 payloadTemplate과 일치)
function authorized(req: Request): boolean {
  const secret = process.env.INGEST_SECRET || process.env.CRON_SECRET;
  if (!secret) return true; // 미설정 시 개방(개발용) — 운영은 반드시 설정
  const url = new URL(req.url);
  const got = url.searchParams.get("secret") || req.headers.get("x-ingest-secret");
  return got === secret;
}

// Apify dataset id는 영숫자/대시 20자 내외. 테스트 webhook은 미치환 템플릿("{{...}}")을 보내 500을 유발 →
// 유효 id만 통과시키고 나머지는 200(무시)로 응답해 오류 스파이크를 막는다(폴링이 본 경로라 안전).
function validDatasetId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9._-]{6,40}$/.test(id) && !id.includes("{{");
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("forbidden", { status: 403 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as {
    brandName?: string;
    region?: string;
    datasetId?: string;
    kind?: string;
    resource?: { defaultDatasetId?: string };
  };
  const brandName = String(body.brandName ?? "").trim();
  const region = String(body.region ?? "US").trim().toUpperCase() || "US";
  const datasetId = body.datasetId || body.resource?.defaultDatasetId;
  const kind = String(body.kind ?? "").trim().toLowerCase();

  // 미치환 템플릿/테스트 webhook/누락 → 200 ignored (500 대신). 실제 적재는 크론 폴링이 담당.
  if (!brandName || !validDatasetId(datasetId)) {
    return NextResponse.json({ ok: true, ignored: true, reason: "invalid or template datasetId/brand" });
  }

  try {
    if (kind === "shop") {
      const products = await fetchShopDataset(datasetId, brandName);
      const collected = await ingestProducts(brandName, products, region);
      return NextResponse.json({ ok: true, kind: "shop", brand: brandName, collected });
    }
    const vids = await fetchApifyDataset(datasetId);
    const collected = await ingestVideos(brandName, vids, region);
    return NextResponse.json({ ok: true, brand: brandName, collected });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 500 });
  }
}

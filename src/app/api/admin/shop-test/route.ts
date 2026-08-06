import { NextResponse } from "next/server";
import { isConfigured, ensureSchema } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { runShopSync } from "@/lib/collector";
import { ingestProducts } from "@/lib/collect-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 샵 정밀 테스트(관리자) — 브랜드 1개를 동기 크롤 → actor 원본 + 우리 매핑(이미지 추출 여부) 확인.
// body: { brand, country?, maxItems?, ingest? }  ingest=true면 DB에도 적재해서 저장값 확인.
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as { brand?: string; country?: string; maxItems?: number; ingest?: boolean };
  const brand = String(b.brand ?? "").trim();
  if (!brand) return NextResponse.json({ error: "brand 필요" }, { status: 400 });
  const country = String(b.country ?? "US").toUpperCase();
  const maxItems = Math.min(20, Math.max(1, Number(b.maxItems) || 5));

  try {
    const { rawItems, mapped, actor, input } = await runShopSync(brand, country, maxItems);
    const rawFirst = rawItems[0] ?? null;
    const rawKeys = rawFirst && typeof rawFirst === "object" ? Object.keys(rawFirst) : [];
    // 이미지/커미션/판매 진단 요약
    const withImage = mapped.filter((p) => p.image && /^https?:\/\//.test(p.image)).length;
    const withSold = mapped.filter((p) => (p.soldCount ?? 0) > 0).length;
    const withComm = mapped.filter((p) => p.commissionRate != null).length;
    let ingested = 0;
    if (b.ingest) ingested = await ingestProducts(brand, mapped, country);

    return NextResponse.json({
      ok: true, actor, country, input,
      count: mapped.length,
      diagnostics: {
        imageOk: `${withImage}/${mapped.length}`,   // 이미지 URL 있는 제품 수
        soldOk: `${withSold}/${mapped.length}`,
        commissionOk: `${withComm}/${mapped.length}`,
        verdict: withImage > 0 ? "이미지 정상 수집" : (mapped.length ? "이미지 없음(actor 미제공 또는 키 불일치)" : "결과 0건"),
      },
      rawKeys,          // actor 원본 최상위 필드명
      rawFirst,         // 원본 1건 통째로
      mappedSample: mapped.slice(0, 5).map((p) => ({ id: p.productId, title: p.title, price: p.price, sold: p.soldCount, commission: p.commissionRate, image: p.image })),
      ingested,         // ingest=true 시 DB 저장 건수
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 300) }, { status: 500 });
  }
}

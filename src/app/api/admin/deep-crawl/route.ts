import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { deepCollectBrand } from "@/lib/collect-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 지정 브랜드 '심층' 크롤링 — 큐 대기 없이 즉시 대량 백필(영상) + 국가별 상품(샵) run 킥.
// 결과는 기존 폴링(cron/collect·collect-shop)이 회수·적재. 어드민 세션 필요.
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });

  const b = (await req.json().catch(() => ({}))) as {
    brand?: string; handle?: string; hashtags?: string; countries?: string[]; regions?: string[]; limit?: number; backfillDays?: number;
  };
  const brand = String(b.brand ?? "").trim();
  if (!brand) return NextResponse.json({ error: "brand(브랜드명) 필요" }, { status: 400 });

  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const baseUrl = host ? `${proto}://${host}` : undefined;

  const clean = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x).trim().toUpperCase()).filter(Boolean) : undefined);
  const summary = await deepCollectBrand({
    brandName: brand,
    handle: b.handle ? String(b.handle).trim().replace(/^@/, "") : null,
    hashtags: b.hashtags ? String(b.hashtags).trim() : null,
    regions: clean(b.regions),
    countries: clean(b.countries),
    limit: b.limit ? Number(b.limit) : undefined,
    backfillDays: b.backfillDays ? Number(b.backfillDays) : undefined,
    baseUrl,
  });
  return NextResponse.json({ ok: true, ...summary });
}

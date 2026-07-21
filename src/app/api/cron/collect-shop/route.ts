import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/db";
import { runShopCollection } from "@/lib/collect-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Hobby 한도. 매 호출 소량 배치 → 반복하며 전 브랜드 커버.

// 자동 샵 수집(크론) — 매 호출 SHOP_MAX_BRANDS 브랜드 × SHOP_COUNTRIES 국가를 진행.
// 중복 run 방지 + 샵통계 없는 브랜드 우선 → 반복 호출로 235개 브랜드를 점진 커버.
// Vercel Cron(Authorization: Bearer) 또는 외부 스케줄러(?key= / x-cron-key)로 호출.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 미설정=개방(개발용). 운영은 반드시 설정.
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  if (req.headers.get("x-cron-key") === secret) return true;
  try { if (new URL(req.url).searchParams.get("key") === secret) return true; } catch { /* ignore */ }
  return false;
}

async function handle(req: Request) {
  if (!authorized(req)) return new Response("forbidden", { status: 403 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const baseUrl = host ? `${proto}://${host}` : undefined;
  // 매 호출 처리 브랜드 수(국가는 SHOP_COUNTRIES). 전체 커버 속도는 이 값 + 스케줄 빈도로 조절.
  const maxShop = Math.max(1, Number(process.env.SHOP_MAX_BRANDS ?? 8));
  const summary = await runShopCollection({ maxShop, baseUrl });
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: Request) { return handle(req); }
export async function POST(req: Request) { return handle(req); }

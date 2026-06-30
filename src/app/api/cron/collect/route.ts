import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/db";
import { runCollection } from "@/lib/collect-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Hobby(무료) 한도. 소량 배치로 60초 내 완료.

// Vercel Cron(Authorization: Bearer) 또는 외부 스케줄러(?key= / x-cron-key)로 호출 가능.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 시크릿 미설정이면 개방(개발용) — 운영은 반드시 설정 권장
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
  // 수집 강도는 admin_settings(어드민 UI)에서 관리 → runCollection이 DB 값 사용
  const summary = await runCollection({ baseUrl });
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}

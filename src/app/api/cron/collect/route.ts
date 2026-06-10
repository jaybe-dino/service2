import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/db";
import { runCollection } from "@/lib/collect-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel Pro: 최대 5분

// Vercel Cron이 호출. CRON_SECRET 설정 시 Vercel이 Authorization: Bearer 로 전달.
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 시크릿 미설정이면 개방(개발용) — 운영은 반드시 설정 권장
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorized(req)) return new Response("forbidden", { status: 403 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const summary = await runCollection({ maxPending: 3, maxRefresh: 6 });
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}

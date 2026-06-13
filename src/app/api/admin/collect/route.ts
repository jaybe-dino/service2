import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { runCollection } from "@/lib/collect-run";
import { scraperConfigured } from "@/lib/collector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Hobby 한도 (run-sync 지연 시 타임아웃→pending 복귀 방지)

// 어드민 수동 수집 실행 (비동기 kick)
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const baseUrl = host ? `${proto}://${host}` : undefined;
  const summary = await runCollection({ maxPending: 8, maxRefresh: 15, baseUrl });
  return NextResponse.json({ ok: true, scraper: scraperConfigured(), ...summary });
}

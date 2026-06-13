import { NextResponse } from "next/server";
import { sql, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { runCollection } from "@/lib/collect-run";
import { scraperConfigured } from "@/lib/collector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 어드민 수동 수집 실행 (비동기 kick). { retryFailed: true } 시 failed→pending 재큐잉.
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  if (body?.retryFailed) {
    await sql`UPDATE brand_requests SET status='pending', attempts=0, note=NULL, updated_at=now() WHERE status='failed'`;
  }
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const baseUrl = host ? `${proto}://${host}` : undefined;
  const summary = await runCollection({
    maxPending: Number(process.env.COLLECT_MAX_PENDING ?? 8),
    maxRefresh: Number(process.env.COLLECT_MAX_REFRESH ?? 10),
    baseUrl,
  });
  return NextResponse.json({ ok: true, scraper: scraperConfigured(), ...summary });
}

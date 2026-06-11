import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(v: unknown): string | null {
  const s = String(v ?? "").trim().slice(0, 200);
  return s || null;
}

// UTM 방문 이벤트 적재 (비인증). 클라이언트 UtmTracker가 첫 진입 시 1회 호출.
export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ ok: true });
  try {
    const b = await req.json().catch(() => ({}));
    const source = clean(b.source);
    // 출처가 전혀 없으면 기록하지 않음 (직접유입 노이즈 방지)
    if (!source && !clean(b.campaign) && !clean(b.medium)) return NextResponse.json({ ok: true, skipped: true });
    await ensureSchema();
    await sql`INSERT INTO utm_events (kind, source, medium, campaign, content, term, landing_path, referrer)
      VALUES ('visit', ${source}, ${clean(b.medium)}, ${clean(b.campaign)}, ${clean(b.content)}, ${clean(b.term)}, ${clean(b.path)}, ${clean(b.referrer)})`;
  } catch {
    /* 무시 */
  }
  return NextResponse.json({ ok: true });
}

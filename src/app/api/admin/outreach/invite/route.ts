import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { inviteCreator, tiktokOutreachConfigured } from "@/lib/tiktok-outreach";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 틱톡 공식 채널 아웃리치(제휴 초대/TTCM) — 이메일과 별개 트랙, 별도 일일 한도.
// 초대는 handle 기반(이메일 불필요). GET: 오늘 초대량/한도. POST: 한도 내 배치 초대.
const DEFAULT_PER_DAY = 20; // 틱톡 공식 초대는 도달성·정책상 소량 권장

function render(text: string, t: { handle: string; views: number; score: number | null }): string {
  return text
    .replace(/\{\{\s*handle\s*\}\}/gi, `@${t.handle}`)
    .replace(/\{\{\s*views\s*\}\}/gi, t.views >= 1000 ? (t.views / 1000).toFixed(1) + "K" : String(t.views))
    .replace(/\{\{\s*score\s*\}\}/gi, t.score != null ? String(t.score) : "-");
}

async function quotaStatus() {
  const q = (await sql`SELECT value FROM admin_settings WHERE key='outreach_quota' LIMIT 1`).rows[0]?.value as { tiktok?: number } | undefined;
  const perDay = Math.max(1, Math.min(500, Number(q?.tiktok) || DEFAULT_PER_DAY));
  const sent = Number((await sql`
    SELECT count(*)::int AS n FROM outreach_activity
    WHERE kind='invite' AND (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date`).rows[0]?.n) || 0;
  const pending = Number((await sql`
    SELECT count(*)::int AS n FROM outreach_targets WHERE status='discovered'`).rows[0]?.n) || 0;
  return { perDay, sentToday: sent, remaining: Math.max(0, perDay - sent), pending, configured: tiktokOutreachConfigured() };
}

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return NextResponse.json({ ok: true, channel: "tiktok", ...(await quotaStatus()) });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as { templateId?: number; batch?: number; owner?: string; dry?: boolean; productId?: string };
  const dry = !!b.dry;

  const st = await quotaStatus();
  if (!dry && !st.configured) return NextResponse.json({ ok: false, configured: false, error: "틱톡 연동 미설정(TIKTOK_INVITE_URL/TOKEN). dry로 기록만 가능." });
  if (st.remaining <= 0) return NextResponse.json({ ok: true, sent: 0, reason: "오늘 초대 한도 소진", ...st });

  const tpl = (await sql<{ body: string }>`SELECT body FROM outreach_templates WHERE id=${Number(b.templateId) || 0} LIMIT 1`).rows[0];
  const msg = tpl?.body || "안녕하세요 {{handle}}님, 협업 제안드립니다.";

  const take = Math.min(st.remaining, Math.max(1, Math.min(50, Number(b.batch) || 15)));
  // 초대 대상: 미접촉(discovered), 적합도/조회수 우선. 이메일 불필요.
  const targets = (await sql<{ id: number; handle: string; score: number | null; total_views: string | number | null }>`
    SELECT t.id, t.handle, t.score, c.total_views
    FROM outreach_targets t LEFT JOIN creators c ON c.handle=t.handle
    WHERE t.status='discovered'
    ORDER BY t.score DESC NULLS LAST, c.total_views DESC NULLS LAST
    LIMIT ${take}`).rows;

  let sent = 0, failed = 0;
  for (const t of targets) {
    const body = render(msg, { handle: t.handle, views: Number(t.total_views) || 0, score: t.score });
    let ok = true, err = "";
    if (!dry) { const r = await inviteCreator(t.handle, body, { productId: b.productId ?? null }); ok = r.ok; err = r.error || ""; }
    if (ok) {
      await sql`INSERT INTO outreach_activity (target_id, actor, kind, body) VALUES (${t.id}, ${b.owner ?? 'system'}, 'invite', ${(dry ? "[수기기록] " : "[틱톡초대] ") + `@${t.handle}`})`;
      await sql`UPDATE outreach_targets SET status='contacted', updated_at=now() WHERE id=${t.id} AND status='discovered'`;
      sent += 1;
    } else {
      await sql`INSERT INTO outreach_activity (target_id, actor, kind, body) VALUES (${t.id}, ${b.owner ?? 'system'}, 'note', ${"틱톡 초대 실패: " + err})`;
      failed += 1;
    }
  }
  const after = await quotaStatus();
  return NextResponse.json({ ok: true, sent, failed, dry, ...after });
}

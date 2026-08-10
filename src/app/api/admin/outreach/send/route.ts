import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sendEmail, emailConfigured } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 아웃리치 일괄 발송 — 일일 발송 한도(rate limit) 준수. 관리자 전용.
// GET: 오늘 발송량/한도 조회. POST: 다음 배치 발송(한도 내에서만).
const DEFAULT_PER_DAY = 50;

function render(text: string, t: { handle: string; views: number; score: number | null }): string {
  return text
    .replace(/\{\{\s*handle\s*\}\}/gi, `@${t.handle}`)
    .replace(/\{\{\s*views\s*\}\}/gi, t.views >= 1000 ? (t.views / 1000).toFixed(1) + "K" : String(t.views))
    .replace(/\{\{\s*score\s*\}\}/gi, t.score != null ? String(t.score) : "-");
}

async function quotaStatus() {
  const q = (await sql`SELECT value FROM admin_settings WHERE key='outreach_quota' LIMIT 1`).rows[0]?.value as { perDay?: number } | undefined;
  const perDay = Math.max(1, Math.min(500, Number(q?.perDay) || DEFAULT_PER_DAY));
  // 오늘(KST) 발송 수 — outreach_activity kind='send'.
  const sent = Number((await sql`
    SELECT count(*)::int AS n FROM outreach_activity
    WHERE kind='send' AND (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date`).rows[0]?.n) || 0;
  // 발송 대기(이메일 보유·미접촉) 규모.
  const pending = Number((await sql`
    SELECT count(*)::int AS n FROM outreach_targets t JOIN creators c ON c.handle=t.handle
    WHERE t.status='discovered' AND c.email IS NOT NULL AND c.email <> ''`).rows[0]?.n) || 0;
  return { perDay, sentToday: sent, remaining: Math.max(0, perDay - sent), pending, configured: emailConfigured() };
}

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return NextResponse.json({ ok: true, ...(await quotaStatus()) });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as { templateId?: number; batch?: number; owner?: string; dry?: boolean };
  const dry = !!b.dry; // dry: 실제 발송 없이 기록만(수기 발송 대응, 한도는 동일 적용)

  const st = await quotaStatus();
  if (!dry && !st.configured) return NextResponse.json({ ok: false, configured: false, error: "이메일 발송 미설정(RESEND_API_KEY/RESEND_FROM). dry로 기록만 가능." });
  if (st.remaining <= 0) return NextResponse.json({ ok: true, sent: 0, reason: "오늘 발송 한도 소진", ...st });

  const tpl = (await sql<{ subject: string | null; body: string }>`SELECT subject, body FROM outreach_templates WHERE id=${Number(b.templateId) || 0} LIMIT 1`).rows[0];
  if (!tpl) return NextResponse.json({ ok: false, error: "템플릿을 선택하세요(templateId)" }, { status: 400 });

  const take = Math.min(st.remaining, Math.max(1, Math.min(50, Number(b.batch) || 25)));
  // 발송 대상: 이메일 보유·미접촉(discovered), 적합도/조회수 우선.
  const targets = (await sql<{ id: number; handle: string; email: string; score: number | null; total_views: string | number | null }>`
    SELECT t.id, t.handle, c.email, t.score, c.total_views
    FROM outreach_targets t JOIN creators c ON c.handle=t.handle
    WHERE t.status='discovered' AND c.email IS NOT NULL AND c.email <> ''
    ORDER BY t.score DESC NULLS LAST, c.total_views DESC NULLS LAST
    LIMIT ${take}`).rows;

  let sent = 0, failed = 0;
  for (const t of targets) {
    const vars = { handle: t.handle, views: Number(t.total_views) || 0, score: t.score };
    const subject = render(tpl.subject || "협업 제안", vars);
    const body = render(tpl.body, vars);
    let ok = true, err = "";
    if (!dry) { const r = await sendEmail(t.email, subject, body); ok = r.ok; err = r.error || ""; }
    if (ok) {
      await sql`INSERT INTO outreach_activity (target_id, actor, kind, body) VALUES (${t.id}, ${b.owner ?? 'system'}, 'send', ${(dry ? "[수기기록] " : "[이메일] ") + subject})`;
      await sql`UPDATE outreach_targets SET status='contacted', updated_at=now() WHERE id=${t.id} AND status='discovered'`;
      sent += 1;
    } else {
      await sql`INSERT INTO outreach_activity (target_id, actor, kind, body) VALUES (${t.id}, ${b.owner ?? 'system'}, 'note', ${"발송 실패: " + err})`;
      failed += 1;
    }
  }
  const after = await quotaStatus();
  return NextResponse.json({ ok: true, sent, failed, dry, ...after });
}

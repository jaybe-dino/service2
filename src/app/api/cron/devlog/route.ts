import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 개발 변경 로그 자동 기록 — 매일 자정(KST) 크론. 배포 커밋(SHA)이 직전 기록과 다르면 새 로그 작성.
// 수동 메모: POST(관리자) { title, body } → kind='note' 즉시 추가.
function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  if (req.headers.get("authorization") === `Bearer ${secret}`) return true;
  if (req.headers.get("x-cron-key") === secret) return true;
  try { if (new URL(req.url).searchParams.get("key") === secret) return true; } catch { /* ignore */ }
  return false;
}
const kstDate = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }); // YYYY-MM-DD

async function handle(req: Request) {
  if (!cronAuthorized(req)) return new Response("forbidden", { status: 403 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const sha = (process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 12);
  const msg = (process.env.VERCEL_GIT_COMMIT_MESSAGE || "").split("\n")[0].slice(0, 300);
  const today = kstDate();

  // 직전 deploy 로그와 SHA가 같으면(개발 변경 없음) 스킵.
  const last = await sql<{ commit_sha: string | null }>`
    SELECT commit_sha FROM dev_changelog WHERE kind='deploy' ORDER BY created_at DESC LIMIT 1`;
  const changed = !sha || last.rows[0]?.commit_sha !== sha;
  if (!changed) return NextResponse.json({ ok: true, logged: false, reason: "변경 없음(동일 배포)", sha });

  await sql`INSERT INTO dev_changelog (log_date, kind, commit_sha, title, body)
            VALUES (${today}, 'deploy', ${sha || null}, ${msg || "개발 반영"}, null)`;
  return NextResponse.json({ ok: true, logged: true, date: today, sha, title: msg });
}

export async function GET(req: Request) { return handle(req); }
export async function POST(req: Request) {
  // 관리자 수동 메모
  if (await isAdminAuthed()) {
    if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
    await ensureSchema();
    const b = (await req.json().catch(() => ({}))) as { title?: string; body?: string };
    const title = String(b.title ?? "").trim().slice(0, 200);
    if (!title) return NextResponse.json({ error: "title 필요" }, { status: 400 });
    await sql`INSERT INTO dev_changelog (log_date, kind, title, body) VALUES (${kstDate()}, 'note', ${title}, ${String(b.body ?? "").slice(0, 2000) || null})`;
    return NextResponse.json({ ok: true, kind: "note" });
  }
  return handle(req); // 크론 인증이면 자동 기록
}

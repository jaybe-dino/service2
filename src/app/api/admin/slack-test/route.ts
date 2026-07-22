import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 진단용(관리자) — 상담/문의 Slack 알림이 실제로 발송되는지 확인.
// GET: 설정 여부만 조회 / POST: 실제 테스트 메시지 발송.
function status() {
  const hook = process.env.SLACK_WEBHOOK_URL || "";
  return {
    configured: Boolean(hook),
    hookHost: hook ? (() => { try { return new URL(hook).host; } catch { return "(형식 오류)"; } })() : "(미설정)",
    note: hook ? "SLACK_WEBHOOK_URL 설정됨 — 상담/문의 접수 시 알림 발송" : "SLACK_WEBHOOK_URL 미설정 — 알림이 발송되지 않습니다(Vercel 환경변수 추가 필요).",
  };
}

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(status());
}

export async function POST() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const hook = process.env.SLACK_WEBHOOK_URL || "";
  if (!hook) return NextResponse.json({ ok: false, ...status(), error: "SLACK_WEBHOOK_URL 미설정 — 발송 불가" }, { status: 200 });
  try {
    const res = await fetch(hook, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: ":white_check_mark: [Glovek] Slack 알림 테스트 — 이 메시지가 보이면 상담/문의 알림이 정상 작동합니다." }),
    });
    const body = await res.text().catch(() => "");
    return NextResponse.json({ ok: res.ok, sent: res.ok, slackStatus: res.status, slackResponse: body.slice(0, 120), ...status() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 160), ...status() }, { status: 200 });
  }
}

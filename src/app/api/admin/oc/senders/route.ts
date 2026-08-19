import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { saConfigured, sendViaSender, type OcSender } from "@/lib/gmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function guard() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return null;
}
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function GET() {
  const g = await guard(); if (g) return g;
  const { rows } = await sql`SELECT id, email, display_name, backend, env_key, daily_limit, active, created_at
    FROM oc_senders ORDER BY created_at DESC`;
  // 서비스계정 키 준비 여부(configured) 부가 — 공용(모든 발신계정 동일)
  const ok = saConfigured();
  const out = rows.map((r) => ({ ...r, configured: ok }));
  return NextResponse.json({ rows: out });
}

export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as Record<string, string | number | boolean>;
  const action = String(b.action || "");

  if (action === "test") {
    const id = Number(b.id);
    const to = String(b.to || "").trim();
    if (!EMAIL_RE.test(to)) return NextResponse.json({ error: "테스트 수신 이메일 형식 오류" }, { status: 400 });
    const { rows } = await sql`SELECT email, display_name FROM oc_senders WHERE id = ${id}`;
    if (!rows[0]) return NextResponse.json({ error: "발신계정 없음" }, { status: 404 });
    const res = await sendViaSender(rows[0] as OcSender, {
      to,
      subject: "[테스트] GloveK 아웃리치 발신 확인",
      html: "<p>이 메일이 보이면 발신계정 설정이 정상입니다.</p><p>— GloveK 아웃리치</p>",
    });
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  }

  // 생성/수정(upsert by email) — email = 위임 대상 공용 메일함
  const email = String(b.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "발신 메일함 형식 오류" }, { status: 400 });
  const display_name = String(b.display_name || "").trim() || null;
  const daily_limit = Math.min(Math.max(1, Number(b.daily_limit) || 300), 2000);
  const active = b.active === false ? false : true;
  await sql`INSERT INTO oc_senders (email, display_name, backend, daily_limit, active)
    VALUES (${email}, ${display_name}, 'workspace_sa', ${daily_limit}, ${active})
    ON CONFLICT (email) DO UPDATE SET
      display_name = EXCLUDED.display_name, daily_limit = EXCLUDED.daily_limit, active = EXCLUDED.active`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const g = await guard(); if (g) return g;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await sql`DELETE FROM oc_senders WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

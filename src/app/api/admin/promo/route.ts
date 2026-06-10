import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function genCode(): string {
  const s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "GLV";
  for (let i = 0; i < 5; i++) c += s[Math.floor(Math.random() * s.length)];
  return c;
}

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ rows: [] });
  await ensureSchema();
  const r = await sql`SELECT code, plan, trial_days, max_uses, used_count, active, created_at FROM promo_codes ORDER BY created_at DESC LIMIT 300`;
  return NextResponse.json({ rows: r.rows });
}

// { code?, trial_days?, max_uses? } → 코드 생성 (code 미지정 시 자동 생성)
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim().toUpperCase() || genCode();
  const trialDays = Math.max(1, Math.min(90, Number(body?.trial_days ?? 3)));
  const maxUses = Math.max(0, Number(body?.max_uses ?? 0)); // 0 = 무제한
  await sql`INSERT INTO promo_codes (code, plan, trial_days, max_uses) VALUES (${code}, 'pro', ${trialDays}, ${maxUses})
            ON CONFLICT (code) DO UPDATE SET trial_days=EXCLUDED.trial_days, max_uses=EXCLUDED.max_uses, active=true`;
  return NextResponse.json({ ok: true, code, trial_days: trialDays, max_uses: maxUses });
}

// { code, active } 토글 / 삭제는 DELETE
export async function PATCH(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "code 필요" }, { status: 400 });
  await sql`UPDATE promo_codes SET active=${Boolean(body?.active)} WHERE code=${code}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "code 필요" }, { status: 400 });
  await sql`DELETE FROM promo_codes WHERE code=${code}`;
  return NextResponse.json({ ok: true });
}

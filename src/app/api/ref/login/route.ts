import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { createRefSession } from "@/lib/ref-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const loginId = String(body?.loginId ?? "").trim();
  const password = String(body?.password ?? "");
  if (!loginId || !password) return NextResponse.json({ ok: false, error: "아이디/비밀번호를 입력하세요." }, { status: 400 });
  const { rows } = await sql`SELECT code, name, password_hash FROM referrers WHERE login_id=${loginId} LIMIT 1`;
  const r = rows[0] as { code: string; name: string | null; password_hash: string } | undefined;
  if (!r || !(await verifyPassword(password, r.password_hash))) {
    return NextResponse.json({ ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  await createRefSession(r.code);
  return NextResponse.json({ ok: true, code: r.code, name: r.name });
}

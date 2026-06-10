import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 비밀번호 재설정 요청 — 이메일 발송 없이 관리자 인박스(inquiries)에 적재.
// 이메일 존재 여부를 노출하지 않기 위해 항상 동일한 성공 응답을 반환한다.
export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ ok: true });
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email || !/.+@.+\..+/.test(email)) return NextResponse.json({ ok: true });
    await ensureSchema();
    const u = await sql`SELECT id FROM users WHERE email=${email} LIMIT 1`;
    // 가입된 이메일일 때만 관리자 요청 적재 (열거 방지 위해 응답은 동일)
    if (u.rows.length) {
      await sql`INSERT INTO inquiries (kind, user_email, payload)
                VALUES ('password_reset', ${email}, ${JSON.stringify({ requestedAt: new Date().toISOString() })}::jsonb)`;
    }
  } catch {
    /* 무시 — 항상 성공 응답 */
  }
  return NextResponse.json({ ok: true });
}

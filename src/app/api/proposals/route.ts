import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 로그인 회원이 보낸 인플루언서 제안 목록 + 관리자 답변/상태
export async function GET() {
  if (!isConfigured()) return NextResponse.json({ rows: [] });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  await ensureSchema();
  const r = await sql`
    SELECT id, payload->>'context' AS handle, payload->>'message' AS message,
           payload->>'budget' AS budget, status, response, created_at, updated_at
    FROM inquiries
    WHERE kind='proposal' AND user_email=${me.email}
    ORDER BY created_at DESC LIMIT 200`;
  return NextResponse.json({ rows: r.rows });
}

// 대기중(pending) 제안 철회
export async function DELETE(req: Request) {
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await sql`UPDATE inquiries SET status='withdrawn', updated_at=now()
            WHERE id=${id} AND kind='proposal' AND user_email=${me.email} AND status='pending'`;
  return NextResponse.json({ ok: true });
}

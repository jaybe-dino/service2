import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["pending", "reviewing", "accepted", "declined", "done"];

// 관리자: 문의/제안에 상태 + 답변 등록 (마이페이지에 회원에게 노출)
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const id = Number(body?.id);
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const status = STATUSES.includes(body?.status) ? body.status : "reviewing";
  const response = body?.response != null ? String(body.response).slice(0, 1000) : null;
  await sql`UPDATE inquiries SET status=${status}, response=${response}, updated_at=now() WHERE id=${id}`;
  return NextResponse.json({ ok: true });
}

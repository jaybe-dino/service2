import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["new", "contacted", "done"]);

// 상담 신청 상태 변경(관리자).
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { id?: number; status?: string };
  const id = Number(b?.id);
  const status = String(b?.status ?? "");
  if (!id || !ALLOWED.has(status)) return NextResponse.json({ error: "id/status 확인" }, { status: 400 });
  await ensureSchema();
  const { rowCount } = await sql`UPDATE consult_requests SET status=${status} WHERE id=${id}`;
  if (!rowCount) return NextResponse.json({ ok: false, error: "신청 없음" }, { status: 404 });
  return NextResponse.json({ ok: true, id, status });
}

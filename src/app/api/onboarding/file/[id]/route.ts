import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 온보딩 제출 파일 다운로드/미리보기 — 어드민 또는 파일 소유자만.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured()) return new NextResponse("DB 미설정", { status: 503 });
  const { id } = await params;
  await ensureSchema();
  const { rows } = await sql`SELECT user_id, filename, mime, data FROM onboarding_files WHERE id=${id} LIMIT 1`;
  const f = rows[0] as { user_id: string; filename: string; mime: string; data: string } | undefined;
  if (!f) return new NextResponse("파일을 찾을 수 없습니다.", { status: 404 });

  const admin = await isAdminAuthed();
  if (!admin) {
    const me = await getCurrentUser();
    if (!me || me.id !== f.user_id) return new NextResponse("권한 없음", { status: 403 });
  }

  const buf = Buffer.from(f.data, "base64");
  const ascii = encodeURIComponent(f.filename || "file");
  return new NextResponse(buf, {
    headers: {
      "Content-Type": f.mime || "application/octet-stream",
      "Content-Disposition": `inline; filename*=UTF-8''${ascii}`,
      "Cache-Control": "private, no-store",
    },
  });
}

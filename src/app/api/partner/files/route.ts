import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { checkFileToken, fileApiToken } from "@/lib/file-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 고객별 온보딩 파일 메타 목록 (어드민 연동용) — GET /api/partner/files?user_id= (또는 ?email=)
// 인증: X-File-Token 헤더 = FILE_API_TOKEN
export async function GET(req: Request) {
  if (!fileApiToken()) return NextResponse.json({ error: "FILE_API_TOKEN 미설정" }, { status: 503 });
  if (!checkFileToken(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const url = new URL(req.url);
  let userId = (url.searchParams.get("user_id") || "").trim();
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  if (!userId && email) {
    const u = await sql<{ id: string }>`SELECT id FROM users WHERE email=${email} LIMIT 1`;
    userId = u.rows[0]?.id ?? "";
  }
  if (!userId) return NextResponse.json({ error: "user_id 또는 email 필요" }, { status: 400 });

  const r = await sql<{ id: string; user_id: string; kind: string; product_index: number | null; filename: string | null; mime: string | null; size: number | null; created_at: string }>`
    SELECT id, user_id, kind, product_index, filename, mime, size, created_at
    FROM onboarding_files WHERE user_id=${userId} ORDER BY created_at DESC LIMIT 500`;
  return NextResponse.json({ ok: true, user_id: userId, files: r.rows });
}

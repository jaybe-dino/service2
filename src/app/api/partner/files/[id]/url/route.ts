import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { checkFileToken, signFileUrl, siteBase, fileApiToken } from "@/lib/file-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 15분 서명 URL 발급 (어드민 연동용) — GET /api/partner/files/{file_id}/url
// 인증: X-File-Token 헤더. 응답: { url, expires_at } — url은 만료 전까지 헤더 없이 접근 가능.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!fileApiToken()) return NextResponse.json({ error: "FILE_API_TOKEN 미설정" }, { status: 503 });
  if (!checkFileToken(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const { id } = await params;
  const exists = await sql`SELECT 1 FROM onboarding_files WHERE id=${id} LIMIT 1`;
  if (!exists.rows.length) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

  const exp = Math.floor(Date.now() / 1000) + 15 * 60; // 15분
  const sig = signFileUrl(id, exp);
  return NextResponse.json({
    ok: true,
    url: `${siteBase()}/api/partner/files/${encodeURIComponent(id)}?exp=${exp}&sig=${sig}`,
    expires_at: new Date(exp * 1000).toISOString(),
  });
}

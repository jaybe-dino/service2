import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { checkFileToken, verifyFileSig, fileApiToken } from "@/lib/file-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 온보딩 파일 스트림 (어드민 연동용) — GET /api/partner/files/{file_id}
// 인증: X-File-Token 헤더, 또는 /url 로 발급받은 서명 쿼리(?exp=&sig=) — 만료 전까지 유효.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!fileApiToken()) return NextResponse.json({ error: "FILE_API_TOKEN 미설정" }, { status: 503 });
  const { id } = await params;
  const u = new URL(req.url);
  const authed = checkFileToken(req) || verifyFileSig(id, u.searchParams.get("exp"), u.searchParams.get("sig"));
  if (!authed) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const { rows } = await sql<{ filename: string | null; mime: string | null; data: string | null }>`
    SELECT filename, mime, data FROM onboarding_files WHERE id=${id} LIMIT 1`;
  const f = rows[0];
  if (!f?.data) return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

  const buf = Buffer.from(f.data, "base64");
  const ascii = encodeURIComponent(f.filename || "file");
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": f.mime || "application/octet-stream",
      "Content-Length": String(buf.length),
      "Content-Disposition": `inline; filename*=UTF-8''${ascii}`,
      "Cache-Control": "private, no-store",
    },
  });
}

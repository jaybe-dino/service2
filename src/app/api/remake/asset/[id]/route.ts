import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Remake Studio 제품 이미지 공개 서빙 — 외부 영상모델(Higgsfield)이 익명으로 가져갈 수 있도록 공개.
// id는 UUID(추측 불가). 사용자 본인 제품 마케팅 이미지에 한함(프로토타입).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!dbConfigured()) return new NextResponse("DB 미설정", { status: 503 });
  const { id } = await params;
  await ensureSchema();
  const { rows } = await sql`SELECT mime, data FROM remake_assets WHERE id=${id} LIMIT 1`;
  const a = rows[0] as { mime: string; data: string } | undefined;
  if (!a) return new NextResponse("not found", { status: 404 });
  const buf = Buffer.from(a.data, "base64");
  return new NextResponse(buf, {
    headers: {
      "Content-Type": a.mime || "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

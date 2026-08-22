import { NextResponse } from "next/server";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 클릭 추적(공개) — 클릭 기록 후 원 URL로 리다이렉트.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mid = Number(id);
  const target = new URL(req.url).searchParams.get("u") || "";
  // 안전: http/https 만 허용
  let dest = "https://glovek.space";
  try { const p = new URL(target); if (p.protocol === "http:" || p.protocol === "https:") dest = p.toString(); } catch { /* noop */ }

  if (mid && isConfigured()) {
    try {
      await ensureSchema();
      await sql`UPDATE oc_messages SET click_count = click_count + 1, clicked_at = COALESCE(clicked_at, now()),
        opened_at = COALESCE(opened_at, now()) WHERE id = ${mid}`;
    } catch { /* 추적 실패는 무시 */ }
  }
  return NextResponse.redirect(dest, { status: 302 });
}

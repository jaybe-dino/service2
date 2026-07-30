import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // 진단: SESSION_SECRET 명시 설정 여부(미설정이면 파생 시크릿 사용 — 값 자체는 노출 안 함).
  return NextResponse.json({
    authed: await isAdminAuthed(),
    configured: isConfigured(),
    sessionSecretSet: !!process.env.SESSION_SECRET,
  });
}

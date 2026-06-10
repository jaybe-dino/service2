import { NextResponse } from "next/server";
import { checkAdminCredentials, createAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");
  if (!checkAdminCredentials(username, password)) {
    return NextResponse.json({ ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }
  await createAdminSession();
  return NextResponse.json({ ok: true });
}

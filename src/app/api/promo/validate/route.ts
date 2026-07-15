import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { validatePromo } from "@/lib/promo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 프로모 코드 사전 검증(결제 없이). 유효하면 금액 미리보기용으로 사용.
export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ ok: false, reason: "DB 미설정" }, { status: 503 });
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const me = await getCurrentUser();
  const v = await validatePromo(String(code ?? ""), me?.id ?? "");
  return NextResponse.json({ ok: v.ok, reason: v.reason });
}

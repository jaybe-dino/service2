import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { runShopCollection } from "@/lib/collect-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 틱톡샵 상품 수집(A안) 수동 실행 — 실 커미션율 + 가격×판매수
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const baseUrl = host ? `${proto}://${host}` : undefined;
  const summary = await runShopCollection({ maxShop: Number(process.env.SHOP_MAX_BRANDS ?? 3), baseUrl });
  return NextResponse.json({ ok: true, ...summary });
}

import { NextResponse } from "next/server";
import { clearRefSession } from "@/lib/ref-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await clearRefSession();
  return NextResponse.json({ ok: true });
}

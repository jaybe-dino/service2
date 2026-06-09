import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/db";
import { getCurrentUser, publicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isConfigured()) return NextResponse.json({ user: null, configured: false });
  const u = await getCurrentUser();
  return NextResponse.json({ user: u ? publicUser(u) : null, configured: true });
}

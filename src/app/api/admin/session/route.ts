import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ authed: await isAdminAuthed(), configured: isConfigured() });
}

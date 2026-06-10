import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "admin@ktrend.demo,jbheo91@gmail.com,jaybe@dinostudio.kr")
  .split(",")
  .map((e) => e.trim().toLowerCase());

export async function GET() {
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const me = await getCurrentUser();
  if (!me || !ADMIN_EMAILS.includes(me.email.toLowerCase())) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  await ensureSchema();
  const members = await sql`
    SELECT id,email,name,brand,role,plan,pro_until,created_at FROM users ORDER BY created_at DESC LIMIT 500`;
  const inquiries = await sql`
    SELECT id,kind,user_email,created_at FROM inquiries ORDER BY created_at DESC LIMIT 200`;
  return NextResponse.json({ members: members.rows, inquiries: inquiries.rows });
}

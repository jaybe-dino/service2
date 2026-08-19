import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?campaignId=&status=&limit=&offset= — 발송 이력(수신자별)
export async function GET(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const u = new URL(req.url);
  const campaignId = Number(u.searchParams.get("campaignId"));
  const status = (u.searchParams.get("status") || "").trim();
  const limit = Math.min(Math.max(1, Number(u.searchParams.get("limit")) || 100), 500);
  const offset = Math.max(0, Number(u.searchParams.get("offset")) || 0);
  if (!campaignId) return NextResponse.json({ error: "campaignId 필요" }, { status: 400 });

  const cond: string[] = [`campaign_id = $1`];
  const params: unknown[] = [campaignId];
  if (status && ["queued", "sent", "failed", "skipped"].includes(status)) {
    params.push(status); cond.push(`status = $${params.length}`);
  }
  const { rows } = await sql.query(
    `SELECT id, handle, to_email, status, provider_id, error, subject, sent_at, created_at
     FROM oc_messages WHERE ${cond.join(" AND ")}
     ORDER BY (sent_at IS NULL), sent_at DESC, id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  return NextResponse.json({ rows });
}

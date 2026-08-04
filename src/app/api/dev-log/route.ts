import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 공개 — 개발 변경 로그(/dev-docs에서 사용). 최근 100건.
export async function GET() {
  if (!isConfigured()) return NextResponse.json({ logs: [] });
  try {
    await ensureSchema();
    const r = await sql<{ id: number; log_date: string; kind: string; commit_sha: string | null; title: string | null; body: string | null; created_at: string }>`
      SELECT id, log_date, kind, commit_sha, title, body, created_at
      FROM dev_changelog ORDER BY created_at DESC LIMIT 100`;
    const logs = r.rows.map((x) => ({
      date: String(x.log_date).slice(0, 10),
      kind: x.kind,
      sha: x.commit_sha,
      title: x.title || "",
      body: x.body || "",
      at: new Date(x.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
    }));
    return NextResponse.json({ ok: true, logs });
  } catch (e) {
    return NextResponse.json({ logs: [], error: String(e).slice(0, 160) });
  }
}

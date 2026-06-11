import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 실제 접속자 수(하트비트) — 최근 90초 내 활성 세션 수 반환. (TEST1 — 롤백 가능)
export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ active: 0 });
  try {
    await ensureSchema();
    const b = await req.json().catch(() => ({}));
    const sid = String(b?.sid ?? "").slice(0, 64);
    if (sid) {
      await sql`INSERT INTO presence (sid, last_seen) VALUES (${sid}, now())
                ON CONFLICT (sid) DO UPDATE SET last_seen=now()`;
    }
    await sql`DELETE FROM presence WHERE last_seen < now() - interval '10 minutes'`;
    const c = await sql`SELECT COUNT(*)::int AS active FROM presence WHERE last_seen > now() - interval '90 seconds'`;
    return NextResponse.json({ active: c.rows[0]?.active ?? 0 });
  } catch {
    return NextResponse.json({ active: 0 });
  }
}

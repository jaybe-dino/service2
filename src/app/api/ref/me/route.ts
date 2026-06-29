import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { getRefCode } from "@/lib/ref-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 추천인 본인: 자신의 코드로 가입한 사용자 목록
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, configured: false });
  const code = await getRefCode();
  if (!code) return NextResponse.json({ ok: true, referrer: null });
  await ensureSchema();
  const r = await sql`SELECT code, name FROM referrers WHERE code=${code} LIMIT 1`;
  if (!r.rows.length) return NextResponse.json({ ok: true, referrer: null });
  const { rows } = await sql`
    SELECT u.name, u.email, u.brand, u.plan,
           extract(epoch from u.created_at)*1000 AS created_ms,
           oa.status AS onb_status, oa.track AS onb_track, oa.amount AS onb_amount
    FROM users u
    LEFT JOIN onboarding_applications oa ON oa.user_id = u.id
    WHERE u.referred_by = ${code}
    ORDER BY u.created_at DESC LIMIT 1000`;
  return NextResponse.json({ ok: true, referrer: r.rows[0], signups: rows });
}

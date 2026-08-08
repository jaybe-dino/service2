import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { partnerAuthed, partnerToken, SHARED_FIELD_COLUMN } from "@/lib/partner-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// admin→glovek 쓰기(요청서 §5). 공유 브랜드 프로필을 last-write-wins 로 반영.
// 인증: Authorization: Bearer <PARTNER_ADMIN_TOKEN>
// body: { match:{email?,biz_no?,phone?,id?}, updated_at, fields:{...}, create? }
// 응답: { ok, id, result: "applied"|"skipped_older"|"not_found" }
export async function POST(req: Request) {
  if (!partnerToken()) return NextResponse.json({ ok: false, error: "연동 미설정(PARTNER_ADMIN_TOKEN)" }, { status: 503 });
  if (!partnerAuthed(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const b = (await req.json().catch(() => ({}))) as {
    match?: { email?: string; biz_no?: string; phone?: string; id?: string };
    updated_at?: string; fields?: Record<string, unknown>; create?: boolean;
  };
  const match = b.match || {};
  const incomingAt = b.updated_at ? new Date(b.updated_at) : null;
  if (!incomingAt || isNaN(incomingAt.getTime())) return NextResponse.json({ ok: false, error: "updated_at 필요(ISO)" }, { status: 400 });

  // 매칭: id → email → biz_no → phone (안정 우선순위).
  const email = match.email ? String(match.email).toLowerCase().trim() : "";
  const bizNo = match.biz_no ? String(match.biz_no).replace(/\D/g, "") : "";
  const phone = match.phone ? String(match.phone).replace(/\D/g, "") : "";
  const row = (await sql<{ id: string; profile_updated_at: string | null }>`
    SELECT id, profile_updated_at FROM users
    WHERE (${match.id ?? ""} <> '' AND id = ${match.id ?? ""})
       OR (${email} <> '' AND lower(email) = ${email})
       OR (${bizNo} <> '' AND regexp_replace(coalesce(biz_no,''),'\\D','','g') = ${bizNo})
       OR (${phone} <> '' AND regexp_replace(coalesce(phone,''),'\\D','','g') = ${phone})
    ORDER BY (lower(email) = ${email}) DESC LIMIT 1`).rows[0];

  const fields = b.fields || {};
  // 반영할 (컬럼, 값) — 공유 필드만 화이트리스트.
  const sets: { col: string; val: unknown }[] = [];
  for (const [k, v] of Object.entries(fields)) {
    const col = SHARED_FIELD_COLUMN[k];
    if (col && col !== "email") sets.push({ col, val: v == null ? null : String(v) }); // email(매핑키)은 갱신 제외
  }

  if (!row) {
    if (!b.create) return NextResponse.json({ ok: true, result: "not_found" });
    // 생성(협의 시): 최소 email 필요.
    if (!email) return NextResponse.json({ ok: false, error: "생성하려면 match.email 필요" }, { status: 400 });
    const id = `ext_${Buffer.from(email).toString("hex").slice(0, 24)}`;
    const cols = ["id", "email", "password_hash", "name", "profile_updated_at"];
    const vals: unknown[] = [id, email, "!external", String(fields.contact_name ?? fields.brand_name ?? email), incomingAt.toISOString()];
    for (const s of sets) { if (s.col !== "name") { cols.push(s.col); vals.push(s.val); } }
    const ph = cols.map((_, i) => `$${i + 1}`).join(",");
    await sql.query(`INSERT INTO users (${cols.join(",")}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`, vals);
    return NextResponse.json({ ok: true, id, result: "applied" });
  }

  // last-write-wins: 들어온 값이 저장값보다 최신일 때만 반영.
  const currentAt = row.profile_updated_at ? new Date(row.profile_updated_at) : new Date(0);
  if (incomingAt.getTime() <= currentAt.getTime()) return NextResponse.json({ ok: true, id: row.id, result: "skipped_older" });

  // 반영 — profile_updated_at 을 '들어온 값'으로 세팅(에코 방지: 이 경로는 웹훅 안 쏨).
  if (sets.length) {
    const assigns = sets.map((s, i) => `${s.col} = $${i + 1}`).join(", ");
    const params = sets.map((s) => s.val);
    params.push(incomingAt.toISOString(), row.id);
    await sql.query(`UPDATE users SET ${assigns}, profile_updated_at = $${sets.length + 1} WHERE id = $${sets.length + 2}`, params);
  } else {
    await sql`UPDATE users SET profile_updated_at = ${incomingAt.toISOString()} WHERE id = ${row.id}`;
  }
  return NextResponse.json({ ok: true, id: row.id, result: "applied" });
}

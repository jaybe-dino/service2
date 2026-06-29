import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hex = (n: number) => crypto.randomBytes(n).toString("hex").toUpperCase().slice(0, n * 2);
const digits = (n: number) => Array.from({ length: n }, () => crypto.randomInt(0, 10)).join("");
function genPassword(len = 10) {
  const cs = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  return Array.from({ length: len }, () => cs[crypto.randomInt(0, cs.length)]).join("");
}

// 추천인 목록 + 각 추천인의 추천 가입자 수
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  await ensureSchema();
  const { rows } = await sql`
    SELECT r.code, r.login_id, r.name,
           extract(epoch from r.created_at)*1000 AS created_ms,
           (SELECT count(*) FROM users u WHERE u.referred_by = r.code) AS signups
    FROM referrers r ORDER BY r.created_at DESC LIMIT 500`;
  return NextResponse.json({ ok: true, items: rows });
}

// 추천인 생성 — 코드/로그인ID/비밀번호 자동 발급 (비밀번호 평문은 이 응답에서 1회만 노출)
export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim().slice(0, 80) || "추천인";

  // 고유 코드/로그인ID 확보 (충돌 시 재시도)
  let code = "", loginId = "";
  for (let i = 0; i < 5; i++) {
    code = `GLV-${hex(3)}`;
    loginId = `ref${digits(5)}`;
    const dup = await sql`SELECT 1 FROM referrers WHERE code=${code} OR login_id=${loginId} LIMIT 1`;
    if (!dup.rows.length) break;
    if (i === 4) return NextResponse.json({ ok: false, error: "코드 생성 실패, 다시 시도" }, { status: 500 });
  }
  const password = genPassword(10);
  const hash = await hashPassword(password);
  await sql`INSERT INTO referrers (code, login_id, password_hash, name) VALUES (${code}, ${loginId}, ${hash}, ${name})`;
  return NextResponse.json({ ok: true, code, loginId, password, name });
}

import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/auth";
import { commissionRate, commissionAmount } from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hex = (n: number) => crypto.randomBytes(n).toString("hex").toUpperCase().slice(0, n * 2);

// 추천인 목록 + 추천 가입자/결제 전환/매출/수수료
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  await ensureSchema();
  const { rows } = await sql`
    SELECT r.code, r.login_id, r.name,
           extract(epoch from r.created_at)*1000 AS created_ms,
           (SELECT count(*) FROM users u WHERE u.referred_by = r.code) AS signups,
           (SELECT count(DISTINCT o.user_id) FROM orders o JOIN users u ON u.id = o.user_id
              WHERE u.referred_by = r.code AND o.status='paid') AS paid_users,
           (SELECT COALESCE(sum(o.charge_amount),0) FROM orders o JOIN users u ON u.id = o.user_id
              WHERE u.referred_by = r.code AND o.status='paid') AS revenue
    FROM referrers r ORDER BY r.created_at DESC LIMIT 500`;
  const items = rows.map((r) => {
    const paid = Number(r.paid_users) || 0;
    const revenue = Number(r.revenue) || 0;
    return { ...r, paid_users: paid, revenue, rate: commissionRate(paid), commission: commissionAmount(revenue, paid) };
  });
  return NextResponse.json({ ok: true, items });
}

// 추천인 생성 — 이름·아이디·비밀번호를 어드민이 직접 입력 (미입력 시 자동 생성). 코드는 자동 발급.
export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim().slice(0, 80);
  const loginId = String(body?.loginId ?? "").trim().slice(0, 60);
  const password = String(body?.password ?? "");
  if (!name) return NextResponse.json({ ok: false, error: "이름을 입력하세요." }, { status: 400 });
  if (!loginId) return NextResponse.json({ ok: false, error: "아이디를 입력하세요." }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ ok: false, error: "비밀번호는 4자 이상 입력하세요." }, { status: 400 });

  const dup = await sql`SELECT 1 FROM referrers WHERE login_id=${loginId} LIMIT 1`;
  if (dup.rows.length) return NextResponse.json({ ok: false, error: "이미 사용 중인 아이디입니다." }, { status: 409 });

  // 고유 추천 코드 발급
  let code = "";
  for (let i = 0; i < 6; i++) {
    code = `GLV-${hex(3)}`;
    const c = await sql`SELECT 1 FROM referrers WHERE code=${code} LIMIT 1`;
    if (!c.rows.length) break;
    if (i === 5) return NextResponse.json({ ok: false, error: "코드 생성 실패, 다시 시도" }, { status: 500 });
  }
  const hash = await hashPassword(password);
  await sql`INSERT INTO referrers (code, login_id, password_hash, name) VALUES (${code}, ${loginId}, ${hash}, ${name})`;
  return NextResponse.json({ ok: true, code, loginId, name });
}

// 비밀번호 변경 (어드민)
export async function PATCH(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code ?? "").trim();
  const password = String(body?.password ?? "");
  if (!code) return NextResponse.json({ ok: false, error: "대상 코드 누락" }, { status: 400 });
  if (password.length < 4) return NextResponse.json({ ok: false, error: "비밀번호는 4자 이상 입력하세요." }, { status: 400 });
  const hash = await hashPassword(password);
  const r = await sql`UPDATE referrers SET password_hash=${hash} WHERE code=${code}`;
  if (!r.rowCount) return NextResponse.json({ ok: false, error: "추천인을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

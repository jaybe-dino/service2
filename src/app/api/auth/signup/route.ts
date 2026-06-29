import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { hashPassword, createSession, publicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다 (POSTGRES_URL)." }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const name = (body?.name ?? "").trim();
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";
  const brand = (body?.brand ?? "").trim();
  const role = (body?.role ?? "").trim();
  const code = String(body?.code ?? "").trim().toUpperCase().slice(0, 60);

  if (!name || !email || !password || !brand) {
    return NextResponse.json({ error: "필수 항목(이름·이메일·비밀번호·브랜드)을 입력하세요." }, { status: 400 });
  }
  await ensureSchema();
  const exists = await sql`SELECT 1 FROM users WHERE email = ${email} LIMIT 1`;
  if (exists.rows.length) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }
  // 추천인 코드: 유효한 코드일 때만 어트리뷰션 저장
  let referredBy: string | null = null;
  if (code) {
    const ref = await sql`SELECT code FROM referrers WHERE code=${code} LIMIT 1`;
    referredBy = ref.rows.length ? code : null;
  }
  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);
  await sql`INSERT INTO users (id, email, password_hash, name, brand, role, plan, referred_by)
            VALUES (${id}, ${email}, ${password_hash}, ${name}, ${brand}, ${role}, 'basic', ${referredBy})`;

  // UTM 유입 출처 연결 (가입 어트리뷰션)
  const utm = (body?.utm ?? {}) as Record<string, string | undefined>;
  const cut = (v: unknown) => { const s = String(v ?? "").trim().slice(0, 200); return s || null; };
  if (utm.source || utm.medium || utm.campaign) {
    await sql`INSERT INTO utm_events (kind, source, medium, campaign, content, term, user_id, user_email)
      VALUES ('signup', ${cut(utm.source)}, ${cut(utm.medium)}, ${cut(utm.campaign)}, ${cut(utm.content)}, ${cut(utm.term)}, ${id}, ${email})`;
  }

  await createSession(id, email);
  const { rows } = await sql`SELECT id,email,name,brand,role,plan,pro_until FROM users WHERE id=${id}`;
  return NextResponse.json({ user: publicUser(rows[0] as never) });
}

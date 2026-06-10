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
  const code = (body?.code ?? "").trim().toUpperCase();

  if (!name || !email || !password || !brand) {
    return NextResponse.json({ error: "필수 항목(이름·이메일·비밀번호·브랜드)을 입력하세요." }, { status: 400 });
  }
  await ensureSchema();
  const exists = await sql`SELECT 1 FROM users WHERE email = ${email} LIMIT 1`;
  if (exists.rows.length) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }
  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);
  await sql`INSERT INTO users (id, email, password_hash, name, brand, role, plan)
            VALUES (${id}, ${email}, ${password_hash}, ${name}, ${brand}, ${role}, 'basic')`;

  // 프로모션 코드: 유효하면 N일 무료 Pro 체험 부여
  let promo: { applied: boolean; trialDays?: number } = { applied: false };
  if (code) {
    const pc = await sql`SELECT code, trial_days, max_uses, used_count, active FROM promo_codes WHERE code=${code} LIMIT 1`;
    const row = pc.rows[0] as { code: string; trial_days: number; max_uses: number; used_count: number; active: boolean } | undefined;
    if (row && row.active && (row.max_uses === 0 || row.used_count < row.max_uses)) {
      const until = Date.now() + row.trial_days * 86_400_000;
      await sql`UPDATE users SET pro_until = ${until} WHERE id=${id}`;
      await sql`INSERT INTO promo_redemptions (code, user_id) VALUES (${code}, ${id}) ON CONFLICT DO NOTHING`;
      await sql`UPDATE promo_codes SET used_count = used_count + 1 WHERE code=${code}`;
      promo = { applied: true, trialDays: row.trial_days };
    }
  }

  await createSession(id, email);
  const { rows } = await sql`SELECT id,email,name,brand,role,plan,pro_until FROM users WHERE id=${id}`;
  return NextResponse.json({ user: publicUser(rows[0] as never), promo });
}

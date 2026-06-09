import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { getCurrentUser, publicUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 동료 3명(같은 브랜드 이메일 도메인) 초대 시 Pro 7일 오픈
const TRIAL_DAYS = 7;
const REQUIRED = 3;

export async function POST(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json({ error: "DB가 설정되지 않았습니다." }, { status: 503 });
  }
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const emails: string[] = Array.isArray(body?.emails) ? body.emails : [];
  const myDomain = me.email.split("@")[1]?.toLowerCase() ?? "";

  const valid = Array.from(
    new Set(
      emails
        .map((e) => String(e).trim().toLowerCase())
        .filter((e) => /.+@.+\..+/.test(e) && e !== me.email),
    ),
  );
  // 브랜드 이메일 기준: 같은 도메인만 인정
  const sameDomain = valid.filter((e) => e.split("@")[1] === myDomain);

  await ensureSchema();
  for (const e of sameDomain) {
    await sql`INSERT INTO invites (inviter_email, invitee_email, brand_domain)
              VALUES (${me.email}, ${e}, ${myDomain})`;
  }
  const { rows } = await sql<{ c: number }>`
    SELECT COUNT(DISTINCT invitee_email)::int AS c FROM invites
    WHERE inviter_email=${me.email} AND brand_domain=${myDomain}`;
  const count = rows[0]?.c ?? 0;

  let granted = false;
  if (count >= REQUIRED && Number(me.pro_until) < Date.now()) {
    const until = Date.now() + TRIAL_DAYS * 86_400_000;
    await sql`UPDATE users SET pro_until=${until} WHERE id=${me.id}`;
    granted = true;
  }
  const fresh = await getCurrentUser();
  return NextResponse.json({
    invited: count,
    required: REQUIRED,
    domainRejected: valid.length - sameDomain.length,
    granted,
    user: fresh ? publicUser(fresh) : null,
  });
}

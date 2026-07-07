import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { parseMarkets } from "@/lib/auth";
import { COUNTRIES } from "@/data/ktrend/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 승인 가능 시장 = 활성 국가 중 US 외(US는 모두 기본 허용이라 저장 불필요).
const GRANTABLE = new Set(COUNTRIES.filter((c) => c.active && c.id !== "US").map((c) => c.id));

// 특정 회원의 열람 가능 시장(markets) 설정 — 관리자 승인.
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { email?: string; markets?: unknown };
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email 필요" }, { status: 400 });
  const raw = Array.isArray(body?.markets) ? body.markets : [];
  // US는 저장하지 않음(항상 허용). 승인 가능 코드만 통과.
  const codes = Array.from(new Set(raw.map((x) => String(x).toUpperCase()).filter((x) => GRANTABLE.has(x))));
  const csv = codes.join(",");
  await ensureSchema();
  const { rowCount } = await sql`UPDATE users SET markets = ${csv || null} WHERE email = ${email}`;
  if (!rowCount) return NextResponse.json({ ok: false, error: "해당 이메일 회원 없음" }, { status: 404 });
  // 응답엔 US 포함한 최종 열람 시장을 반환.
  return NextResponse.json({ ok: true, email, markets: parseMarkets(csv) });
}

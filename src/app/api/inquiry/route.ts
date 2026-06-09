import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 마케팅 1:1 / 틱톡샵 온보딩 / 인플루언서 제안 등 문의 저장
const KINDS = ["marketing", "tiktokshop", "proposal", "sales"];

export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const kind = KINDS.includes(body?.kind) ? body.kind : "marketing";
  const me = await getCurrentUser();
  const userEmail = me?.email ?? (body?.email ?? "").trim().toLowerCase() ?? null;
  await ensureSchema();
  await sql`INSERT INTO inquiries (kind, user_email, payload)
            VALUES (${kind}, ${userEmail}, ${JSON.stringify(body ?? {})}::jsonb)`;
  // 이메일 발송은 별도 트랜잭션 메일러(SMTP/Resend) 연동 시 활성화
  return NextResponse.json({ ok: true });
}

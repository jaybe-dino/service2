import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 신규 브랜드 발굴 요청 큐에 추가 (유저 또는 어드민)
export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  const me = await getCurrentUser();
  const admin = await isAdminAuthed();
  if (!me && !admin) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const brandName = String(body?.brandName ?? body?.name ?? "").trim();
  const handle = String(body?.handle ?? "").trim() || null;
  const hashtags = String(body?.hashtags ?? "").trim() || null;
  if (!brandName) return NextResponse.json({ ok: false, error: "브랜드명을 입력하세요." }, { status: 400 });

  await ensureSchema();
  // 중복 요청(대기/수집 중) 방지
  const dup = await sql`SELECT 1 FROM brand_requests WHERE lower(brand_name)=lower(${brandName}) AND status IN ('pending','collecting') LIMIT 1`;
  if (dup.rows.length) return NextResponse.json({ ok: true, duplicated: true });

  await sql`INSERT INTO brand_requests (brand_name, handle, hashtags, requested_by, source, status)
            VALUES (${brandName}, ${handle}, ${hashtags}, ${me?.email ?? "admin"}, ${admin ? "admin" : "user"}, 'pending')`;
  return NextResponse.json({ ok: true });
}

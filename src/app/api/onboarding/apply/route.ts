import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 온보딩 최소 정보 저장 (로그인 사용자 1인 1신청 upsert). 결제 전 단계.
export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim().slice(0, 120);
  const brand = String(body?.brand ?? "").trim().slice(0, 200);
  const contact = String(body?.contact ?? "").trim().slice(0, 120);
  const email = String(body?.email ?? me.email).trim().slice(0, 200);
  const category = String(body?.category ?? "").trim().slice(0, 120);
  const note = String(body?.note ?? "").trim().slice(0, 2000);

  if (!brand || !contact) {
    return NextResponse.json({ ok: false, error: "브랜드명과 연락처는 필수입니다." }, { status: 400 });
  }

  await ensureSchema();
  // 사용자당 가장 최근 신청 1건을 갱신, 없으면 새로 생성
  const id = `onb_${me.id}`;
  await sql`INSERT INTO onboarding_applications (id, user_id, name, brand, contact, email, category, note, status, updated_at)
            VALUES (${id}, ${me.id}, ${name}, ${brand}, ${contact}, ${email}, ${category}, ${note}, 'submitted', now())
            ON CONFLICT (id) DO UPDATE SET
              name=EXCLUDED.name, brand=EXCLUDED.brand, contact=EXCLUDED.contact,
              email=EXCLUDED.email, category=EXCLUDED.category, note=EXCLUDED.note,
              status=CASE WHEN onboarding_applications.status='paid' THEN 'paid' ELSE 'submitted' END,
              updated_at=now()`;

  return NextResponse.json({ ok: true, id });
}

// 어드민: 신청 목록
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  await ensureSchema();
  const { rows } = await sql`
    SELECT id, user_id, name, brand, contact, email, category, note, status, order_id,
           extract(epoch from created_at)*1000 AS created_ms,
           extract(epoch from updated_at)*1000 AS updated_ms
    FROM onboarding_applications ORDER BY updated_at DESC LIMIT 500`;
  return NextResponse.json({ ok: true, items: rows });
}

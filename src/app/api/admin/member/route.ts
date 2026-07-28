import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 회원 상세(관리자) — GET ?id= 또는 ?email= : 프로필+구독+결제+온보딩+문의 전체 번들.
// POST { id, name?, brand?, role?, plan?, adminNote? } : 기본 정보 수정(관리자 메모 포함).
export async function GET(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const url = new URL(req.url);
  const id = (url.searchParams.get("id") || "").trim();
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  const u = id
    ? await sql`SELECT id,email,name,brand,role,plan,pro_until,referred_by,markets,admin_note,created_at FROM users WHERE id=${id} LIMIT 1`
    : await sql`SELECT id,email,name,brand,role,plan,pro_until,referred_by,markets,admin_note,created_at FROM users WHERE email=${email} LIMIT 1`;
  const user = u.rows[0] as { id: string; email: string } | undefined;
  if (!user) return NextResponse.json({ error: "회원 없음" }, { status: 404 });

  const [sub, mallSub, orders, onb, files, inquiries, consults] = await Promise.all([
    sql`SELECT plan,amount,status,next_charge_at,failures,period_days,created_at FROM subscriptions WHERE user_id=${user.id} LIMIT 1`,
    sql`SELECT track,amount,status,next_charge_at,failures,period_days,created_at FROM mall_subscriptions WHERE user_id=${user.id} LIMIT 1`,
    sql`SELECT order_id,plan,amount,charge_amount,goods_name,status,kind,tid,created_at FROM orders WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 50`,
    sql`SELECT id,name,brand,contact,email,track,grade,recommended_track,countries,term,amount,status,phase,referral_code,payload,updated_at FROM onboarding_applications WHERE user_id=${user.id} LIMIT 1`,
    sql`SELECT id,kind,product_index,filename,mime,size,created_at FROM onboarding_files WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 100`,
    sql`SELECT id,kind,payload,status,response,created_at FROM inquiries WHERE lower(coalesce(user_email,''))=lower(${user.email}) ORDER BY created_at DESC LIMIT 30`,
    sql`SELECT id,company,manager_name,contact,category,message,source,status,created_at FROM consult_requests WHERE lower(email)=lower(${user.email}) ORDER BY created_at DESC LIMIT 30`,
  ]);

  return NextResponse.json({
    ok: true,
    user: u.rows[0],
    subscription: sub.rows[0] ?? null,
    mallSubscription: mallSub.rows[0] ?? null,
    orders: orders.rows,
    onboarding: onb.rows[0] ?? null,
    files: files.rows,
    inquiries: inquiries.rows,
    consults: consults.rows,
  });
}

const PLANS = new Set(["basic", "pro", "enterprise"]);

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const b = (await req.json().catch(() => ({}))) as { id?: string; name?: string; brand?: string; role?: string; plan?: string; adminNote?: string };
  const id = String(b.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  const cur = await sql<{ id: string }>`SELECT id FROM users WHERE id=${id} LIMIT 1`;
  if (!cur.rows.length) return NextResponse.json({ error: "회원 없음" }, { status: 404 });

  const name = b.name != null ? String(b.name).trim().slice(0, 80) : null;
  const brand = b.brand != null ? String(b.brand).trim().slice(0, 200) : null;
  const role = b.role != null ? String(b.role).trim().slice(0, 80) : null;
  const plan = b.plan != null && PLANS.has(String(b.plan)) ? String(b.plan) : null;
  const adminNote = b.adminNote != null ? String(b.adminNote).slice(0, 2000) : null;

  await sql`UPDATE users SET
    name = COALESCE(${name}, name),
    brand = COALESCE(${brand}, brand),
    role = COALESCE(${role}, role),
    plan = COALESCE(${plan}, plan),
    admin_note = COALESCE(${adminNote}, admin_note)
    WHERE id=${id}`;
  return NextResponse.json({ ok: true, id });
}

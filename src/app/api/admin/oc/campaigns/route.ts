import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { buildWhere, type OcFilter } from "@/lib/oc-filter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_RECIPIENTS = 20000;

async function guard() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return null;
}

// GET — 캠페인 목록 또는 ?id= 단건 상세
export async function GET(req: Request) {
  const g = await guard(); if (g) return g;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (id) {
    const c = await sql`SELECT c.*, p.name AS product_name, p.brand AS product_brand,
        s.email AS sender_email, s.display_name AS sender_name, s.daily_limit
      FROM oc_campaigns c
      LEFT JOIN oc_products p ON p.id = c.product_id
      LEFT JOIN oc_senders s ON s.id = c.sender_id
      WHERE c.id = ${id}`;
    if (!c.rows[0]) return NextResponse.json({ error: "없음" }, { status: 404 });
    const stat = await sql`SELECT status, COUNT(*)::int AS n FROM oc_messages WHERE campaign_id = ${id} GROUP BY status`;
    return NextResponse.json({ campaign: c.rows[0], stats: stat.rows });
  }
  const { rows } = await sql`SELECT c.id, c.name, c.status, c.total, c.sent, c.failed, c.created_at,
      p.name AS product_name, s.email AS sender_email
    FROM oc_campaigns c
    LEFT JOIN oc_products p ON p.id = c.product_id
    LEFT JOIN oc_senders s ON s.id = c.sender_id
    ORDER BY c.created_at DESC LIMIT 200`;
  return NextResponse.json({ rows });
}

// POST — 캠페인 생성 + 필터로 수신자(oc_messages) 확정
export async function POST(req: Request) {
  const g = await guard(); if (g) return g;
  const b = (await req.json().catch(() => ({}))) as {
    name?: string; productId?: number; senderId?: number; senderIds?: number[]; subject?: string; subjectB?: string; body?: string; filter?: OcFilter; emails?: string[]; aiLevel?: string;
  };
  const name = String(b.name || "").trim();
  const subject = String(b.subject || "").trim();
  const subjectB = String(b.subjectB || "").trim() || null;
  const body = String(b.body || "").trim();
  if (!name || !subject || !body) return NextResponse.json({ error: "캠페인명·제목·본문 필수" }, { status: 400 });
  const productId = b.productId ? Number(b.productId) : null;
  const filter = b.filter || {};

  // 발신 메일함(1개 이상) — 등록·활성 계정만. 여러 개면 로테이션 발송.
  const rawIds = (Array.isArray(b.senderIds) && b.senderIds.length ? b.senderIds : (b.senderId ? [b.senderId] : []))
    .map(Number).filter((n) => n > 0);
  const senderIds = Array.from(new Set(rawIds));
  if (!senderIds.length) return NextResponse.json({ error: "발신 메일함을 1개 이상 선택하세요" }, { status: 400 });
  const chk = await sql.query(`SELECT id FROM oc_senders WHERE active = true AND id = ANY($1::int[])`, [senderIds]);
  const validIds = chk.rows.map((r) => Number(r.id));
  if (!validIds.length) return NextResponse.json({ error: "유효한(활성) 발신 메일함이 없습니다" }, { status: 400 });
  const senderId = validIds[0]; // 대표(표시용)

  const aiLevel = b.aiLevel === "L2" ? "L2" : "L1"; // L2 = AI 개인화 오프닝(발송 시 생성)
  const created = await sql.query(
    `INSERT INTO oc_campaigns (name, product_id, sender_id, sender_ids, subject, subject_b, body, filter, status, created_by, ai_level)
     VALUES ($1, $2, $3, $4::int[], $5, $6, $7, $8::jsonb, 'draft', 'admin', $9) RETURNING id`,
    [name, productId, senderId, validIds, subject, subjectB, body, JSON.stringify(filter), aiLevel],
  );
  const campaignId = Number(created.rows[0].id);

  // 수신자 확정
  const picked = Array.isArray(b.emails)
    ? Array.from(new Set(b.emails.map((e) => String(e || "").trim().toLowerCase()).filter(Boolean))).slice(0, MAX_RECIPIENTS)
    : null;
  let q: string; let params: unknown[];
  if (picked && picked.length) {
    // 명시적으로 선택한 이메일만(필터 결과에서 체크로 고른 대상). 제외목록·dedup 적용.
    q = `INSERT INTO oc_messages (campaign_id, handle, to_email, status)
      SELECT ${campaignId}, d.handle, d.email, 'queued' FROM (
        SELECT DISTINCT ON (lower(email)) handle, lower(email) AS email, avg_views
        FROM oc_creators
        WHERE lower(email) = ANY($1::text[]) AND email IS NOT NULL AND email <> ''
        ORDER BY lower(email), avg_views DESC NULLS LAST
      ) d
      WHERE NOT EXISTS (SELECT 1 FROM oc_suppression s WHERE s.email = d.email)
      ON CONFLICT (campaign_id, to_email) DO NOTHING`;
    params = [picked];
  } else {
    // 필터 기반: 이메일 보유 + 필터 조건, dedup + 제외목록 제거 후 avg_views 상위 상한.
    const w = buildWhere({ ...filter, hasEmail: true });
    q = `INSERT INTO oc_messages (campaign_id, handle, to_email, status)
      SELECT ${campaignId}, d.handle, d.email, 'queued' FROM (
        SELECT DISTINCT ON (lower(email)) handle, lower(email) AS email, avg_views
        FROM oc_creators ${w.where}
        ORDER BY lower(email), avg_views DESC NULLS LAST
      ) d
      WHERE NOT EXISTS (SELECT 1 FROM oc_suppression s WHERE s.email = d.email)
      ORDER BY d.avg_views DESC NULLS LAST
      LIMIT ${MAX_RECIPIENTS}
      ON CONFLICT (campaign_id, to_email) DO NOTHING`;
    params = w.params;
  }
  try {
    await sql.query(q, params);
  } catch (e) {
    await sql`DELETE FROM oc_campaigns WHERE id = ${campaignId}`;
    return NextResponse.json({ error: "수신자 확정 실패: " + String(e instanceof Error ? e.message : e).slice(0, 160) }, { status: 500 });
  }
  const tot = await sql`SELECT COUNT(*)::int AS n FROM oc_messages WHERE campaign_id = ${campaignId}`;
  const total = tot.rows[0]?.n || 0;
  await sql`UPDATE oc_campaigns SET total = ${total} WHERE id = ${campaignId}`;
  return NextResponse.json({ ok: true, id: campaignId, total });
}

export async function DELETE(req: Request) {
  const g = await guard(); if (g) return g;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
  await sql`DELETE FROM oc_messages WHERE campaign_id = ${id}`;
  await sql`DELETE FROM oc_campaigns WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}

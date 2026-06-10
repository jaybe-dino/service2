import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 블락리스트 관리 (어드민 전용)
export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ rows: [] });
  await ensureSchema();
  const r = await sql`SELECT kind, value, reason, created_at FROM blocklist ORDER BY created_at DESC LIMIT 500`;
  return NextResponse.json({ rows: r.rows });
}

// { kind: 'handle'|'brand', value, reason? }  → 추가 + 즉시 수집데이터 정리
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const kind = body?.kind === "brand" ? "brand" : body?.kind === "video" ? "video" : "handle";
  let value = String(body?.value ?? "").trim();
  // 콘텐츠는 틱톡 video_id로 정규화 (URL이 넘어오면 id 추출)
  if (kind === "video") {
    const m = value.match(/\/video\/(\d+)/);
    if (m) value = m[1];
  }
  const reason = body?.reason ? String(body.reason).slice(0, 200) : null;
  if (!value) return NextResponse.json({ error: "value 필요" }, { status: 400 });

  await sql`INSERT INTO blocklist (kind, value, reason) VALUES (${kind}, ${value}, ${reason})
            ON CONFLICT (kind, value) DO UPDATE SET reason=EXCLUDED.reason`;

  // 이미 수집된 데이터 즉시 제거 + 추적/큐에서 차단
  if (kind === "handle") {
    await sql`DELETE FROM videos WHERE handle=${value}`;
    await sql`DELETE FROM creators WHERE handle=${value}`;
  } else if (kind === "video") {
    await sql`DELETE FROM videos WHERE video_id=${value}`;
  } else {
    await sql`DELETE FROM videos WHERE brand_name=${value}`;
    await sql`DELETE FROM brand_stats WHERE brand_name=${value}`;
    await sql`UPDATE brand_tracking SET tracked=false WHERE brand_name=${value}`;
    await sql`UPDATE brand_requests SET status='failed', note='blocked' WHERE brand_name=${value} AND status IN ('pending','collecting')`;
  }
  return NextResponse.json({ ok: true, kind, value });
}

// { kind, value } → 블락 해제
export async function DELETE(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const body = await req.json().catch(() => ({}));
  const kind = body?.kind === "brand" ? "brand" : body?.kind === "video" ? "video" : "handle";
  const value = String(body?.value ?? "").trim();
  if (!value) return NextResponse.json({ error: "value 필요" }, { status: 400 });
  await sql`DELETE FROM blocklist WHERE kind=${kind} AND value=${value}`;
  if (kind === "brand") await sql`UPDATE brand_tracking SET tracked=true WHERE brand_name=${value}`;
  return NextResponse.json({ ok: true });
}

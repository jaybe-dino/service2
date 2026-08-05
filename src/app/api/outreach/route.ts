import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 회원(브랜드) 셀프 아웃리치 — 로그인 사용자가 자신의 크리에이터 아웃리치 대상을 관리.
// 저장은 공용 outreach_targets에 owner='user:<id>'로 스코프. 관리자 보드에도 함께 보임.
const STATUSES = ["discovered", "contacted", "replied", "negotiating", "contracted", "running", "done", "hold", "rejected"];

async function me() {
  const u = await getCurrentUser();
  return u ? { id: u.id, owner: `user:${u.id}` } : null;
}

export async function GET() {
  if (!isConfigured()) return NextResponse.json({ targets: [] });
  const u = await me();
  if (!u) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  await ensureSchema();
  const r = await sql`
    SELECT t.id, t.handle, t.status, t.score, t.note, t.created_at, t.updated_at,
           c.total_views, c.avg_views, c.videos
    FROM outreach_targets t LEFT JOIN creators c ON c.handle = t.handle
    WHERE t.owner = ${u.owner}
    ORDER BY t.updated_at DESC LIMIT 500`;
  return NextResponse.json({ ok: true, targets: r.rows, statuses: STATUSES });
}

export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const u = await me();
  if (!u) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as { action?: string; handle?: string; score?: number; id?: number; status?: string };
  const action = String(b.action ?? "");

  if (action === "addTarget") {
    const handle = String(b.handle ?? "").replace(/^@/, "").trim().slice(0, 120);
    if (!handle) return NextResponse.json({ error: "handle 필요" }, { status: 400 });
    // (handle, owner) 중복 방지 — list_id NULL은 UNIQUE로 못 막으므로 NOT EXISTS 가드.
    const r = await sql`INSERT INTO outreach_targets (handle, list_id, score, owner)
      SELECT ${handle}, NULL, ${b.score ?? null}, ${u.owner}
      WHERE NOT EXISTS (SELECT 1 FROM outreach_targets WHERE handle=${handle} AND owner=${u.owner})`;
    return NextResponse.json({ ok: true, added: r.rowCount ?? 0 });
  }
  if (action === "setStatus") {
    const id = Number(b.id); const status = String(b.status ?? "");
    if (!id || !STATUSES.includes(status)) return NextResponse.json({ error: "id/status 확인" }, { status: 400 });
    // 소유자 스코프 — 남의 대상은 못 바꿈.
    await sql`UPDATE outreach_targets SET status=${status}, updated_at=now() WHERE id=${id} AND owner=${u.owner}`;
    return NextResponse.json({ ok: true });
  }
  if (action === "removeTarget") {
    const id = Number(b.id); if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    await sql`DELETE FROM outreach_activity WHERE target_id=${id} AND target_id IN (SELECT id FROM outreach_targets WHERE owner=${u.owner})`;
    await sql`DELETE FROM outreach_targets WHERE id=${id} AND owner=${u.owner}`;
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
}

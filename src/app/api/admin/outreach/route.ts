import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 아웃리치(크리에이터 CRM) — 관리자 전용.
// GET: ?type=lists | ?type=targets(&status=) | ?type=board(파이프라인 집계)
// POST: { action:"saveList"|"addTarget"|"setStatus"|"note"|"deleteList", ... }
const STATUSES = ["discovered", "contacted", "replied", "negotiating", "contracted", "running", "done", "hold", "rejected"];

export async function GET(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const type = new URL(req.url).searchParams.get("type") || "board";

  if (type === "lists") {
    const r = await sql`SELECT id, name, owner, filter, created_at,
      (SELECT count(*) FROM outreach_targets t WHERE t.list_id = l.id)::int AS targets
      FROM outreach_lists l ORDER BY created_at DESC LIMIT 200`;
    return NextResponse.json({ ok: true, lists: r.rows });
  }
  if (type === "targets") {
    const status = new URL(req.url).searchParams.get("status") || "";
    const r = await sql`
      SELECT t.id, t.handle, t.status, t.owner, t.score, t.note, t.list_id, t.created_at, t.updated_at,
             c.total_views, c.avg_views, c.videos
      FROM outreach_targets t LEFT JOIN creators c ON c.handle = t.handle
      WHERE (${status} = '' OR t.status = ${status})
      ORDER BY t.updated_at DESC LIMIT 1000`;
    return NextResponse.json({ ok: true, targets: r.rows });
  }
  // board: 상태별 집계
  const b = await sql<{ status: string; n: number }>`SELECT status, count(*)::int AS n FROM outreach_targets GROUP BY status`;
  const counts: Record<string, number> = {};
  for (const s of STATUSES) counts[s] = 0;
  for (const row of b.rows) counts[row.status] = Number(row.n) || 0;
  return NextResponse.json({ ok: true, counts, statuses: STATUSES });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as {
    action?: string; name?: string; filter?: unknown; handle?: string; handles?: string[];
    listId?: number; score?: number; id?: number; status?: string; note?: string; owner?: string;
  };
  const action = String(b.action ?? "");

  if (action === "saveList") {
    const name = String(b.name ?? "").trim().slice(0, 120);
    if (!name) return NextResponse.json({ error: "name 필요" }, { status: 400 });
    const r = await sql<{ id: number }>`INSERT INTO outreach_lists (name, owner, filter)
      VALUES (${name}, ${b.owner ?? null}, ${JSON.stringify(b.filter ?? {})}::jsonb) RETURNING id`;
    return NextResponse.json({ ok: true, id: r.rows[0]?.id });
  }
  if (action === "deleteList") {
    const id = Number(b.id); if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    await sql`DELETE FROM outreach_targets WHERE list_id=${id}`;
    await sql`DELETE FROM outreach_lists WHERE id=${id}`;
    return NextResponse.json({ ok: true });
  }
  if (action === "addTarget") {
    const handles = (Array.isArray(b.handles) ? b.handles : b.handle ? [b.handle] : []).map((h) => String(h).replace(/^@/, "").trim()).filter(Boolean).slice(0, 500);
    if (!handles.length) return NextResponse.json({ error: "handle 필요" }, { status: 400 });
    let added = 0;
    for (const h of handles) {
      const r = await sql`INSERT INTO outreach_targets (handle, list_id, score, owner)
        VALUES (${h}, ${b.listId ?? null}, ${b.score ?? null}, ${b.owner ?? null})
        ON CONFLICT (handle, list_id) DO NOTHING`;
      if (r.rowCount) added += 1;
    }
    return NextResponse.json({ ok: true, added, total: handles.length });
  }
  if (action === "setStatus") {
    const id = Number(b.id); const status = String(b.status ?? "");
    if (!id || !STATUSES.includes(status)) return NextResponse.json({ error: "id/status 확인" }, { status: 400 });
    await sql`UPDATE outreach_targets SET status=${status}, updated_at=now() WHERE id=${id}`;
    await sql`INSERT INTO outreach_activity (target_id, actor, kind, body) VALUES (${id}, ${b.owner ?? 'admin'}, 'status', ${`→ ${status}`})`;
    return NextResponse.json({ ok: true });
  }
  if (action === "note") {
    const id = Number(b.id); const note = String(b.note ?? "").trim().slice(0, 2000);
    if (!id || !note) return NextResponse.json({ error: "id/note 필요" }, { status: 400 });
    await sql`INSERT INTO outreach_activity (target_id, actor, kind, body) VALUES (${id}, ${b.owner ?? 'admin'}, 'note', ${note})`;
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
}

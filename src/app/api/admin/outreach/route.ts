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
    const listId = new URL(req.url).searchParams.get("listId") || "";
    const r = await sql`
      SELECT t.id, t.handle, t.status, t.owner, t.score, t.note, t.list_id, t.created_at, t.updated_at,
             c.total_views, c.avg_views, c.videos,
             (SELECT count(*) FROM outreach_activity a WHERE a.target_id = t.id)::int AS activity
      FROM outreach_targets t LEFT JOIN creators c ON c.handle = t.handle
      WHERE (${status} = '' OR t.status = ${status})
        AND (${listId} = '' OR t.list_id = ${listId === '' ? null : Number(listId)})
      ORDER BY t.updated_at DESC LIMIT 1000`;
    return NextResponse.json({ ok: true, targets: r.rows });
  }
  if (type === "activity") {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    const r = await sql`SELECT id, actor, kind, body, created_at FROM outreach_activity WHERE target_id = ${id} ORDER BY created_at DESC LIMIT 200`;
    return NextResponse.json({ ok: true, activity: r.rows });
  }
  if (type === "templates") {
    const r = await sql`SELECT id, name, channel, subject, body, updated_at FROM outreach_templates ORDER BY updated_at DESC LIMIT 200`;
    return NextResponse.json({ ok: true, templates: r.rows });
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
    channel?: string; subject?: string; body?: string;
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
    const listId = b.listId ?? null;
    let added = 0;
    for (const h of handles) {
      // list_id NULL은 UNIQUE 제약이 중복을 막지 못함(NULL은 서로 distinct) → 존재 확인 후 삽입.
      const r = listId == null
        ? await sql`INSERT INTO outreach_targets (handle, list_id, score, owner)
            SELECT ${h}, NULL, ${b.score ?? null}, ${b.owner ?? null}
            WHERE NOT EXISTS (SELECT 1 FROM outreach_targets WHERE handle = ${h} AND list_id IS NULL)`
        : await sql`INSERT INTO outreach_targets (handle, list_id, score, owner)
            VALUES (${h}, ${listId}, ${b.score ?? null}, ${b.owner ?? null})
            ON CONFLICT (handle, list_id) DO NOTHING`;
      if (r.rowCount) added += 1;
    }
    return NextResponse.json({ ok: true, added, total: handles.length });
  }
  if (action === "addAllTargets") {
    // 보유 크리에이터 전체를 아웃리치에 일괄 등록. onlyEmail=true면 공개 이메일 보유자만(=연결 가능성↑).
    // 블락 제외. 이미 있으면 skip. score는 적재 시점 조회수 근사(정렬용).
    const onlyEmail = !!(b as { onlyEmail?: boolean }).onlyEmail;
    const rows = await sql<{ handle: string }>`
      SELECT handle FROM creators
      WHERE handle IS NOT NULL AND handle <> ''
        AND handle NOT IN (SELECT value FROM blocklist WHERE kind='handle')
        AND (${onlyEmail} = false OR (email IS NOT NULL AND email <> ''))
        AND NOT EXISTS (SELECT 1 FROM outreach_targets t WHERE t.handle = creators.handle AND t.list_id IS NULL)
      ORDER BY (email IS NOT NULL) DESC, total_views DESC NULLS LAST
      LIMIT 3000`;
    let added = 0;
    for (const row of rows.rows) {
      const r = await sql`INSERT INTO outreach_targets (handle, list_id, owner)
        SELECT ${row.handle}, NULL, ${b.owner ?? null}
        WHERE NOT EXISTS (SELECT 1 FROM outreach_targets WHERE handle=${row.handle} AND list_id IS NULL)`;
      if (r.rowCount) added += 1;
    }
    return NextResponse.json({ ok: true, added, total: rows.rows.length, onlyEmail });
  }
  if (action === "setQuota") {
    const bb = b as { perDay?: number; channel?: string };
    const perDay = Math.max(1, Math.min(500, Number(bb.perDay) || 50));
    const channel = bb.channel === "tiktok" ? "tiktok" : "email";
    const cur = (await sql`SELECT value FROM admin_settings WHERE key='outreach_quota' LIMIT 1`).rows[0]?.value as Record<string, number> | undefined;
    const next = { email: 50, tiktok: 20, ...(cur || {}), [channel]: perDay };
    await sql`INSERT INTO admin_settings (key, value, updated_at) VALUES ('outreach_quota', ${JSON.stringify(next)}::jsonb, now())
              ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`;
    return NextResponse.json({ ok: true, channel, perDay });
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
    await sql`UPDATE outreach_targets SET note=${note}, updated_at=now() WHERE id=${id}`;
    return NextResponse.json({ ok: true });
  }
  if (action === "deleteTarget") {
    const id = Number(b.id); if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    await sql`DELETE FROM outreach_activity WHERE target_id=${id}`;
    await sql`DELETE FROM outreach_targets WHERE id=${id}`;
    return NextResponse.json({ ok: true });
  }
  if (action === "setOwner") {
    const id = Number(b.id); if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    const owner = String(b.owner ?? "").trim().slice(0, 80) || null;
    await sql`UPDATE outreach_targets SET owner=${owner}, updated_at=now() WHERE id=${id}`;
    await sql`INSERT INTO outreach_activity (target_id, actor, kind, body) VALUES (${id}, 'admin', 'note', ${`담당자 배정: ${owner ?? "미지정"}`})`;
    return NextResponse.json({ ok: true });
  }
  if (action === "saveTemplate") {
    const name = String(b.name ?? "").trim().slice(0, 120);
    const body = String(b.body ?? "").trim().slice(0, 4000);
    if (!name || !body) return NextResponse.json({ error: "name/body 필요" }, { status: 400 });
    const channel = ["email", "dm", "form"].includes(String(b.channel)) ? String(b.channel) : "email";
    const subject = String(b.subject ?? "").slice(0, 200) || null;
    if (b.id) {
      await sql`UPDATE outreach_templates SET name=${name}, channel=${channel}, subject=${subject}, body=${body}, updated_at=now() WHERE id=${Number(b.id)}`;
      return NextResponse.json({ ok: true, id: Number(b.id) });
    }
    const r = await sql<{ id: number }>`INSERT INTO outreach_templates (name, channel, subject, body) VALUES (${name}, ${channel}, ${subject}, ${body}) RETURNING id`;
    return NextResponse.json({ ok: true, id: r.rows[0]?.id });
  }
  if (action === "deleteTemplate") {
    const id = Number(b.id); if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });
    await sql`DELETE FROM outreach_templates WHERE id=${id}`;
    return NextResponse.json({ ok: true });
  }
  if (action === "importProposals") {
    // 기존 인플루언서 제안(inquiries kind=proposal)을 아웃리치 대상으로 흡수. handle=payload->>'context'.
    const rows = await sql<{ handle: string }>`
      SELECT DISTINCT lower(regexp_replace(coalesce(payload->>'context',''), '^@', '')) AS handle
      FROM inquiries WHERE kind='proposal' AND coalesce(payload->>'context','') <> ''`;
    let added = 0;
    for (const row of rows.rows) {
      const h = String(row.handle).trim();
      if (!h) continue;
      const r = await sql`INSERT INTO outreach_targets (handle, list_id, status, owner)
        SELECT ${h}, NULL, 'contacted', 'proposal'
        WHERE NOT EXISTS (SELECT 1 FROM outreach_targets WHERE handle=${h} AND list_id IS NULL)`;
      if (r.rowCount) added += 1;
    }
    return NextResponse.json({ ok: true, added, total: rows.rows.length });
  }
  return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
}

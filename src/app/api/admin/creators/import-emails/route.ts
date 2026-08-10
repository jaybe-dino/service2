import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 외부에서 수집한 이메일을 handle(key) 기준으로 되매핑 → creators.email 업데이트.
// body: { rows: [{handle, email}, ...] }  또는  { csv: "handle,email\n..." }
// CSV는 헤더에 handle·email 컬럼이 있으면 자동 매핑.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function parseCsv(csv: string): { handle: string; email: string }[] {
  const lines = csv.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const split = (l: string) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? [];
  const header = split(lines[0]).map((h) => h.toLowerCase());
  const hi = header.findIndex((h) => h === "handle" || h === "username" || h === "key");
  const ei = header.findIndex((h) => h === "email" || h === "e-mail" || h === "이메일");
  const out: { handle: string; email: string }[] = [];
  const start = hi >= 0 || ei >= 0 ? 1 : 0; // 헤더 없으면 [handle,email] 가정
  for (let i = start; i < lines.length; i++) {
    const cells = split(lines[i]);
    const handle = String(cells[hi >= 0 ? hi : 0] ?? "").replace(/^@/, "").trim();
    const email = String(cells[ei >= 0 ? ei : 1] ?? "").trim().toLowerCase();
    if (handle && email) out.push({ handle, email });
  }
  return out;
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as { rows?: { handle?: string; email?: string }[]; csv?: string };

  let rows: { handle: string; email: string }[] = [];
  if (Array.isArray(b.rows)) rows = b.rows.map((r) => ({ handle: String(r.handle ?? "").replace(/^@/, "").trim(), email: String(r.email ?? "").trim().toLowerCase() }));
  else if (typeof b.csv === "string") rows = parseCsv(b.csv);
  else return NextResponse.json({ error: "rows[] 또는 csv 필요" }, { status: 400 });

  let updated = 0, skipped = 0, invalid = 0, notFound = 0;
  for (const { handle, email } of rows) {
    if (!handle || !EMAIL_RE.test(email)) { invalid += 1; continue; }
    // handle 대소문자 무관 매칭. 기존 이메일 있어도 덮어씀(외부가 최신이라 가정).
    const r = await sql`UPDATE creators SET email=${email}, updated_at=now() WHERE lower(handle)=lower(${handle})`;
    if (r.rowCount) updated += 1; else notFound += 1;
  }
  skipped = invalid + notFound;
  return NextResponse.json({ ok: true, total: rows.length, updated, skipped, invalid, notFound });
}

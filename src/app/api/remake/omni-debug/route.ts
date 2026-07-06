import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 진단용: 최근 gemini(Omni) 잡의 실제 폴링 응답을 그대로 보여준다(완료 감지 문제 파악).
// 사용: /api/remake/omni-debug  (가장 최근 잡)  또는  ?rid=omni::xxx
const BASE = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

export async function GET(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return NextResponse.json({ error: "GEMINI_API_KEY 미설정" });

  let rid = new URL(req.url).searchParams.get("rid") || "";
  let jobInfo: Record<string, unknown> = {};
  if (!rid) {
    const { rows } = await sql`SELECT id, request_id, status, error, created_at FROM remake_jobs
      WHERE provider='gemini' AND request_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`;
    const r = rows[0] as { request_id?: string } | undefined;
    if (!r?.request_id) return NextResponse.json({ error: "gemini 잡 없음 — 먼저 생성 시도" });
    rid = r.request_id;
    jobInfo = rows[0];
  }

  const ref = rid.startsWith("omni::") ? rid.slice(6) : rid;
  if (ref.startsWith("done:")) return NextResponse.json({ rid, note: "동기 완료(done) 케이스", uri: ref.slice(5) });

  const candidates = /^https?:\/\//.test(ref)
    ? [ref]
    : ref.includes("/")
    ? [`${BASE}/${ref.replace(/^\//, "")}`]
    : [`${BASE}/interactions/${ref}`, `${BASE}/operations/${ref}`, `${BASE}/files/${ref}`, `${BASE}/${ref}`];

  const results = [];
  for (const base of candidates) {
    const url = `${base}${base.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
    try {
      const res = await fetch(url, { headers: { "x-goog-api-key": key } });
      const text = await res.text();
      results.push({ path: base.replace(`${BASE}/`, ""), httpStatus: res.status, body: text.slice(0, 2000) });
      if (res.ok) break; // 첫 성공 경로에서 응답 본문 확보
    } catch (e) {
      results.push({ path: base.replace(`${BASE}/`, ""), error: String(e).slice(0, 160) });
    }
  }
  return NextResponse.json({ rid, ref, jobInfo, results });
}

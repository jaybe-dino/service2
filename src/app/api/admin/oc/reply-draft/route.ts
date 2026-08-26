import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 수신 회신에 대한 AI 답장 초안 생성 (Claude). 받은 메일 언어에 맞춰 작성.
export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const key = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return NextResponse.json({ error: "AI 미설정: ANTHROPIC_API_KEY 필요" }, { status: 400 });

  const b = (await req.json().catch(() => ({}))) as { id?: number; instruction?: string };
  const id = Number(b.id);
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const row = (await sql`SELECT i.from_name, i.from_email, i.subject, i.body_text, i.matched_campaign_id
    FROM oc_inbox i WHERE i.id = ${id}`).rows[0];
  if (!row) return NextResponse.json({ error: "회신 없음" }, { status: 404 });

  // 캠페인 → 제품 컨텍스트
  let ctx = "";
  if (row.matched_campaign_id) {
    const c = (await sql`SELECT c.name, p.name AS product, p.brand, p.category, p.concept, p.usp
      FROM oc_campaigns c LEFT JOIN oc_products p ON p.id = c.product_id WHERE c.id = ${row.matched_campaign_id}`).rows[0];
    if (c) ctx = `캠페인: ${c.name || ""}\n제품: ${c.product || ""} / 브랜드: ${c.brand || ""}\n카테고리: ${c.category || ""}\nUSP: ${c.usp || ""}\n컨셉: ${c.concept || ""}`;
  }

  const inbound = String(row.body_text || row.subject || "").slice(0, 6000);
  const model = process.env.ANTHROPIC_TEXT_MODEL || process.env.REMAKE_AI_MODEL || "claude-opus-4-8";
  const system =
    "You are a K-beauty brand partnerships manager replying to a TikTok/creator who responded to our outreach email. " +
    "Write a warm, professional, concise reply that moves the collaboration forward — thank them, answer their questions, " +
    "and give a clear next step (e.g., share the application form / group link, confirm shipping address for a free product, or propose a quick call). " +
    "IMPORTANT: reply in the SAME language as the creator's message (English→English, etc.). " +
    "Do not invent links or facts not provided; use placeholders like [신청 폼 링크] when a link is needed. " +
    "Output ONLY the email reply body — no subject line, no preamble, no quotes.";
  const user =
    `${ctx ? "우리 제품/캠페인 컨텍스트:\n" + ctx + "\n\n" : ""}` +
    `${b.instruction ? "추가 지시: " + b.instruction + "\n\n" : ""}` +
    `크리에이터(${row.from_name || row.from_email})가 보낸 메일:\n"""\n${inbound}\n"""\n\n위 메일에 대한 답장 본문을 작성하세요.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 1200, system, messages: [{ role: "user", content: user }] }),
    });
    const data = (await res.json().catch(() => ({}))) as { content?: { type?: string; text?: string }[]; error?: { message?: string } };
    if (!res.ok) return NextResponse.json({ error: data.error?.message || `Claude HTTP ${res.status}` }, { status: 400 });
    const draft = (data.content || []).filter((c) => c.type === "text").map((c) => c.text || "").join("").trim();
    if (!draft) return NextResponse.json({ error: "초안 생성 실패" }, { status: 400 });
    return NextResponse.json({ draft, to: row.from_email, subject: `Re: ${(row.subject || "").replace(/^re:\s*/i, "")}` });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e).slice(0, 200) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { sendViaSender, saConfigured } from "@/lib/gmail";
import { unsubUrl } from "@/lib/oc-unsub";
import { askClaude, aiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 테스트 발송 — 캠페인 생성 전에 현재 제목/본문을 지정 주소로 1통 실발송.
// 변수는 샘플 크리에이터 값으로 렌더, 실제 발송과 동일하게 수신거부 헤더·링크 포함(스팸함 도착 여부 점검용).
// oc_messages에 기록하지 않고 일일 한도에도 계상하지 않음.

const SAMPLE_VARS: Record<string, string> = {
  handle: "beauty_creator", views: "125,000", avg_views: "125,000", total_views: "2,400,000",
  videos: "48", brands: "Anua, Torriden", region: "US", profile_url: "https://www.tiktok.com/@beauty_creator",
};

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) => vars[k.toLowerCase()] ?? "");
}
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  if (!saConfigured()) return NextResponse.json({ error: "서비스계정 미설정(GOOGLE_SA_KEY_JSON)" }, { status: 400 });

  const b = (await req.json().catch(() => ({}))) as {
    to?: string; senderId?: number; subject?: string; body?: string; productId?: number; aiLevel?: string;
  };
  const to = String(b.to || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return NextResponse.json({ error: "테스트 수신 이메일 형식 오류" }, { status: 400 });
  const subject = String(b.subject || "").trim();
  const bodyTpl = String(b.body || "").trim();
  if (!subject || !bodyTpl) return NextResponse.json({ error: "제목·본문 필요" }, { status: 400 });

  const s = (await sql`SELECT id, email, display_name FROM oc_senders WHERE active = true AND id = ${Number(b.senderId) || 0}`).rows[0];
  if (!s) return NextResponse.json({ error: "발신 메일함을 선택하세요" }, { status: 400 });

  // 제품 변수
  const vars: Record<string, string> = { ...SAMPLE_VARS, product: "", brand: "", category: "", concept: "", usp: "" };
  if (b.productId) {
    const p = (await sql`SELECT name, brand, category, concept, usp FROM oc_products WHERE id = ${Number(b.productId)}`).rows[0];
    if (p) Object.assign(vars, { product: p.name || "", brand: p.brand || "", category: p.category || "", concept: p.concept || "", usp: p.usp || "" });
  }

  // L2 미리보기: 샘플 크리에이터 기준 오프닝 1회 생성
  let opening = "";
  if (b.aiLevel === "L2" && aiConfigured()) {
    const r = await askClaude(
      "Write ONLY the opening 1-2 sentences of a friendly B2B outreach email to a TikTok creator, personalized with the facts given. Same language as the email body draft provided. No greeting line, no quotes.",
      `크리에이터: @${vars.handle} · 평균 조회 ${vars.avg_views} · 판매 브랜드 ${vars.brands}\n제품: ${vars.product} (${vars.brand})\n본문 초안:\n${bodyTpl.slice(0, 400)}`, 200);
    if (r.ok && r.text) opening = r.text.trim() + "\n\n";
  }

  const rawBody = opening + render(bodyTpl, vars);
  const finalSubject = `[TEST] ${render(subject, vars)}`;
  const looksHtml = /<[a-z][\s\S]*>/i.test(rawBody);
  let html = looksHtml ? rawBody : esc(rawBody).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>");
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://glovek.space").replace(/\/$/, "");
  const uUrl = unsubUrl(site, to);
  html += `<p style="margin-top:24px;font-size:11px;color:#94a3b8">더 이상 제안을 원치 않으시면 <a href="${uUrl}" style="color:#94a3b8">수신거부(Unsubscribe)</a>를 눌러주세요.</p>`;

  const res = await sendViaSender({ email: s.email, display_name: s.display_name }, {
    to, subject: finalSubject, html, text: looksHtml ? undefined : rawBody,
    extraHeaders: [
      `List-Unsubscribe: <mailto:${s.email}?subject=unsubscribe>, <${uUrl}>`,
      `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
    ],
  });
  if (!res.ok) return NextResponse.json({ error: res.error || "발송 실패" }, { status: 400 });
  return NextResponse.json({ ok: true, to, from: s.email, subject: finalSubject, aiOpening: opening.trim() || null });
}

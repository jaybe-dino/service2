import { NextResponse } from "next/server";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { verifyUnsubToken } from "@/lib/oc-unsub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 수신거부 엔드포인트 (인증 불필요 · 토큰 검증)
//  - GET  ?e=&t=  : 확인 랜딩 페이지 (버튼 1회 클릭)
//  - POST ?e=&t=  : 실제 수신거부 처리 — RFC 8058 원클릭(List-Unsubscribe-Post)과 랜딩 버튼 공용

function page(title: string, body: string): NextResponse {
  return new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${title}</title>
<style>body{margin:0;display:grid;place-items:center;min-height:100vh;font-family:system-ui,-apple-system,'Apple SD Gothic Neo',sans-serif;background:#f8fafc;color:#0f172a}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:36px 40px;max-width:420px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.05)}
h1{font-size:18px;margin:0 0 8px}p{font-size:13px;color:#64748b;line-height:1.6;margin:0 0 4px}
button{margin-top:18px;background:#0f172a;color:#fff;border:0;border-radius:10px;padding:11px 26px;font-size:13px;font-weight:700;cursor:pointer}
.ok{color:#059669;font-weight:700}</style></head><body><div class="card">${body}</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function params(req: Request): { email: string; token: string } {
  const u = new URL(req.url);
  return { email: (u.searchParams.get("e") || "").trim().toLowerCase(), token: u.searchParams.get("t") || "" };
}

export async function GET(req: Request) {
  const { email, token } = params(req);
  if (!email || !verifyUnsubToken(email, token)) return page("잘못된 요청", `<h1>잘못된 링크입니다</h1><p>수신거부 링크가 유효하지 않습니다.</p>`);
  return page("수신거부", `
    <h1>메일 수신을 중단할까요?</h1>
    <p>${email}</p><p>아래 버튼을 누르면 앞으로 저희 제안 메일이 발송되지 않습니다.</p>
    <form method="POST"><button type="submit">수신거부 확정</button></form>`);
}

export async function POST(req: Request) {
  const { email, token } = params(req);
  if (!email || !verifyUnsubToken(email, token)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (isConfigured()) {
    await ensureSchema();
    await sql`INSERT INTO oc_suppression (email, reason, source) VALUES (${email}, 'unsubscribe', 'one-click')
      ON CONFLICT (email) DO NOTHING`;
  }
  // 원클릭(메일 클라이언트 자동 POST)은 200 JSON, 랜딩 폼은 완료 페이지
  const accept = req.headers.get("accept") || "";
  if (!accept.includes("text/html")) return NextResponse.json({ ok: true });
  return page("수신거부 완료", `<h1 class="ok">수신거부가 완료되었습니다</h1><p>${email}</p><p>더 이상 제안 메일이 발송되지 않습니다. 감사합니다.</p>`);
}

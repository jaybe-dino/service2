import { NextRequest, NextResponse } from "next/server";

// AI 봇 강제 차단 미들웨어 — robots.txt 선언을 무시하는 봇까지 User-Agent 기준 403.
// 일반 검색엔진(Googlebot·Bingbot)·일반 브라우저는 영향 없음.
//
// ▶ 허가된 접근(소유자/내부 도구): Vercel 환경변수 BOT_ACCESS_TOKEN 설정 후
//    - 헤더  x-bot-token: <토큰>   또는
//    - 최초 1회 ?bot_token=<토큰> 로 접속(쿠키 저장 → 이후 자유 접근)
//   로 우회한다. 토큰 미설정 시 우회 경로 없음(전면 차단만 동작).

const AI_BOT_UA = /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|CCBot|Bytespider|cohere-ai|cohere-training|meta-externalagent|meta-externalfetcher|FacebookBot|Amazonbot|AI2Bot|Diffbot|omgili|Timpibot|YouBot|DuckAssistBot|MistralAI|LinerBot|SemanticScholarBot|PetalBot|iaskspider/i;

export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  if (!AI_BOT_UA.test(ua)) return NextResponse.next();

  // 수신거부 엔드포인트는 항상 허용 (메일 클라이언트의 원클릭 POST가 봇 UA일 수 있음)
  if (req.nextUrl.pathname.startsWith("/api/oc/u")) return NextResponse.next();

  // 허가 토큰 우회: 헤더 · 쿠키 · 최초 쿼리파람(쿠키 발급)
  const token = (process.env.BOT_ACCESS_TOKEN || "").trim();
  if (token) {
    const qp = req.nextUrl.searchParams.get("bot_token");
    const ok =
      req.headers.get("x-bot-token") === token ||
      req.cookies.get("bot_token")?.value === token ||
      qp === token;
    if (ok) {
      const res = NextResponse.next();
      if (qp === token) res.cookies.set("bot_token", token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
      return res;
    }
  }

  return new NextResponse("AI crawler access is not permitted on this site.", {
    status: 403,
    headers: { "content-type": "text/plain", "x-robots-tag": "noai, noimageai" },
  });
}

// 정적 에셋은 미들웨어 스킵(비용·지연 절감) — 페이지·API만 검사
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico|css|js|map)$).*)"],
};

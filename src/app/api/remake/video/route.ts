import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Gemini 결과 영상 프록시 — 구글 파일 URI는 API 키가 있어야 받으므로 서버에서 대신 받아 스트리밍.
// 임의 URL 프록시(SSRF) 방지: googleapis.com 호스트만 허용.
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u");
  if (!u) return new NextResponse("missing u", { status: 400 });
  let target: URL;
  try {
    target = new URL(u);
  } catch {
    return new NextResponse("bad url", { status: 400 });
  }
  if (target.protocol !== "https:" || !/(^|\.)googleapis\.com$/.test(target.hostname)) {
    return new NextResponse("host not allowed", { status: 403 });
  }
  const upstream = await fetch(target.toString(), {
    headers: { "x-goog-api-key": (process.env.GEMINI_API_KEY || "").trim() },
  });
  if (!upstream.ok || !upstream.body) {
    return new NextResponse("upstream error", { status: 502 });
  }
  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "video/mp4",
      "Cache-Control": "private, max-age=600",
    },
  });
}

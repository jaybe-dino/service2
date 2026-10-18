import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TikTok 커버 썸네일 프록시 — 브라우저 핫링크/Referer 차단 우회용(서버에서 가져와 스트리밍).
// 허용 호스트만(오픈 프록시·SSRF 방지). 만료/실패 시 404 → 클라이언트에서 폴백 카드 처리.
const ALLOW_SUFFIX = [".tiktokcdn.com", ".tiktokcdn-us.com", ".ttwstatic.com", ".tiktok.com", ".byteimg.com", ".ibyteimg.com"];

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u") || "";
  let target: URL;
  try { target = new URL(raw); } catch { return new NextResponse(null, { status: 400 }); }
  if (target.protocol !== "https:" || !ALLOW_SUFFIX.some((s) => target.hostname.endsWith(s))) {
    return new NextResponse(null, { status: 403 });
  }
  try {
    const r = await fetch(target.toString(), {
      headers: {
        Referer: "https://www.tiktok.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(6000),
    });
    const ct = r.headers.get("content-type") || "";
    if (!r.ok || !ct.startsWith("image/")) return new NextResponse(null, { status: 404 });
    const buf = await r.arrayBuffer();
    return new NextResponse(buf, {
      headers: { "content-type": ct, "cache-control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

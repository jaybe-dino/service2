import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 진단용: 프레임 워커가 실제로 프레임을 반환하는지 확인. 생성/비용 없음.
// 사용: /api/remake/frames-debug?url=<틱톡 영상 URL>
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url") || "";
  const svc = process.env.REMAKE_FRAME_SERVICE_URL || "";
  const out: Record<string, unknown> = {
    frameServiceConfigured: Boolean(svc),
    frameServiceUrl: svc ? svc.replace(/\/+$/, "") : null,
    hasKey: Boolean(process.env.REMAKE_FRAME_SERVICE_KEY),
  };

  // 1) oEmbed 커버 프레임 확인
  if (url) {
    try {
      const o = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      const j = o.ok ? ((await o.json()) as { thumbnail_url?: string }) : null;
      out.oembedThumb = j?.thumbnail_url || `oembed ${o.status}`;
    } catch (e) {
      out.oembedThumb = `error: ${String(e).slice(0, 120)}`;
    }
  }

  // 2) 프레임 워커 직접 호출 (count=6)
  if (svc && url) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 40000);
      const res = await fetch(svc, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.REMAKE_FRAME_SERVICE_KEY ? { authorization: `Bearer ${process.env.REMAKE_FRAME_SERVICE_KEY}` } : {}),
        },
        body: JSON.stringify({ videoUrl: url, count: 6 }),
        signal: ac.signal,
      }).finally(() => clearTimeout(timer));
      const text = await res.text();
      let parsed: { frames?: unknown[] } | null = null;
      try { parsed = JSON.parse(text); } catch { parsed = null; }
      const frames = Array.isArray(parsed?.frames) ? parsed!.frames : [];
      out.worker = {
        httpStatus: res.status,
        framesReturned: frames.length,
        nonNullFrames: frames.filter(Boolean).length,
        bodyPreview: text.slice(0, 400),
      };
    } catch (e) {
      out.worker = { error: String(e).slice(0, 200) };
    }
  } else if (!svc) {
    out.worker = "REMAKE_FRAME_SERVICE_URL 미설정 → 항상 커버 1장으로 폴백(분석 제한)";
  } else {
    out.worker = "?url= 파라미터에 틱톡 영상 URL을 넣어 테스트하세요";
  }

  return NextResponse.json(out);
}

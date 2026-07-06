// Remake Studio — 레퍼런스 프레임 취득 (분석·스타일 조건 공용).
// 커버 프레임(oEmbed 1장) + 장면별/스트립 프레임(배포형 워커) 두 소스.
export interface Frame { b64: string; mime: string }

// 씬 타임코드("2-8s") → 대표 시각(초, 중간값).
export function midTime(t?: string, idx = 0): number {
  const m = /(\d+)\s*-\s*(\d+)/.exec(t || "");
  if (m) return Math.max(0, (Number(m[1]) + Number(m[2])) / 2);
  const m2 = /(\d+)/.exec(t || "");
  return m2 ? Number(m2[1]) : idx * 3;
}

// 레퍼런스 대표 프레임(oEmbed 썸네일) → base64. 워커 없을 때 폴백.
export async function fetchCoverFrame(tiktokUrl: string): Promise<Frame | null> {
  try {
    const o = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`);
    if (!o.ok) return null;
    const j = (await o.json()) as { thumbnail_url?: string };
    const thumb = j?.thumbnail_url;
    if (!thumb || !/^https:\/\//.test(thumb)) return null;
    const img = await fetch(thumb);
    if (!img.ok) return null;
    const mime = img.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await img.arrayBuffer());
    return { b64: buf.toString("base64"), mime };
  } catch {
    return null;
  }
}

// 장면별/스트립 프레임 추출 서비스(배포형 워커) 호출 — REMAKE_FRAME_SERVICE_URL 설정 시.
// 계약: POST { videoUrl, timestamps:[초...] } → { frames:[{ b64|data, mime }|null] } (인덱스 매칭)
export async function fetchSceneFrames(videoUrl: string, timestamps: number[]): Promise<(Frame | null)[]> {
  const svc = process.env.REMAKE_FRAME_SERVICE_URL;
  if (!svc) return timestamps.map(() => null);
  try {
    const res = await fetch(svc, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.REMAKE_FRAME_SERVICE_KEY ? { authorization: `Bearer ${process.env.REMAKE_FRAME_SERVICE_KEY}` } : {}),
      },
      body: JSON.stringify({ videoUrl, timestamps }),
    });
    if (!res.ok) return timestamps.map(() => null);
    const j = (await res.json()) as { frames?: { b64?: string; data?: string; mime?: string }[] };
    const frames = Array.isArray(j.frames) ? j.frames : [];
    return timestamps.map((_, i) => {
      const f = frames[i];
      const b64 = f?.b64 || f?.data;
      return b64 ? { b64, mime: f?.mime || "image/jpeg" } : null;
    });
  } catch {
    return timestamps.map(() => null);
  }
}

// 분석용 스트립: 숏폼 전체에 걸친 대표 시각(워커 있으면 실제 프레임, 없으면 빈 배열).
export async function fetchAnalysisFrames(tiktokUrl: string): Promise<Frame[]> {
  const ts = [1, 3, 5, 8, 11, 14];
  const strip = await fetchSceneFrames(tiktokUrl, ts);
  return strip.filter((f): f is Frame => !!f);
}

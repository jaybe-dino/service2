// Remake Studio — 레퍼런스 프레임 취득 (분석·스타일 조건 공용).
// 커버 프레임(oEmbed 1장) + 장면별/스트립 프레임(배포형 워커) 두 소스.
export interface Frame { b64: string; mime: string }

// 타임박스 fetch — 느린 워커/네트워크가 생성 요청 전체를 죽이지 않도록.
async function fetchT(url: string, opts: RequestInit = {}, ms = 20000): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

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
    const o = await fetchT(`https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`, {}, 8000);
    if (!o.ok) return null;
    const j = (await o.json()) as { thumbnail_url?: string };
    const thumb = j?.thumbnail_url;
    if (!thumb || !/^https:\/\//.test(thumb)) return null;
    const img = await fetchT(thumb, {}, 8000);
    if (!img.ok) return null;
    const mime = img.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await img.arrayBuffer());
    return { b64: buf.toString("base64"), mime };
  } catch {
    return null;
  }
}

// 프레임 추출 서비스(배포형 워커) 호출 — REMAKE_FRAME_SERVICE_URL 설정 시.
// 계약: POST { videoUrl, timestamps?:[초...], count?:N } → { frames:[{ b64|data, mime }|null] }
// 스킴 누락 보정(https:// 자동 추가) + 끝 슬래시 제거.
function normalizeSvc(u: string): string {
  const t = u.trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(t) ? t : `https://${t}`;
}

async function callFrameService(payload: Record<string, unknown>, n: number): Promise<(Frame | null)[]> {
  const raw = process.env.REMAKE_FRAME_SERVICE_URL;
  if (!raw) return Array.from({ length: n }, () => null);
  const svc = normalizeSvc(raw);
  try {
    const res = await fetchT(svc, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.REMAKE_FRAME_SERVICE_KEY ? { authorization: `Bearer ${process.env.REMAKE_FRAME_SERVICE_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
    }, 28000);
    if (!res.ok) return Array.from({ length: n }, () => null);
    const j = (await res.json()) as { frames?: { b64?: string; data?: string; mime?: string }[] };
    const frames = Array.isArray(j.frames) ? j.frames : [];
    return Array.from({ length: n }, (_, i) => {
      const f = frames[i];
      const b64 = f?.b64 || f?.data;
      return b64 ? { b64, mime: f?.mime || "image/jpeg" } : null;
    });
  } catch {
    return Array.from({ length: n }, () => null);
  }
}

// 장면별 프레임(생성용): 각 씬 타임스탬프의 실제 프레임.
export async function fetchSceneFrames(videoUrl: string, timestamps: number[]): Promise<(Frame | null)[]> {
  return callFrameService({ videoUrl, timestamps }, timestamps.length);
}

// 분석용 스트립(소스 분석용): 영상 길이 기준 균등 N장(워커가 ffprobe로 샘플링).
export async function fetchAnalysisFrames(tiktokUrl: string, count = 6): Promise<Frame[]> {
  const strip = await callFrameService({ videoUrl: tiktokUrl, count }, count);
  return strip.filter((f): f is Frame => !!f);
}

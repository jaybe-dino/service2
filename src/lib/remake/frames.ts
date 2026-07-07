// Remake Studio — 레퍼런스 프레임 취득 (분석·스타일 조건 공용).
// 커버 프레임(oEmbed 1장) + 장면별/스트립 프레임(배포형 워커) + DB 캐시.
import { sql, isConfigured } from "@/lib/db";

export interface Frame { b64: string; mime: string }
interface TFrame { ts: number; b64: string; mime: string }

// 틱톡 영상 ID 추출(캐시 키).
function videoId(url: string): string | null {
  const m = /\/video\/(\d+)/.exec(url) || /\/(\d{8,})/.exec(url);
  return m ? m[1] : null;
}
async function loadCached(vid: string): Promise<TFrame[]> {
  if (!isConfigured()) return [];
  try {
    const { rows } = await sql<{ ts: string | number | null; mime: string | null; data: string }>`
      SELECT ts, mime, data FROM remake_ref_frames WHERE video_id=${vid} ORDER BY idx`;
    return rows.map((r) => ({ ts: Number(r.ts) || 0, b64: r.data, mime: r.mime || "image/jpeg" }));
  } catch {
    return [];
  }
}
async function saveCached(vid: string, items: TFrame[]): Promise<void> {
  if (!isConfigured() || !items.length) return;
  try {
    await sql`DELETE FROM remake_ref_frames WHERE video_id=${vid}`;
    for (let i = 0; i < items.length; i++) {
      await sql`INSERT INTO remake_ref_frames (video_id, idx, ts, mime, data)
        VALUES (${vid}, ${i}, ${items[i].ts}, ${items[i].mime}, ${items[i].b64})`;
    }
  } catch {
    /* 캐시 실패 무시 */
  }
}

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
    const o = await fetchT(`https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`, {}, 6000);
    if (!o.ok) return null;
    const j = (await o.json()) as { thumbnail_url?: string };
    const thumb = j?.thumbnail_url;
    if (!thumb || !/^https:\/\//.test(thumb)) return null;
    const img = await fetchT(thumb, {}, 6000);
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

// 워커 호출 → 프레임 + 타임스탬프 반환.
async function callFrameServiceFull(payload: Record<string, unknown>): Promise<{ frames: (Frame | null)[]; timestamps: number[] }> {
  const raw = process.env.REMAKE_FRAME_SERVICE_URL;
  if (!raw) return { frames: [], timestamps: [] };
  const svc = normalizeSvc(raw);
  try {
    const res = await fetchT(svc, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.REMAKE_FRAME_SERVICE_KEY ? { authorization: `Bearer ${process.env.REMAKE_FRAME_SERVICE_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
    }, 20000);
    if (!res.ok) return { frames: [], timestamps: [] };
    const j = (await res.json()) as { frames?: { b64?: string; data?: string; mime?: string }[]; timestamps?: number[] };
    const rawFrames = Array.isArray(j.frames) ? j.frames : [];
    const frames = rawFrames.map((f) => {
      const b64 = f?.b64 || f?.data;
      return b64 ? { b64, mime: f?.mime || "image/jpeg" } : null;
    });
    return { frames, timestamps: Array.isArray(j.timestamps) ? j.timestamps : [] };
  } catch {
    return { frames: [], timestamps: [] };
  }
}

// 분석용 스트립 — 캐시 우선. 캐시에 있으면 워커/다운로드 생략.
export async function fetchAnalysisFrames(tiktokUrl: string, count = 6): Promise<Frame[]> {
  const vid = videoId(tiktokUrl);
  if (vid) {
    const cached = await loadCached(vid);
    if (cached.length) return cached.map((c) => ({ b64: c.b64, mime: c.mime }));
  }
  const { frames, timestamps } = await callFrameServiceFull({ videoUrl: tiktokUrl, count });
  const paired: TFrame[] = frames
    .map((f, i) => (f ? { ts: Number(timestamps[i]) || i, b64: f.b64, mime: f.mime } : null))
    .filter((x): x is TFrame => !!x);
  if (vid && paired.length) await saveCached(vid, paired);
  return paired.map((p) => ({ b64: p.b64, mime: p.mime }));
}

// 장면별 프레임(생성용) — 캐시 우선. 캐시 있으면 각 씬 타임스탬프에 가장 가까운 프레임 사용(다운로드 생략).
export async function fetchSceneFrames(videoUrl: string, timestamps: number[]): Promise<(Frame | null)[]> {
  const vid = videoId(videoUrl);
  if (vid) {
    const cached = await loadCached(vid);
    if (cached.length) {
      return timestamps.map((t) => {
        const best = cached.reduce((a, b) => (Math.abs(b.ts - t) < Math.abs(a.ts - t) ? b : a));
        return { b64: best.b64, mime: best.mime };
      });
    }
  }
  const { frames, timestamps: got } = await callFrameServiceFull({ videoUrl, timestamps });
  // 캐시에 저장(다음 생성 가속)
  const paired: TFrame[] = frames
    .map((f, i) => (f ? { ts: Number((got[i] ?? timestamps[i])) || i, b64: f.b64, mime: f.mime } : null))
    .filter((x): x is TFrame => !!x);
  if (vid && paired.length) await saveCached(vid, paired);
  return timestamps.map((_, i) => frames[i] ?? null);
}

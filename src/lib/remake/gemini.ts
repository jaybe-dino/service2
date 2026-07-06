// Gemini(Veo / Omni Flash) 영상 생성 연동. 서버 전용.
// 규격: Google Generative Language API의 predictLongRunning + operation 폴링 패턴.
//   제출: POST {BASE}/models/{model}:predictLongRunning  (x-goog-api-key)
//         body: { instances:[{ prompt, image:{ bytesBase64Encoded, mimeType } }], parameters:{...} }
//         → { name: "models/.../operations/..." }
//   상태: GET {BASE}/{operationName}  → { done, response, error }
//   결과 영상 URI는 키가 있어야 다운로드 가능 → /api/remake/video 프록시로 재생.
// ⚠️ Omni Flash의 정확한 모델 ID/응답 경로는 배포 시점에 따라 다를 수 있어,
//    모델은 env(GEMINI_VIDEO_MODEL)로 지정하고 결과 경로는 방어적으로 탐색한다.

const BASE = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function key(): string {
  return (process.env.GEMINI_API_KEY || "").trim();
}

export interface GeminiSubmitInput {
  imageBase64: string;
  imageMime: string;
  prompt: string;
  model: string;
  aspectRatio?: string;
  negativePrompt?: string;
}

export async function submitImage2Video(i: GeminiSubmitInput): Promise<{ requestId: string }> {
  const res = await fetch(`${BASE}/models/${i.model}:predictLongRunning`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key() },
    body: JSON.stringify({
      instances: [
        {
          prompt: i.prompt,
          image: { bytesBase64Encoded: i.imageBase64, mimeType: i.imageMime || "image/png" },
        },
      ],
      parameters: {
        aspectRatio: i.aspectRatio || "9:16",
        sampleCount: 1,
        ...(i.negativePrompt ? { negativePrompt: i.negativePrompt } : {}),
      },
    }),
  });
  const text = await res.text();
  const json = safeJson(text);
  if (!res.ok) throw new Error(`gemini submit ${res.status}: ${text.slice(0, 200)}`);
  const name = json?.name;
  if (!name || typeof name !== "string") throw new Error(`gemini submit: operation name 없음 (${text.slice(0, 160)})`);
  return { requestId: name };
}

export type JobStatus = "queued" | "in_progress" | "completed" | "failed" | "nsfw";
export interface StatusResult { status: JobStatus; videoUrl?: string; error?: string }

export async function fetchStatus(operationName: string): Promise<StatusResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/${operationName}`, { headers: { "x-goog-api-key": key() } });
  } catch (e) {
    return { status: "in_progress", error: `network: ${String(e).slice(0, 120)}` };
  }
  const text = await res.text();
  const json = safeJson(text);
  if (!res.ok) {
    if (res.status >= 500) return { status: "in_progress", error: `status ${res.status}` };
    return { status: "failed", error: `status ${res.status}` };
  }
  if (json?.error) {
    const err = json.error as { message?: string };
    return { status: "failed", error: String(err?.message || "error") };
  }
  if (!json?.done) return { status: "in_progress" };

  const uri = extractVideoUri(json);
  if (!uri) return { status: "failed", error: "완료됐지만 영상 URI를 찾지 못함" };
  // 구글 파일 URI는 키가 있어야 받으므로 프록시 경유
  return { status: "completed", videoUrl: `/api/remake/video?u=${encodeURIComponent(uri)}` };
}

function safeJson(t: string): Record<string, unknown> | null {
  try { return t ? JSON.parse(t) : {}; } catch { return null; }
}

// 결과 경로가 모델/버전에 따라 다를 수 있어 방어적으로 탐색.
function extractVideoUri(j: unknown): string | undefined {
  const o = (j || {}) as Record<string, unknown>;
  const resp = (o.response || {}) as Record<string, unknown>;
  const uriOf = (v: unknown): string | undefined => {
    if (!v || typeof v !== "object") return undefined;
    const vid = (v as Record<string, unknown>).video as Record<string, unknown> | undefined;
    const direct = (v as Record<string, unknown>).uri;
    if (typeof direct === "string") return direct;
    if (vid && typeof vid.uri === "string") return vid.uri;
    return undefined;
  };
  const gvr = (resp.generateVideoResponse || {}) as Record<string, unknown>;
  const samples =
    (Array.isArray(gvr.generatedSamples) && gvr.generatedSamples) ||
    (Array.isArray(resp.generatedVideos) && resp.generatedVideos) ||
    (Array.isArray((resp.predictions as unknown[])) && (resp.predictions as unknown[])) ||
    [];
  for (const s of samples as unknown[]) {
    const u = uriOf(s);
    if (u) return u;
  }
  return undefined;
}

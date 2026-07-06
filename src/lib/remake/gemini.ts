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
  refImageBase64?: string; // 레퍼런스 프레임(영상 스타일 조건)
  refImageMime?: string;
  prompt: string;
  model: string;
  aspectRatio?: string;
  negativePrompt?: string;
}

export async function submitImage2Video(i: GeminiSubmitInput): Promise<{ requestId: string }> {
  // Omni Flash는 Interactions API(다른 규격), Veo류는 predictLongRunning.
  if (/omni/i.test(i.model)) return submitOmni(i);
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

export async function fetchStatus(requestId: string): Promise<StatusResult> {
  if (requestId.startsWith("omni::")) return fetchOmniStatus(requestId.slice(6));
  const operationName = requestId;
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

// ── Omni Flash: Interactions API ──────────────────────────────────────────
// 제출: POST /v1beta/interactions { model, input:[image,text], response_format:{delivery:"uri"} }
// 비동기: output_video URI를 받아 파일 상태(state.name)가 ACTIVE 될 때까지 폴링.
// ⚠️ 문서 접근 제한으로 응답 필드는 방어적으로 파싱 — 실제 응답과 다르면 이 두 함수만 조정.
async function submitOmni(i: GeminiSubmitInput): Promise<{ requestId: string }> {
  // reference-to-video: [스타일 레퍼런스 프레임(있으면), 제품 이미지, 지시 텍스트]
  const input: Record<string, string>[] = [];
  if (i.refImageBase64) input.push({ type: "image", data: i.refImageBase64, mime_type: i.refImageMime || "image/jpeg" });
  input.push({ type: "image", data: i.imageBase64, mime_type: i.imageMime || "image/png" });
  input.push({ type: "text", text: i.prompt });
  // 인증 이중화: 헤더 + ?key= (엔드포인트별 차이 대비)
  const res = await fetch(`${BASE}/interactions?key=${encodeURIComponent(key())}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key() },
    // response_format.type 필수(오류로 확인). 영상 출력 + URI 전달.
    body: JSON.stringify({ model: i.model, input, response_format: { type: "video", delivery: "uri" } }),
  });
  const text = await res.text();
  const json = safeJson(text);
  if (!res.ok) throw new Error(`omni submit ${res.status} @${BASE}/interactions model=${i.model}: ${text.slice(0, 240)}`);
  // 동기 응답(이미 영상 URI 포함)이면 즉시 완료 처리.
  const readyUri = extractOmniVideoUri(json);
  const ref = extractOmniRef(json);
  if (readyUri && (!ref || ref === readyUri)) return { requestId: `omni::done:${readyUri}` };
  if (ref) return { requestId: `omni::${ref}` };
  if (readyUri) return { requestId: `omni::done:${readyUri}` };
  throw new Error(`omni submit: 폴링 참조/영상 URI 없음 — 응답=${text.slice(0, 220)}`);
}

async function fetchOmniStatus(ref: string): Promise<StatusResult> {
  // 동기 완료 케이스
  if (ref.startsWith("done:")) {
    const uri = ref.slice(5);
    return { status: "completed", videoUrl: `/api/remake/video?u=${encodeURIComponent(uri)}` };
  }
  const base = ref.startsWith("http") ? ref : `${BASE}/${ref.replace(/^\//, "")}`;
  const url = base.includes("key=") ? base : `${base}${base.includes("?") ? "&" : "?"}key=${encodeURIComponent(key())}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { "x-goog-api-key": key() } });
  } catch (e) {
    return { status: "in_progress", error: `network: ${String(e).slice(0, 120)}` };
  }
  const text = await res.text();
  const json = safeJson(text);
  if (!res.ok) return res.status >= 500 ? { status: "in_progress" } : { status: "failed", error: `status ${res.status}` };
  const stateRaw = (json?.state as { name?: string } | string | undefined);
  const state = String((typeof stateRaw === "object" ? stateRaw?.name : stateRaw) || "").toUpperCase();
  if (state === "FAILED" || json?.error) return { status: "failed", error: state || "error" };
  const done = json?.done === true || state === "ACTIVE" || state === "SUCCEEDED";
  const uri = extractOmniVideoUri(json);
  if (done && uri) return { status: "completed", videoUrl: `/api/remake/video?u=${encodeURIComponent(uri)}` };
  if (done && !uri) return { status: "failed", error: "완료됐지만 영상 URI를 찾지 못함" };
  return { status: "in_progress" };
}

function extractOmniRef(j: unknown): string | undefined {
  const o = (j || {}) as Record<string, unknown>;
  const ov = (o.output_video || o.outputVideo) as Record<string, unknown> | undefined;
  const cands = [
    ov?.uri, ov?.name,
    (o.operation as Record<string, unknown> | undefined)?.name,
    o.name, o.id,
  ];
  const c = cands.find((v) => typeof v === "string");
  return typeof c === "string" ? c : undefined;
}

function extractOmniVideoUri(j: unknown): string | undefined {
  const o = (j || {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const ov = (o.output_video || o.outputVideo) as Record<string, unknown> | undefined;
  const withMedia = (u?: string) => (u && /googleapis\.com\/.*\/files\//.test(u) && !/[?&]alt=/.test(u) ? `${u}${u.includes("?") ? "&" : "?"}alt=media` : u);
  return (
    str(ov?.uri) ||
    str((o.video as Record<string, unknown> | undefined)?.uri) ||
    withMedia(str(o.download_uri) || str(o.downloadUri) || str(o.uri)) ||
    undefined
  );
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

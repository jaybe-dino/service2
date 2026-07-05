// Higgsfield 영상 생성 연동 (Remake Studio). 서버 전용.
// 공식 SDK(@higgsfield/client) v2 규격을 얇은 REST 호출로 구현 — 벤더 세부는 이 파일에만 격리.
//   인증: HF_CREDENTIALS = "KEY_ID:KEY_SECRET"  →  Authorization: Key KEY_ID:KEY_SECRET
//   제출: POST {BASE}/v1/image2video/dop   body: { model, prompt, input_images:[{type,image_url}] }
//   상태: GET  {BASE}/requests/{request_id}/status
// 키 미설정 시 hasHiggsfield()=false → 상위 라우트가 mock(시뮬레이션)으로 폴백.

const BASE = process.env.HF_BASE_URL || "https://platform.higgsfield.ai";

export function hasHiggsfield(): boolean {
  return Boolean(process.env.HF_CREDENTIALS && process.env.HF_CREDENTIALS.includes(":"));
}

function authHeader(): string {
  return `Key ${(process.env.HF_CREDENTIALS || "").trim()}`;
}

export interface SubmitInput {
  imageUrl: string;
  prompt: string;
  model?: string;
}

// 이미지→영상 잡 제출. 성공 시 request_id 반환.
export async function submitImage2Video({ imageUrl, prompt, model }: SubmitInput): Promise<{ requestId: string }> {
  const res = await fetch(`${BASE}/v1/image2video/dop`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({
      model: model || process.env.HF_MODEL || "dop-turbo",
      prompt,
      input_images: [{ type: "image_url", image_url: imageUrl }],
    }),
  });
  const text = await res.text();
  const json = safeJson(text);
  if (!res.ok) throw new Error(`higgsfield submit ${res.status}: ${text.slice(0, 200)}`);
  const requestId = json?.request_id || json?.id || json?.requestId;
  if (!requestId) throw new Error(`higgsfield submit: request_id 없음 (${text.slice(0, 200)})`);
  return { requestId: String(requestId) };
}

export type JobStatus = "queued" | "in_progress" | "completed" | "failed" | "nsfw";
export interface StatusResult {
  status: JobStatus;
  videoUrl?: string;
  error?: string;
}

// 잡 상태 조회. 완료 시 videoUrl 포함.
export async function fetchStatus(requestId: string): Promise<StatusResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/requests/${requestId}/status`, { headers: { Authorization: authHeader() } });
  } catch (e) {
    return { status: "in_progress", error: `network: ${String(e).slice(0, 120)}` };
  }
  const text = await res.text();
  const json = safeJson(text);
  if (!res.ok) {
    // 일시적 5xx는 진행 중으로 취급해 폴링 지속
    if (res.status >= 500) return { status: "in_progress", error: `status ${res.status}` };
    return { status: "failed", error: `status ${res.status}` };
  }
  const raw = String(json?.status || "").toLowerCase();
  const videoUrl = extractVideoUrl(json);
  if (raw === "completed" || videoUrl) return { status: "completed", videoUrl };
  if (raw === "failed" || raw === "nsfw" || raw === "canceled" || raw === "error") {
    return { status: raw === "nsfw" ? "nsfw" : "failed", error: raw };
  }
  if (raw === "in_progress" || raw === "processing" || raw === "running") return { status: "in_progress" };
  return { status: "queued" };
}

function safeJson(text: string): Record<string, unknown> | null {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return null;
  }
}

// 결과 필드가 모델/버전에 따라 다를 수 있어 방어적으로 탐색.
function extractVideoUrl(j: unknown): string | undefined {
  const o = (j || {}) as Record<string, unknown>;
  const get = (v: unknown): string | undefined =>
    v && typeof v === "object" && typeof (v as Record<string, unknown>).url === "string"
      ? ((v as Record<string, unknown>).url as string)
      : undefined;
  const results = o.results as Record<string, unknown> | undefined;
  return (
    get(o.video) ||
    get(results?.raw) ||
    get(results?.min) ||
    (Array.isArray(o.results) ? get(o.results[0]) : undefined) ||
    (Array.isArray(o.videos) ? get((o.videos as unknown[])[0]) : undefined) ||
    (Array.isArray(o.images) ? get((o.images as unknown[])[0]) : undefined) ||
    undefined
  );
}

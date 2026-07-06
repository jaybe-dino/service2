// Remake Studio — 영상 생성 벤더 추상화.
// 벤더별 세부는 higgsfield.ts / gemini.ts에 격리하고, 여기서 공통 인터페이스로 묶는다.
// 선택: REMAKE_PROVIDER(higgsfield|gemini|mock) 또는 자동(키 있는 것 우선).
// 품질 티어(draft/hd/premium) → 벤더별 모델 매핑도 env로 조정 가능.
import * as hf from "./higgsfield";
import * as gm from "./gemini";

export type Tier = "draft" | "hd" | "premium";
export type ProviderId = "higgsfield" | "gemini" | "mock";
export const TIERS: Tier[] = ["draft", "hd", "premium"];

export interface SubmitInput {
  prompt: string;
  tier: Tier;
  imageUrl?: string;      // 공개 URL (higgsfield)
  imageBase64?: string;   // base64 (gemini)
  imageMime?: string;
  aspectRatio?: string;
  negativePrompt?: string;
}
export interface SubmitResult { requestId: string }
export type JobStatus = "queued" | "in_progress" | "completed" | "failed" | "nsfw";
export interface StatusResult { status: JobStatus; videoUrl?: string; error?: string }

export interface VideoProvider {
  id: ProviderId;
  label: string;
  available(): boolean;
  needsPublicImageUrl: boolean;
  submit(i: SubmitInput): Promise<SubmitResult>;
  status(requestId: string): Promise<StatusResult>;
}

// 티어 → 모델 매핑 (env로 오버라이드)
const HF_MODEL: Record<Tier, string> = {
  draft: process.env.HF_DRAFT_MODEL || "dop-turbo",
  hd: process.env.HF_MODEL || "dop",
  premium: process.env.HF_PREMIUM_MODEL || process.env.HF_MODEL || "dop",
};
// Gemini 영상 모델. GEMINI_VIDEO_MODEL 하나만 지정하면 전 티어가 그걸 사용.
// (Omni Flash = gemini-omni-flash-preview[Interactions API] / Veo = veo-3.1-generate-preview[predictLongRunning])
const GM_MODEL: Record<Tier, string> = {
  draft: process.env.GEMINI_DRAFT_MODEL || process.env.GEMINI_VIDEO_MODEL || "veo-3.1-generate-preview",
  hd: process.env.GEMINI_HD_MODEL || process.env.GEMINI_VIDEO_MODEL || "veo-3.1-generate-preview",
  premium: process.env.GEMINI_VIDEO_MODEL || "gemini-omni-flash-preview",
};

export const higgsfieldProvider: VideoProvider = {
  id: "higgsfield",
  label: "Higgsfield",
  needsPublicImageUrl: true,
  available: () => hf.hasHiggsfield(),
  async submit(i) {
    if (!i.imageUrl) throw new Error("higgsfield: 공개 이미지 URL이 필요합니다.");
    return hf.submitImage2Video({ imageUrl: i.imageUrl, prompt: i.prompt, model: HF_MODEL[i.tier] });
  },
  status: (id) => hf.fetchStatus(id),
};

export const geminiProvider: VideoProvider = {
  id: "gemini",
  label: "Gemini (Omni Flash)",
  needsPublicImageUrl: false,
  available: () => gm.hasGemini(),
  async submit(i) {
    if (!i.imageBase64) throw new Error("gemini: 제품 이미지가 필요합니다.");
    return gm.submitImage2Video({
      imageBase64: i.imageBase64,
      imageMime: i.imageMime || "image/png",
      prompt: i.prompt,
      model: GM_MODEL[i.tier],
      aspectRatio: i.aspectRatio,
      negativePrompt: i.negativePrompt,
    });
  },
  status: (id) => gm.fetchStatus(id),
};

// mock: 실제 호출 없이 상태 라우트가 경과시간으로 완료 처리(videoUrl 없음)
export const mockProvider: VideoProvider = {
  id: "mock",
  label: "시뮬레이션",
  needsPublicImageUrl: false,
  available: () => true,
  async submit() {
    return { requestId: "mock" };
  },
  async status() {
    return { status: "in_progress" };
  },
};

const REGISTRY: Record<ProviderId, VideoProvider> = {
  higgsfield: higgsfieldProvider,
  gemini: geminiProvider,
  mock: mockProvider,
};

export function providerById(id: string): VideoProvider {
  return REGISTRY[(id as ProviderId)] || mockProvider;
}

// 실제 생성에 사용할 프로바이더 선택.
export function selectProvider(): VideoProvider {
  const forced = (process.env.REMAKE_PROVIDER || "").toLowerCase();
  if (forced === "higgsfield" && higgsfieldProvider.available()) return higgsfieldProvider;
  if (forced === "gemini" && geminiProvider.available()) return geminiProvider;
  if (forced === "mock") return mockProvider;
  // 자동: 키 있는 것 우선(Higgsfield → Gemini)
  if (higgsfieldProvider.available()) return higgsfieldProvider;
  if (geminiProvider.available()) return geminiProvider;
  return mockProvider;
}

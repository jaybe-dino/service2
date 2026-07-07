// Remake Studio — 이미지 편집(제품 스왑). 서버 전용.
// 레퍼런스 프레임에서 "제품만" 내 제품으로 교체(구도·조명·나머지는 그대로) → 가장 긴밀한 재현.
// Gemini 이미지 모델(Nano Banana, gemini-2.5-flash-image 등) generateContent 사용.
const BASE = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

export function hasImageEdit(): boolean {
  return Boolean(process.env.GEMINI_API_KEY) && process.env.REMAKE_FRAME_EDIT !== "0";
}

interface Img { b64: string; mime: string }

async function fetchT(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Nano Banana(generateContent, IMAGE 출력) 공통 호출. parts에 이미지+텍스트를 넣고 결과 이미지를 반환.
async function generateImage(parts: unknown[], ms: number): Promise<Img | null> {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return null;
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  try {
    const res = await fetchT(
      `${BASE}/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      },
      ms,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { inline_data?: { data?: string; mime_type?: string }; inlineData?: { data?: string; mimeType?: string } }[] } }[];
    };
    const out = json?.candidates?.[0]?.content?.parts || [];
    for (const p of out) {
      const d = p.inline_data?.data || p.inlineData?.data;
      const m = p.inline_data?.mime_type || p.inlineData?.mimeType;
      if (d) return { b64: d, mime: m || "image/png" };
    }
    return null;
  } catch {
    return null;
  }
}

// 맥락 기반 재창조: 내 제품을 '새로운 장면(새 인물·배경·스타일)'에 자연스럽게 합성한 스틸 생성.
// 레퍼런스는 복제하지 않고, 분석에서 나온 sceneImagePrompt(맥락)만 반영. 실패 시 null(상위 폴백).
export async function composeScene(product: Img, scenePrompt: string): Promise<Img | null> {
  const instruction =
    "Create a brand-new, photorealistic vertical 9:16 short-form (TikTok/UGC) scene. " +
    "The attached image is MY product — feature it naturally in the scene and keep its real label, shape and color faithful. " +
    "Use a completely NEW person, NEW environment and NEW styling (do not copy any specific real person or brand). " +
    `Scene to create: ${scenePrompt}. ` +
    "Clean, bright, high-conversion beauty aesthetic. Absolutely NO on-screen text, captions, letters, numbers, hashtags, logos or UI overlays.";
  return generateImage(
    [
      { inline_data: { mime_type: product.mime || "image/png", data: product.b64 } },
      { text: instruction },
    ],
    24000,
  );
}

// (레거시) 레퍼런스 프레임에서 제품만 교체 — 프레임-복제 모드에서 사용. 유지하되 기본 경로는 composeScene.
export async function editProductSwap(ref: Img, product: Img, extra = ""): Promise<Img | null> {
  const instruction =
    "Image 1 is a real frame from a reference video. Image 2 is MY product. " +
    "Edit Image 1 so that the beauty product shown is replaced with MY product from Image 2. " +
    "Keep EVERYTHING else identical — same composition, camera angle, framing, hands/person, background, lighting, color grade and mood. " +
    "Only swap the product; match its placement and scale naturally. Photorealistic. Do not add any text, captions, letters or logos. " +
    (extra ? `Context: ${extra}` : "");
  return generateImage(
    [
      { inline_data: { mime_type: ref.mime || "image/jpeg", data: ref.b64 } },
      { inline_data: { mime_type: product.mime || "image/png", data: product.b64 } },
      { text: instruction },
    ],
    22000,
  );
}

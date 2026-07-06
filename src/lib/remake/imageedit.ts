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

// 레퍼런스 프레임(ref)에서 제품만 product로 교체한 이미지를 반환. 실패 시 null(상위에서 폴백).
export async function editProductSwap(ref: Img, product: Img, extra = ""): Promise<Img | null> {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return null;
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const instruction =
    "Image 1 is a real frame from a reference video. Image 2 is MY product. " +
    "Edit Image 1 so that the beauty product shown is replaced with MY product from Image 2. " +
    "Keep EVERYTHING else identical — same composition, camera angle, framing, hands/person, background, lighting, color grade and mood. " +
    "Only swap the product; match its placement and scale naturally. Photorealistic. Do not add any text, captions, letters or logos. " +
    (extra ? `Context: ${extra}` : "");
  try {
    const res = await fetchT(
      `${BASE}/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { inline_data: { mime_type: ref.mime || "image/jpeg", data: ref.b64 } },
                { inline_data: { mime_type: product.mime || "image/png", data: product.b64 } },
                { text: instruction },
              ],
            },
          ],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      },
      35000,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { inline_data?: { data?: string; mime_type?: string }; inlineData?: { data?: string; mimeType?: string } }[] } }[];
    };
    const parts = json?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      const d = p.inline_data?.data || p.inlineData?.data;
      const m = p.inline_data?.mime_type || p.inlineData?.mimeType;
      if (d) return { b64: d, mime: m || "image/png" };
    }
    return null;
  } catch {
    return null;
  }
}

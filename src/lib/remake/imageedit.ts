// Remake Studio — 이미지 편집(제품 스왑). 서버 전용.
// 레퍼런스 프레임에서 "제품만" 내 제품으로 교체(구도·조명·나머지는 그대로) → 가장 긴밀한 재현.
// Gemini 이미지 모델(Nano Banana, gemini-2.5-flash-image 등) generateContent 사용.
import type { ShotPlan } from "./spec";

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

// Nano Banana(generateContent, IMAGE 출력) 공통 호출. 실패 사유(error)까지 함께 반환.
async function generateImage(parts: unknown[], ms: number): Promise<{ img: Img | null; error?: string }> {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return { img: null, error: "GEMINI_API_KEY 미설정" };
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
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { img: null, error: `이미지모델 ${res.status} (${model}): ${t.slice(0, 200)}` };
    }
    const json = (await res.json()) as {
      candidates?: { finishReason?: string; content?: { parts?: { inline_data?: { data?: string; mime_type?: string }; inlineData?: { data?: string; mimeType?: string }; text?: string }[] } }[];
      promptFeedback?: unknown;
    };
    const out = json?.candidates?.[0]?.content?.parts || [];
    for (const p of out) {
      const d = p.inline_data?.data || p.inlineData?.data;
      const m = p.inline_data?.mime_type || p.inlineData?.mimeType;
      if (d) return { img: { b64: d, mime: m || "image/png" } };
    }
    // 이미지가 응답에 없음(세이프티 차단/텍스트만 반환 등)
    const fr = json?.candidates?.[0]?.finishReason;
    const txt = out.map((p) => p.text).filter(Boolean).join(" ").slice(0, 160);
    return { img: null, error: `이미지 없음${fr ? ` (${fr})` : ""}${txt ? `: ${txt}` : json?.promptFeedback ? `: ${JSON.stringify(json.promptFeedback).slice(0, 160)}` : ""}` };
  } catch (e) {
    return { img: null, error: /abort/i.test(String(e)) ? "이미지 생성 타임아웃" : String(e).slice(0, 160) };
  }
}

export interface ComposeOpts {
  hero?: Img;        // 앞선 컷의 '히어로 스틸' — 같은 인물·의상·배경 유지(컷 간 일관성)
  talent?: string;   // 새 인물 묘사(일관성 앵커)
  setting?: string;  // 새 환경 묘사(일관성 앵커)
}

// 맥락 기반 재창조: 내 제품을 '새로운 장면(새 인물·배경·스타일)'에 자연스럽게 합성한 고품질 스틸 생성.
// hero가 주어지면 그 인물·의상·배경을 이어받아 '같은 사람의 다른 컷'을 만든다(내러티브 일관성).
// 레퍼런스 원본은 복제하지 않고, 분석에서 나온 sceneImagePrompt(맥락)만 반영. 실패 시 null.
export async function composeScene(product: Img, scenePrompt: string, opts: ComposeOpts = {}): Promise<Img | null> {
  const parts: unknown[] = [
    { inline_data: { mime_type: product.mime || "image/png", data: product.b64 } },
  ];
  let identityNote = "";
  if (opts.hero) {
    parts.push({ inline_data: { mime_type: opts.hero.mime || "image/jpeg", data: opts.hero.b64 } });
    identityNote =
      "The SECOND image is the SAME person from the previous shot of this ad. Keep that exact person — same face, hair, makeup, wardrobe and the same environment/color grade — for visual continuity across the ad. Only change the pose, action and framing to fit this new beat. ";
  }
  const consistency = [
    !opts.hero && opts.talent ? `Talent (new person, keep consistent through the ad): ${opts.talent}.` : "",
    !opts.hero && opts.setting ? `Setting: ${opts.setting}.` : "",
  ].filter(Boolean).join(" ");
  const instruction =
    "Create a brand-new, photorealistic, high-end vertical 9:16 short-form (TikTok/UGC) advertising still. " +
    "The FIRST image is MY product — feature it naturally and keep its real label, wording, shape, proportions and color EXACTLY faithful; do not distort, relabel, or restyle the product. " +
    identityNote +
    (opts.hero ? "" : "Use a completely NEW person and NEW environment (do not copy any specific real celebrity or brand). ") +
    (consistency ? consistency + " " : "") +
    "Cinematic natural soft lighting, shallow depth of field, crisp focus, realistic skin texture and pores, authentic candid UGC feel — professional but believable, not plastic or over-retouched. " +
    `Scene to create: ${scenePrompt}. ` +
    "Absolutely NO on-screen text, captions, letters, numbers, hashtags, logos or UI overlays.";
  parts.push({ text: instruction });
  return (await generateImage(parts, 26000)).img;
}

// ③ KeyframeRenderer 코어 — ShotPlan 하나를 키프레임 스틸로 렌더(제품 합성 + 리얼리즘 패스).
// opts.hero: 앞선 컷의 '히어로 스틸' — 같은 인물·의상·톤 + 같은 제품 렌더를 이어받아 컷 간 일관성 유지.
export async function composeKeyframe(product: Img, plan: ShotPlan, opts: { hero?: Img } = {}): Promise<{ img: Img | null; error?: string }> {
  // 이미지 순서를 고정하고 각 이미지의 역할을 텍스트로 명시(모델 혼동 방지).
  const imgs: { img: Img; role: "product" | "hero" }[] = [];
  if (plan.needs_product && product?.b64) imgs.push({ img: product, role: "product" });
  if (opts.hero?.b64) imgs.push({ img: opts.hero, role: "hero" });
  const parts: unknown[] = imgs.map((x) => ({ inline_data: { mime_type: x.img.mime || "image/png", data: x.img.b64 } }));
  const ord = ["FIRST", "SECOND", "THIRD"];
  const legend = imgs
    .map((x, i) =>
      x.role === "product"
        ? `The ${ord[i] || `#${i + 1}`} image is MY product. Keep its label, wording, shape, proportions and color EXACTLY identical to that image in every shot — composite it faithfully; do NOT redraw, relabel, restyle, recolor or resize the product.`
        : `The ${ord[i] || `#${i + 1}`} image is the HERO still from an earlier cut of THIS SAME ad. Keep the SAME person — identical face, hairstyle, makeup, skin tone and wardrobe — and the same lighting/color grade for continuity; change ONLY pose, action and framing to fit this beat.`,
    )
    .join(" ");
  const text = [
    plan.image_prompt,
    plan.product_placement,
    legend,
    `Avoid: ${plan.negative_prompt}.`,
  ].filter(Boolean).join(" ");
  parts.push({ text });
  return generateImage(parts, 26000);
}

// 복제 모드 키프레임 — 실제 레퍼런스 프레임을 최대한 그대로 두고 '제품만' 내 제품으로 교체.
// stage 1('제품만 교체(최대 유사)')의 코어. opts.hero: 앞 컷에 내 제품이 렌더된 모습 — 샷 간 제품 외형 통일.
export async function replicaKeyframe(product: Img, ref: Img, plan: ShotPlan, opts: { hero?: Img } = {}): Promise<{ img: Img | null; error?: string }> {
  const parts: unknown[] = [
    { inline_data: { mime_type: ref.mime || "image/jpeg", data: ref.b64 } },
    { inline_data: { mime_type: product.mime || "image/png", data: product.b64 } },
  ];
  if (opts.hero?.b64) parts.push({ inline_data: { mime_type: opts.hero.mime || "image/png", data: opts.hero.b64 } });
  const instruction = [
    `Image 1 is a real frame from a reference short-form (TikTok/UGC) ad. Image 2 is MY product${opts.hero ? ". Image 3 shows how MY product was rendered in a previous cut of THIS SAME ad" : ""}.`,
    plan.needs_product
      ? "Edit Image 1 so the beauty product shown is replaced with MY product from Image 2."
      : "If any beauty product appears in Image 1, replace it with MY product from Image 2; otherwise keep the frame as-is.",
    "Keep EVERYTHING else IDENTICAL — same composition, camera angle, framing, person, pose, hands, background, lighting, color grade and mood. Only the product changes.",
    "MY product must be the SAME physical object in every shot: keep its label, wording, typography, shape, proportions and color EXACTLY as in image 2 — treat it as ground truth, do NOT redraw, reinterpret, relabel, recolor or restyle it.",
    opts.hero ? "Match MY product's exact appearance (label layout, finish, color) to how it looks in image 3 so it is visually identical across all cuts." : "",
    plan.product_placement,
    "Match the product's placement, scale, shadows and reflections to the scene naturally. Photorealistic. Do NOT add or alter any on-screen text, captions, letters, numbers, hashtags or logos.",
    `Avoid: ${plan.negative_prompt}.`,
  ].filter(Boolean).join(" ");
  parts.push({ text: instruction });
  return generateImage(parts, 26000);
}

// (레거시) 레퍼런스 프레임에서 제품만 교체 — 프레임-복제 모드에서 사용. 유지하되 기본 경로는 composeScene.
export async function editProductSwap(ref: Img, product: Img, extra = ""): Promise<Img | null> {
  const instruction =
    "Image 1 is a real frame from a reference video. Image 2 is MY product. " +
    "Edit Image 1 so that the beauty product shown is replaced with MY product from Image 2. " +
    "Keep EVERYTHING else identical — same composition, camera angle, framing, hands/person, background, lighting, color grade and mood. " +
    "Only swap the product; match its placement and scale naturally. Photorealistic. Do not add any text, captions, letters or logos. " +
    (extra ? `Context: ${extra}` : "");
  return (await generateImage(
    [
      { inline_data: { mime_type: ref.mime || "image/jpeg", data: ref.b64 } },
      { inline_data: { mime_type: product.mime || "image/png", data: product.b64 } },
      { text: instruction },
    ],
    22000,
  )).img;
}

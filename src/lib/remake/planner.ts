// ② KeyframePlanner — ReferenceSpec + LayerControl → ShotPlan[].
// 규칙 기반(LLM 불필요). 1차: style·composition 최대 유지, product만 우리 것.
// 2차: LayerControl.style.vary=true면 style만 프리셋으로 치환(sales_beat/shot_type/camera는 유지).
import type { ReferenceSpec, LayerControl, ShotPlan, Shot, StyleLayer } from "./spec";
import { STYLE_PRESETS } from "./spec";

const DEFAULT_NEGATIVE =
  "plastic skin, waxy, over-smoothed, extra fingers, deformed hands, warped or unreadable logo/text, " +
  "duplicate product, watermark, on-screen captions or letters, real celebrity likeness, lens dirt";

// 2차 변형이면 style을 프리셋으로 치환, 아니면 원본 style 유지.
function effectiveStyle(spec: ReferenceSpec, control: LayerControl): StyleLayer {
  if (control.style.vary && control.style.preset && STYLE_PRESETS[control.style.preset]) {
    const p = STYLE_PRESETS[control.style.preset];
    return { ...spec.style, avatar: p.avatar, setting: p.setting, lighting: p.lighting, color_grade: p.color_grade };
  }
  return spec.style;
}

function buildImagePrompt(shot: Shot, style: StyleLayer, hasProduct: boolean): string {
  const framing = `${shot.shot_type} shot, ${shot.camera} camera, vertical 9:16`;
  const person = `${style.avatar.age_range} ${style.avatar.gender}, ${style.avatar.vibe}`;
  const scene = `${style.setting}, ${style.lighting}, ${style.color_grade} color grade`;
  return [
    `Photorealistic UGC still. ${framing}.`,
    `Composition: ${shot.composition}.`,
    shot.action ? `Moment: ${shot.action}.` : "",
    `On-screen talent: a NEW ${person} (not any specific real person).`,
    `Scene: ${scene}.`,
    hasProduct ? "Feature MY product from the reference image naturally; keep its real label, shape and color faithful." : "",
    "Cinematic natural lighting, shallow depth of field, realistic skin texture with pores and fine detail — believable, not plastic.",
    "NO on-screen text, captions, letters, numbers, hashtags, logos or UI overlays.",
  ].filter(Boolean).join(" ");
}

export function planKeyframes(spec: ReferenceSpec, control: LayerControl, productAssetKey = "product_hero"): ShotPlan[] {
  const style = effectiveStyle(spec, control);
  const slotsByShot = new Map<number, string[]>(); // shot_no → product roles
  for (const s of spec.product_slots || []) {
    const arr = slotsByShot.get(s.shot_no) || [];
    arr.push(s.role);
    slotsByShot.set(s.shot_no, arr);
  }
  return (spec.shots || []).map((shot) => {
    const roles = slotsByShot.get(shot.shot_no) || [];
    const hasProduct = roles.length > 0;
    return {
      shot_no: shot.shot_no,
      sales_beat: shot.sales_beat,        // 불변
      shot_type: shot.shot_type,          // 불변
      camera: shot.camera,                // 불변
      base_composition: shot.composition,
      image_prompt: buildImagePrompt(shot, style, hasProduct),
      product_asset: productAssetKey,
      product_placement: hasProduct
        ? `Place my product for: ${roles.join(", ")}. Match ${style.lighting} lighting, shadows and reflections to the scene; natural scale and placement.`
        : "",
      needs_product: hasProduct,
      negative_prompt: DEFAULT_NEGATIVE,
    };
  });
}

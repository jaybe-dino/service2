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

// M5 — 성과 피드백: roas/engagement가 높은 레퍼런스일수록 프로덕션·전환 요소를 강하게 지시(가중치).
function perfEmphasis(spec: ReferenceSpec): string {
  const roas = Number(spec.performance?.roas) || 0;
  const eng = Number(spec.performance?.engagement) || 0;
  if (roas >= 3 || eng >= 0.08) {
    return "This reference is a proven top performer — maximize production value and conversion cues: crisp hero-lit product, flattering realistic skin, premium high-conversion polish.";
  }
  if (roas >= 1.8 || eng >= 0.04) return "Solid performer — clean, high-quality UGC with clear product focus.";
  return "Authentic, natural UGC production value.";
}

// 이 샷이 '결정적 순간(proof)'인지 — sales_beat과 proof_moment의 키워드 겹침으로 판단.
function isProofShot(shot: Shot, spec: ReferenceSpec): boolean {
  const proof = (spec.sales?.proof_moment || "").toLowerCase();
  const beat = (shot.sales_beat || "").toLowerCase();
  if (!proof || !beat) return false;
  const toks = proof.split(/[\s,·/]+/).filter((t) => t.length >= 2);
  return toks.some((t) => beat.includes(t)) || /result|proof|결과|before|after|클로즈업|리빌/.test(beat);
}

function buildImagePrompt(shot: Shot, style: StyleLayer, hasProduct: boolean, emphasis: string, proof: boolean): string {
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
    proof ? "This is the PROOF beat — make the result/benefit visibly convincing and trust-building (clean close-up, believable improvement)." : "",
    emphasis,
    "Cinematic natural lighting, shallow depth of field, realistic skin texture with pores and fine detail — believable, not plastic.",
    "NO on-screen text, captions, letters, numbers, hashtags, logos or UI overlays.",
  ].filter(Boolean).join(" ");
}

export function planKeyframes(spec: ReferenceSpec, control: LayerControl, productAssetKey = "product_hero"): ShotPlan[] {
  const style = effectiveStyle(spec, control);
  const emphasis = perfEmphasis(spec);
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
      image_prompt: buildImagePrompt(shot, style, hasProduct, emphasis, isProofShot(shot, spec)),
      product_asset: productAssetKey,
      product_placement: hasProduct
        ? `Place my product for: ${roles.join(", ")}. Match ${style.lighting} lighting, shadows and reflections to the scene; natural scale and placement.`
        : "",
      needs_product: hasProduct,
      negative_prompt: DEFAULT_NEGATIVE,
    };
  });
}

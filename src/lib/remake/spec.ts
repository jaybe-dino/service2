// Remake Studio v1 — 중심 데이터 계약: ReferenceSpec (4-Layer Schema).
// 개발 명령서 §1 준수. Decomposer가 생산하고 이후 모든 모듈(Planner/Renderer/Animator/Assembler)이 소비.
// sales 층과 shots[].sales_beat 은 어떤 변형(1차·2차)에서도 변경 금지.

export type AspectRatio = "9:16" | "1:1" | "16:9";
export type ShotType = "wide" | "medium" | "close-up" | "ecu" | "establishing";
export type CameraMove = "static" | "pan" | "dolly" | "handheld" | "push-in";

// ── Layer 1: SALES (왜 팔리는가 — 절대 소실 금지) ──
export interface SalesLayer {
  hook_mechanism: string;   // 훅의 '작동 원리'
  hook_line: string;        // 실제 카피(참고용, 그대로 재사용 금지)
  sales_arc: string[];      // 구매까지 끌고 가는 설득 단계(순서)
  proof_moment: string;     // 전환을 만드는 결정적 순간
  cta_type: string;
  why_it_works: string;
}

// ── Layer 2: STRUCTURE (샷 순서·타이밍) ──
export interface Shot {
  shot_no: number;
  t_start: number;
  t_end: number;
  shot_type: ShotType;
  camera: CameraMove;
  composition: string;
  sales_beat: string;       // ← Layer1의 sales_arc 단계와 매핑
  on_screen_text: string;
  action: string;
}

// ── Layer 3: STYLE (교체 가능) ──
export interface StyleLayer {
  avatar: { gender: string; age_range: string; vibe: string };
  setting: string;
  lighting: string;
  color_grade: string;
  pacing: string;
  bgm_mood: string;
}

// ── Layer 4: PRODUCT (우리 제품 주입 지점) ──
export interface ProductSlot {
  shot_no: number;
  role: string;
  needs_asset: string;      // 예: "product_hero"
}

export interface ReferenceSpec {
  ref_id: string;
  duration_sec: number;
  aspect_ratio: AspectRatio;
  sales: SalesLayer;
  shots: Shot[];
  style: StyleLayer;
  product_slots: ProductSlot[];
  performance?: { views?: number; engagement?: number; roas?: number };
}

// ── LayerControl (1차/2차 스위치) ──
export interface LayerControl {
  sales: { lock: boolean };
  structure: { lock: boolean };
  style: { vary: boolean; preset?: string };
  product: { vary: boolean };
}

// 1차: 제품 교체(최대 유사도) — style 고정, product만 교체
export const LAYER_CONTROL_STAGE1: LayerControl = {
  sales: { lock: true }, structure: { lock: true }, style: { vary: false }, product: { vary: true },
};
// 2차: 아바타·배경·스타일 변형(세일즈·구조 유지)
export function layerControlStage2(preset: string): LayerControl {
  return { sales: { lock: true }, structure: { lock: true }, style: { vary: true, preset }, product: { vary: true } };
}

// ── ② KeyframePlanner 산출물: 샷별 이미지 생성 지시 ──
export interface ShotPlan {
  shot_no: number;
  sales_beat: string;         // 세일즈 매핑 유지(불변)
  shot_type: ShotType;
  camera: CameraMove;
  base_composition: string;   // 구도(원본 구조 전이 — depth/pose만, 얼굴·배경 신규)
  image_prompt: string;       // style+composition 조합(렌더러가 그대로 사용)
  product_asset: string;      // 합성할 우리 제품 자산 키
  product_placement: string;  // 배치·조명 매칭 지시(제품 슬롯 있는 샷만)
  needs_product: boolean;
  negative_prompt: string;
}

// 2차 변형용 스타일 프리셋(캐릭터 라이브러리) — sales_beat/shot_type/camera는 건드리지 않고 style만 치환.
export interface StylePreset { label: string; avatar: StyleLayer["avatar"]; setting: string; lighting: string; color_grade: string }
export const STYLE_PRESETS: Record<string, StylePreset> = {
  "avatar_B/clean_studio": {
    label: "클린 스튜디오 · 20대 전문가",
    avatar: { gender: "female", age_range: "20s", vibe: "차분한 전문가형" },
    setting: "미니멀 화이트 스튜디오",
    lighting: "clean softbox, even",
    color_grade: "neutral, crisp",
  },
  "avatar_C/cozy_home": {
    label: "코지 홈 · 30대 데일리",
    avatar: { gender: "female", age_range: "30s", vibe: "편안한 데일리 후기형" },
    setting: "따뜻한 우드톤 홈, 자연광",
    lighting: "warm window light",
    color_grade: "warm, soft",
  },
  "avatar_M/outdoor_cafe": {
    label: "야외 카페 · 20대 남성 캐주얼",
    avatar: { gender: "male", age_range: "20s", vibe: "트렌디 캐주얼" },
    setting: "밝은 야외 카페 테라스",
    lighting: "bright daylight, airy",
    color_grade: "vivid, fresh",
  },
  "avatar_D/glam_vanity": {
    label: "글램 화장대 · 20대 뷰티",
    avatar: { gender: "female", age_range: "late-20s", vibe: "화려한 뷰티 인플루언서" },
    setting: "핑크톤 화장대, 링라이트",
    lighting: "ring light, glossy",
    color_grade: "punchy, saturated",
  },
  "avatar_E/gymwear_bright": {
    label: "액티브 · 20대 애슬레저",
    avatar: { gender: "female", age_range: "20s", vibe: "건강한 애슬레저" },
    setting: "밝은 홈짐/스튜디오",
    lighting: "high-key daylight",
    color_grade: "clean, energetic",
  },
  "avatar_F/mature_luxe": {
    label: "럭스 · 40대 성숙",
    avatar: { gender: "female", age_range: "40s", vibe: "세련된 성숙미" },
    setting: "고급스러운 호텔 파우더룸",
    lighting: "soft warm spotlights",
    color_grade: "rich, cinematic",
  },
};

// UI 드롭다운/멀티선택용 목록
export const STYLE_PRESET_LIST: { id: string; label: string }[] =
  Object.entries(STYLE_PRESETS).map(([id, p]) => ({ id, label: p.label }));

const SHOT_TYPES = new Set<ShotType>(["wide", "medium", "close-up", "ecu", "establishing"]);
const CAMERA_MOVES = new Set<CameraMove>(["static", "pan", "dolly", "handheld", "push-in"]);

// ReferenceSpec 검증 — sales 층이 비면 실패로 간주(§1 규칙). 문제 목록 반환(빈 배열=통과).
export function validateReferenceSpec(x: unknown): { ok: boolean; errors: string[]; spec?: ReferenceSpec } {
  const errors: string[] = [];
  const o = (x || {}) as Record<string, unknown>;
  const sales = (o.sales || {}) as Partial<SalesLayer>;
  const shots = Array.isArray(o.shots) ? (o.shots as Shot[]) : [];

  if (!sales || typeof sales !== "object") errors.push("sales 누락");
  if (!sales?.hook_mechanism) errors.push("sales.hook_mechanism 비어 있음");
  if (!Array.isArray(sales?.sales_arc) || sales!.sales_arc.length === 0) errors.push("sales.sales_arc 비어 있음");
  if (!sales?.proof_moment) errors.push("sales.proof_moment 비어 있음");
  if (!shots.length) errors.push("shots 비어 있음");

  shots.forEach((s, i) => {
    if (typeof s.shot_no !== "number") errors.push(`shots[${i}].shot_no 누락`);
    if (!s.sales_beat) errors.push(`shots[${i}].sales_beat 누락(세일즈 매핑 필수)`);
    if (s.shot_type && !SHOT_TYPES.has(s.shot_type)) errors.push(`shots[${i}].shot_type 값 오류: ${s.shot_type}`);
    if (s.camera && !CAMERA_MOVES.has(s.camera)) errors.push(`shots[${i}].camera 값 오류: ${s.camera}`);
  });

  return { ok: errors.length === 0, errors, spec: errors.length === 0 ? (o as unknown as ReferenceSpec) : undefined };
}

// 관대한 정규화 — 모델이 근사값을 줄 때 스키마 enum/타입에 맞춰 보정(검증 전 1차 클린업).
export function coerceSpec(x: unknown, refId: string): ReferenceSpec {
  const o = (x || {}) as Record<string, unknown>;
  const shots = (Array.isArray(o.shots) ? o.shots : []) as Record<string, unknown>[];
  const nearestShotType = (v: unknown): ShotType => {
    const s = String(v || "").toLowerCase().replace(/[\s_-]/g, "");
    if (s.includes("extreme") || s === "ecu") return "ecu";
    if (s.includes("close")) return "close-up";
    if (s.includes("wide")) return "wide";
    if (s.includes("establish")) return "establishing";
    return "medium";
  };
  const nearestCam = (v: unknown): CameraMove => {
    const s = String(v || "").toLowerCase();
    if (s.includes("push") || s.includes("zoom")) return "push-in";
    if (s.includes("pan") || s.includes("tilt")) return "pan";
    if (s.includes("dolly") || s.includes("track")) return "dolly";
    if (s.includes("hand")) return "handheld";
    return "static";
  };
  return {
    ref_id: String(o.ref_id || refId),
    duration_sec: Number(o.duration_sec) || 0,
    aspect_ratio: (["9:16", "1:1", "16:9"].includes(String(o.aspect_ratio)) ? o.aspect_ratio : "9:16") as AspectRatio,
    sales: (o.sales || {}) as SalesLayer,
    shots: shots.map((s, i) => ({
      shot_no: Number(s.shot_no) || i + 1,
      t_start: Number(s.t_start) || 0,
      t_end: Number(s.t_end) || 0,
      shot_type: nearestShotType(s.shot_type),
      camera: nearestCam(s.camera),
      composition: String(s.composition || ""),
      sales_beat: String(s.sales_beat || ""),
      on_screen_text: String(s.on_screen_text || ""),
      action: String(s.action || ""),
    })),
    style: (o.style || {}) as StyleLayer,
    product_slots: (Array.isArray(o.product_slots) ? o.product_slots : []) as ProductSlot[],
    performance: (o.performance || {}) as ReferenceSpec["performance"],
  };
}

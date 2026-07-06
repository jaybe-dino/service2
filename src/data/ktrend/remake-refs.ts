// Remake Studio — 실제 수집 콘텐츠(레퍼런스) → 리메이크 템플릿 + "아주 구체적인 프롬프트화".
// 원본 영상은 저장하지 않고, 공개 성과 신호(카테고리·조회수·참여율·Shop 여부)로
// 훅 구조를 추론해 상세 생성 브리프를 만든다(저작권 안전).
import type { Content } from "./content";
import { BRAND_MAP } from "./brands";
import { CATEGORY_MAP } from "./meta";
import type { RemakeTemplate, RemakeScene } from "./remake-templates";

export type HookArchetype =
  | "reveal" | "before-after" | "routine" | "unboxing" | "asmr" | "listicle" | "problem-solution";

interface ArchetypeSpec {
  hookType: HookArchetype;
  labelKo: string;
  hookCopy: string;
  tone: string;
  sound: string;
  scenes: RemakeScene[];
  why: string;
}

// 카테고리별 훅 카피 보정
const HOOK_COPY: Record<string, Partial<Record<HookArchetype, string>>> = {
  skincare: {
    reveal: "3일째 피부 뭐 썼냐는 질문 받는 중",
    "before-after": "왼쪽 볼만 발랐어요",
    routine: "자기 전 딱 3개만",
    "problem-solution": "속당김·각질, 이거 하나로 끝",
  },
  makeup: {
    "before-after": "반얼굴만 발라봤습니다",
    listicle: "인생템 컬러 찾아드림",
    reveal: "이거 바르고 화장 왜 했냐는 소리",
  },
  haircare: {
    reveal: "손상모 맞아? 라는 소리 들음",
    "problem-solution": "정전기·푸석함 3초 컷",
    routine: "샤워 후 딱 이 순서",
  },
};

const BASE_SCENES: Record<HookArchetype, RemakeScene[]> = {
  reveal: [
    { role: "hook", sec: 2, camera: "ECU 핸드헬드 셀피", productSlot: "hero" },
    { role: "apply", sec: 5, camera: "MCU 발림 클로즈업", productSlot: "in-use" },
    { role: "result", sec: 4, camera: "CU 결과 텍스처", productSlot: "none" },
    { role: "cta", sec: 3, camera: "제품 테이블탑", productSlot: "hero" },
  ],
  "before-after": [
    { role: "hook", sec: 2, camera: "정면 하프페이스", productSlot: "none" },
    { role: "apply", sec: 4, camera: "도포 클로즈업", productSlot: "in-use" },
    { role: "result", sec: 5, camera: "정면 풀 리빌 (비트드롭)", productSlot: "none" },
    { role: "cta", sec: 2, camera: "제품 스윙", productSlot: "hero" },
  ],
  routine: [
    { role: "hook", sec: 2, camera: "무드 셀피", productSlot: "hero" },
    { role: "detail", sec: 4, camera: "스텝1 발림", productSlot: "in-use" },
    { role: "detail", sec: 4, camera: "스텝2 발림", productSlot: "in-use" },
    { role: "cta", sec: 3, camera: "제품 나열 히어로", productSlot: "hero" },
  ],
  unboxing: [
    { role: "hook", sec: 2, camera: "택배 오픈 탑뷰", productSlot: "hero" },
    { role: "detail", sec: 4, camera: "패키지 클로즈업", productSlot: "hero" },
    { role: "apply", sec: 4, camera: "텍스처 스와치", productSlot: "in-use" },
    { role: "cta", sec: 3, camera: "제품 히어로샷", productSlot: "hero" },
  ],
  asmr: [
    { role: "hook", sec: 2, camera: "제품 탭 ASMR 탑뷰", productSlot: "hero" },
    { role: "apply", sec: 5, camera: "도포 사운드 클로즈업", productSlot: "in-use" },
    { role: "detail", sec: 4, camera: "텍스처 스와치 슬로우", productSlot: "in-use" },
    { role: "cta", sec: 2, camera: "제품 히어로샷", productSlot: "hero" },
  ],
  listicle: [
    { role: "hook", sec: 2, camera: "제품 여러 종 나열", productSlot: "hero" },
    { role: "detail", sec: 5, camera: "손등 스와치 패스트컷", productSlot: "in-use" },
    { role: "apply", sec: 4, camera: "발색·발림 클로즈업", productSlot: "in-use" },
    { role: "cta", sec: 2, camera: "베스트 픽 핀", productSlot: "hero" },
  ],
  "problem-solution": [
    { role: "hook", sec: 2, camera: "고민 상황 셀피", productSlot: "none" },
    { role: "apply", sec: 4, camera: "해결 제품 도포", productSlot: "in-use" },
    { role: "result", sec: 4, camera: "개선 결과 클로즈업", productSlot: "none" },
    { role: "cta", sec: 3, camera: "제품 히어로샷", productSlot: "hero" },
  ],
};

const TONE_BY: Record<HookArchetype, string> = {
  reveal: "UGC-셀피 · 따뜻한 자연광",
  "before-after": "스튜디오 · 하이키",
  routine: "UGC-셀피 · 무드 조명",
  unboxing: "ASMR · 스튜디오",
  asmr: "ASMR · 소프트 조명",
  listicle: "스튜디오 · 하이키 패스트컷",
  "problem-solution": "UGC-셀피 · 리얼톤",
};
const SOUND_BY: Record<HookArchetype, string> = {
  reveal: "asmr-tap + trending-lofi",
  "before-after": "beat-drop transition",
  routine: "calm-lofi + water-drop",
  unboxing: "asmr-unwrap + tap",
  asmr: "asmr-layered + whisper",
  listicle: "fast-cut trending",
  "problem-solution": "trending-voiceover + swish",
};
const WHY_BY: Record<HookArchetype, string> = {
  reveal: "궁금증 훅 + 발림 ASMR로 이탈률↓, 결과 클로즈업이 신뢰를 만든다.",
  "before-after": "즉각적 대비가 결과를 시각화 — 전환에서 저장·공유를 유발.",
  routine: "낮은 진입장벽 + 루틴 포맷이 저장률↑, 번들 구매로 연결.",
  unboxing: "신제품·품절템 소구에 강함 — 텍스처 스와치가 구매 확신을 준다.",
  asmr: "감각적 사운드가 체류시간↑ — 반복 시청·저장을 이끈다.",
  listicle: "'내 것 찾기' 욕구 자극 — 댓글·저장 전환이 높다.",
  "problem-solution": "명확한 고민→해결 서사가 공감·구매의도를 끌어올린다.",
};

// 공개 성과 신호로 훅 아키타입 추론. video id로 시드해 다양성 확보.
export function inferArchetype(c: Content): HookArchetype {
  const seed = hashSeed(c.id);
  const eng = c.engagementRate;
  const pool: HookArchetype[] =
    c.category === "makeup"
      ? ["before-after", "listicle", "reveal"]
      : c.category === "haircare"
      ? ["reveal", "problem-solution", "routine"]
      : eng >= 8
      ? ["reveal", "asmr", "before-after"]
      : c.isShop
      ? ["problem-solution", "routine", "unboxing"]
      : ["routine", "reveal", "unboxing"];
  return pool[seed % pool.length];
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}

function specFor(c: Content): ArchetypeSpec {
  const a = inferArchetype(c);
  const copy = HOOK_COPY[c.category]?.[a] || "이거 진짜 물건이에요";
  return {
    hookType: a,
    labelKo: LABEL_KO[a],
    hookCopy: copy,
    tone: TONE_BY[a],
    sound: SOUND_BY[a],
    scenes: BASE_SCENES[a],
    why: WHY_BY[a],
  };
}

export const LABEL_KO: Record<HookArchetype, string> = {
  reveal: "리빌",
  "before-after": "비포애프터",
  routine: "루틴",
  unboxing: "언박싱",
  asmr: "ASMR",
  listicle: "리스티클",
  "problem-solution": "문제-해결",
};

// 수집 콘텐츠 → 리메이크 템플릿(위저드가 그대로 소비).
export function refToTemplate(c: Content): RemakeTemplate {
  const spec = specFor(c);
  const brand = BRAND_MAP[c.brandId];
  const catKo = CATEGORY_MAP[c.category]?.nameKo || c.category;
  const eng = c.engagementRate.toFixed(1) + "%";
  const hue = c.hue % 360;
  return {
    id: `ref-${c.id}`,
    name: `${brand?.name || c.influencerId} · ${spec.labelKo}`,
    category: c.category,
    categoryKo: catKo,
    hookType: spec.hookType,
    hookCopy: spec.hookCopy,
    tone: spec.tone,
    sound: spec.sound,
    scenes: spec.scenes,
    perf: { views: compact(c.views), engagement: eng, roas: c.estRoasX ? c.estRoasX.toFixed(1) : undefined },
    why: `${spec.why} (레퍼런스 실측: 조회 ${compact(c.views)} · 참여 ${eng})`,
    grad: `linear-gradient(135deg,hsl(${hue},85%,72%),hsl(${(hue + 40) % 360},80%,64%))`,
  };
}

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

// ── "아주 구체적인 프롬프트화" ─────────────────────────────────────────────
export interface PromptScene { time: string; roleKo: string; shot: string; action: string }
export interface RemakePromptPackage {
  headline: string;
  scenes: PromptScene[];
  fullPrompt: string; // 생성 모델에 전달되는 전체 프롬프트
  negative: string;
}

export interface PromptProduct { pname?: string; benefit?: string; concern?: string }
export interface PromptOptions { lang?: string; length?: number; aiPerson?: boolean; brandColor?: string }

const ROLE_KO: Record<string, string> = { hook: "훅", apply: "발림", result: "결과", cta: "CTA", detail: "디테일" };

// 템플릿(큐레이션/레퍼런스 공용) + 제품 + 옵션 → 매우 상세한 생성 브리프.
export function buildRemakePrompt(t: RemakeTemplate, product: PromptProduct = {}, opts: PromptOptions = {}): RemakePromptPackage {
  const length = opts.length ?? 30;
  const lang = opts.lang ?? "영어(US)";
  const person = opts.aiPerson ?? true;
  const color = opts.brandColor ?? "#FF5C8D";
  const pname = product.pname?.trim() || "제품";
  const benefit = product.benefit?.trim();
  const concern = product.concern?.trim();

  // 시간 라인 구성
  let acc = 0;
  const total = t.scenes.reduce((s, x) => s + x.sec, 0) || 1;
  const scale = length / total; // 요청 길이에 맞춰 씬 시간 스케일
  const scenes: PromptScene[] = t.scenes.map((s) => {
    const start = Math.round(acc * scale);
    acc += s.sec;
    const end = Math.round(acc * scale);
    const action =
      s.role === "hook"
        ? `첫 프레임부터 시선 고정: "${t.hookCopy}" 자막/음성 훅, ${person ? "AI 진행자 셀피" : "제품 단독"}`
        : s.role === "apply"
        ? `${pname} ${s.productSlot === "in-use" ? "실사용 발림" : "노출"}${benefit ? `, ${benefit} 강조` : ""}`
        : s.role === "result"
        ? `개선 결과 클로즈업${concern ? ` (${concern} 해소)` : ""}, 만족 리액션`
        : s.role === "detail"
        ? `핵심 디테일/포인트 컷, 텍스트 오버레이`
        : `구매 유도 CTA + ${pname} 히어로샷, ${lang} 자막`;
    return { time: `${start}-${end}s`, roleKo: ROLE_KO[s.role] || s.role, shot: s.camera, action };
  });

  const shotList = scenes.map((s, i) => `  ${i + 1}. [${s.time}] ${s.roleKo} — ${s.shot} · ${s.action}`).join("\n");

  const fullPrompt = [
    `[SHORT-FORM PRODUCT VIDEO BRIEF]`,
    `Format: TikTok vertical 9:16, ${length}s, ${lang} on-screen captions`,
    `Category: ${t.categoryKo} · Hook archetype: ${t.hookType}`,
    `Reference performance: ${t.perf.views} views · ${t.perf.engagement} engagement${t.perf.roas ? ` · est. ROAS ${t.perf.roas}` : ""}`,
    ``,
    `HOOK LINE (0-2s): "${t.hookCopy}"`,
    ``,
    `SHOT LIST:`,
    shotList,
    ``,
    `PRODUCT: ${pname}${benefit ? ` — 핵심 효능 ${benefit}` : ""}${concern ? `, 타깃 고민 ${concern}` : ""}.`,
    `모든 컷에서 제품 정체성(라벨·컬러·형태) 일관 유지 — 업로드 제품 이미지를 레퍼런스로 컨디셔닝.`,
    `VISUAL TONE: ${t.tone}. 브랜드 강조색 ${color} 를 자막/CTA 포인트로 사용.`,
    `TALENT: ${person ? "AI 생성 UGC 진행자(실존 인물 유사성 차단)" : "인물 없음 — 제품/손 중심 연출"}.`,
    `SOUND: ${t.sound}. 훅 구간 비트 강조, 결과 구간 여백.`,
    `PACING: 훅·전환 빠른 컷, 결과 홀드. 첫 1초 이탈 방지 최우선.`,
    `TEXT OVERLAY: ${lang} 자막, 훅 문구 온스크린, 브랜드 컬러 액센트.`,
    `WHY THIS WORKS: ${t.why}`,
  ].join("\n");

  const negative =
    "실존 유명인 얼굴/유사성, 저작권 음원·로고, 과장·허위 효능 표현, 왜곡된 텍스트, 워터마크, 비현실적 피부 보정";

  return {
    headline: `${t.name} 구조를 ${pname}에 적용한 ${length}초 생성 브리프`,
    scenes,
    fullPrompt,
    negative,
  };
}

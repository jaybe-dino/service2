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
export interface PromptScene {
  time: string; roleKo: string; shot: string; action: string;
  sceneImagePrompt?: string; // 이 비트의 '새 장면 스틸'(내 제품·새 인물/배경) 생성용 영어 프롬프트
  motionPrompt?: string;     // 스틸을 image-to-video로 움직일 영어 모션 프롬프트
}
export interface RemakePromptPackage {
  headline: string;
  scenes: PromptScene[];
  fullPrompt: string; // 생성 모델에 전달되는 전체 프롬프트
  negative: string;
  concept?: string;  // 레퍼런스의 맥락 한 줄(재현 대상)
  talent?: string;   // 새 인물 묘사(원본 복제 금지)
  setting?: string;  // 새 환경 묘사
}

export interface PromptProduct { pname?: string; benefit?: string; concern?: string }
export interface PromptOptions { lang?: string; length?: number; aiPerson?: boolean; brandColor?: string }

const ROLE_KO: Record<string, string> = { hook: "훅", apply: "발림", result: "결과", cta: "CTA", detail: "디테일" };

// 템플릿(큐레이션/레퍼런스 공용) + 제품 + 옵션 → 매우 상세한 생성 브리프.
export function buildRemakePrompt(t: RemakeTemplate, product: PromptProduct = {}, opts: PromptOptions = {}): RemakePromptPackage {
  const length = opts.length ?? 30;
  const person = opts.aiPerson ?? true;
  const pname = product.pname?.trim() || "제품";
  const benefit = product.benefit?.trim();
  const concern = product.concern?.trim();

  // 시간 라인 구성 — 영상모델이 글자를 렌더하면 깨지므로 "자막/온스크린 텍스트"는 지시하지 않는다.
  // (자막·CTA 문구는 후처리에서 합성. 여기선 '깨끗한 원본 영상'만 묘사)
  let acc = 0;
  const total = t.scenes.reduce((s, x) => s + x.sec, 0) || 1;
  const scale = length / total; // 요청 길이에 맞춰 씬 시간 스케일
  const scenes: PromptScene[] = t.scenes.map((s) => {
    const start = Math.round(acc * scale);
    acc += s.sec;
    const end = Math.round(acc * scale);
    const action =
      s.role === "hook"
        ? `첫 1초 시선 고정. ${person ? "AI 진행자 셀피, 자연스러운 표정" : "제품 단독 히어로"} — 궁금증을 유발하는 무드(대사·자막은 후처리)`
        : s.role === "apply"
        ? `${pname} ${s.productSlot === "in-use" ? "실사용 발림(손·피부 클로즈업)" : "제품 노출"}${benefit ? `, ${benefit} 느낌 연출` : ""}`
        : s.role === "result"
        ? `개선 결과 클로즈업${concern ? ` (${concern} 해소 뉘앙스)` : ""}, 만족스러운 리액션`
        : s.role === "detail"
        ? `핵심 디테일/텍스처 포인트 컷`
        : `${pname} 히어로샷 마무리, 손으로 제품 제시`;
    return { time: `${start}-${end}s`, roleKo: ROLE_KO[s.role] || s.role, shot: s.camera, action };
  });

  const shotList = scenes.map((s, i) => `  ${i + 1}. [${s.time}] ${s.roleKo} — ${s.shot} · ${s.action}`).join("\n");

  const fullPrompt = [
    `[SHORT-FORM PRODUCT VIDEO BRIEF]`,
    `Format: TikTok vertical 9:16, ${length}s. Clean footage only.`,
    `Category: ${t.categoryKo} · Hook archetype: ${t.hookType}`,
    ``,
    `HOOK INTENT (0-2s): 궁금증 유발(문구는 화면에 넣지 말 것 — 무드/연출로만 표현)`,
    ``,
    `SHOT LIST:`,
    shotList,
    ``,
    `PRODUCT: ${pname}${benefit ? ` — 핵심 효능 ${benefit}` : ""}${concern ? `, 타깃 고민 ${concern}` : ""}.`,
    `모든 컷에서 제품 정체성(라벨·컬러·형태) 일관 유지 — 업로드 제품 이미지를 레퍼런스로 컨디셔닝.`,
    `VISUAL TONE: ${t.tone}. 브랜드 무드에 맞는 따뜻한 액센트 컬러를 조명·소품으로만(코드/문구 아님).`,
    `TALENT: ${person ? "AI 생성 UGC 진행자(실존 인물 유사성 차단)" : "인물 없음 — 제품/손 중심 연출"}.`,
    `SOUND: ${t.sound} 무드. (음원은 후처리)`,
    `PACING: 훅·전환 빠른 컷, 결과 홀드. 첫 1초 이탈 방지 최우선.`,
    `‼ NO ON-SCREEN TEXT: 자막·문구·숫자·해시태그·hex 색상코드·로고·UI 요소를 화면에 절대 렌더하지 말 것. 글자 없는 깨끗한 실사 영상으로. (자막·CTA는 후처리 단계에서 합성)`,
    `WHY THIS WORKS: ${t.why}`,
  ].join("\n");

  const negative =
    "any on-screen text, captions, subtitles, words, letters, numbers, hashtags, hex color codes (#...), gibberish typography, distorted lettering, logos, watermark, UI overlays, real celebrity likeness, copyrighted audio, exaggerated/false efficacy claims, unrealistic skin retouching";

  return {
    headline: `${t.name} 구조를 ${pname}에 적용한 ${length}초 생성 브리프`,
    scenes,
    fullPrompt,
    negative,
  };
}

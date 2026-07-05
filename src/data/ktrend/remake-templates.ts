// Glovek Remake Studio — 리메이크 템플릿 라이브러리 (샘플/프로토타입)
// 실제로는 사전 배치 파이프라인이 바이럴 영상을 구조 분해해 생성한 메타데이터.
// 원본 영상은 저장하지 않고 '구조'만 보관(저작권 안전).

export interface RemakeScene {
  role: "hook" | "apply" | "result" | "cta" | "detail";
  sec: number;
  camera: string;
  productSlot: "hero" | "in-use" | "none";
}

export interface RemakeTemplate {
  id: string;
  name: string;
  category: "skincare" | "makeup" | "haircare";
  categoryKo: string;
  hookType: string;        // reveal / unboxing / routine / before-after / asmr
  hookCopy: string;        // 첫 1~2초 카피 패턴
  tone: string;            // UGC-selfie / studio / asmr
  sound: string;
  scenes: RemakeScene[];
  perf: { views: string; engagement: string; roas?: string };
  why: string;             // "이 구조가 터진 이유"
  grad: string;            // 썸네일 placeholder 그라데이션
}

export const REMAKE_TEMPLATES: RemakeTemplate[] = [
  {
    id: "kbeauty-glowserum-reveal-014",
    name: "글로우 세럼 · 아침 리빌",
    category: "skincare", categoryKo: "스킨케어",
    hookType: "reveal", hookCopy: "사흘째 피부 뭐 발랐냐는 질문 받는 중",
    tone: "UGC-셀피 · 따뜻한 자연광", sound: "asmr-tap + trending-lofi",
    scenes: [
      { role: "hook", sec: 2, camera: "ECU 핸드헬드", productSlot: "hero" },
      { role: "apply", sec: 5, camera: "MCU 셀피", productSlot: "in-use" },
      { role: "result", sec: 4, camera: "CU 피부 텍스처", productSlot: "none" },
      { role: "cta", sec: 3, camera: "제품 테이블탑", productSlot: "hero" },
    ],
    perf: { views: "2.1M", engagement: "8.4%", roas: "3.2" },
    why: "첫 2초 '질문 받는 중' 궁금증 훅 + 손등 발림 ASMR로 이탈률↓, 결과 클로즈업이 신뢰를 만든다.",
    grad: "linear-gradient(135deg,#FFD8A8,#FF8FB1)",
  },
  {
    id: "kbeauty-cushion-beforeafter-021",
    name: "쿠션 · 반얼굴 비포애프터",
    category: "makeup", categoryKo: "메이크업",
    hookType: "before-after", hookCopy: "왼쪽만 발랐습니다",
    tone: "스튜디오 · 하이키", sound: "beat-drop transition",
    scenes: [
      { role: "hook", sec: 2, camera: "정면 하프페이스", productSlot: "none" },
      { role: "apply", sec: 4, camera: "쿠션 탭 클로즈업", productSlot: "in-use" },
      { role: "result", sec: 5, camera: "정면 풀커버 리빌", productSlot: "none" },
      { role: "cta", sec: 2, camera: "제품 스윙", productSlot: "hero" },
    ],
    perf: { views: "3.8M", engagement: "9.1%", roas: "4.0" },
    why: "반얼굴 대비가 즉각적 결과를 시각화 — 비트드롭 전환에서 커버력 리빌이 저장·공유를 유발.",
    grad: "linear-gradient(135deg,#C4B5FD,#F472B6)",
  },
  {
    id: "kbeauty-nightroutine-routine-033",
    name: "나이트 루틴 · 3스텝",
    category: "skincare", categoryKo: "스킨케어",
    hookType: "routine", hookCopy: "자기 전 딱 3개만",
    tone: "UGC-셀피 · 무드 조명", sound: "calm-lofi + water-drop",
    scenes: [
      { role: "hook", sec: 2, camera: "욕실 셀피", productSlot: "hero" },
      { role: "detail", sec: 4, camera: "스텝1 발림", productSlot: "in-use" },
      { role: "detail", sec: 4, camera: "스텝2 발림", productSlot: "in-use" },
      { role: "cta", sec: 3, camera: "제품 3종 나열", productSlot: "hero" },
    ],
    perf: { views: "1.4M", engagement: "7.2%", roas: "2.8" },
    why: "'딱 3개' 부담 없는 진입 + 루틴 포맷이 저장률↑, 번들 구매로 이어지는 구조.",
    grad: "linear-gradient(135deg,#A5B4FC,#67E8F9)",
  },
  {
    id: "kbeauty-unboxing-unboxing-042",
    name: "언박싱 · 첫 개봉 ASMR",
    category: "skincare", categoryKo: "스킨케어",
    hookType: "unboxing", hookCopy: "드디어 품절템 도착",
    tone: "ASMR · 스튜디오", sound: "asmr-unwrap + tap",
    scenes: [
      { role: "hook", sec: 2, camera: "택배 오픈 탑뷰", productSlot: "hero" },
      { role: "detail", sec: 4, camera: "패키지 클로즈업", productSlot: "hero" },
      { role: "apply", sec: 4, camera: "텍스처 스와치", productSlot: "in-use" },
      { role: "cta", sec: 3, camera: "제품 히어로샷", productSlot: "hero" },
    ],
    perf: { views: "1.9M", engagement: "8.9%", roas: "3.5" },
    why: "언박싱 ASMR은 신제품·품절템 소구에 강함 — 텍스처 스와치가 구매 확신을 준다.",
    grad: "linear-gradient(135deg,#FDE68A,#FCA5A5)",
  },
  {
    id: "kbeauty-hairoil-reveal-051",
    name: "헤어 오일 · 윤기 리빌",
    category: "haircare", categoryKo: "헤어케어",
    hookType: "reveal", hookCopy: "손상모 맞아? 라는 소리",
    tone: "UGC-셀피 · 역광", sound: "trending-lofi + swish",
    scenes: [
      { role: "hook", sec: 2, camera: "머리결 역광 슬로우", productSlot: "none" },
      { role: "apply", sec: 4, camera: "오일 도포", productSlot: "in-use" },
      { role: "result", sec: 5, camera: "윤기 리빌 슬로우", productSlot: "none" },
      { role: "cta", sec: 2, camera: "제품 히어로샷", productSlot: "hero" },
    ],
    perf: { views: "1.1M", engagement: "6.8%", roas: "2.5" },
    why: "역광 슬로우모션이 윤기를 극대화 — 손상모 반전 서사가 공감·저장을 이끈다.",
    grad: "linear-gradient(135deg,#6EE7B7,#A7F3D0)",
  },
  {
    id: "kbeauty-lip-swatch-060",
    name: "립 · 손등 스와치 6종",
    category: "makeup", categoryKo: "메이크업",
    hookType: "detail", hookCopy: "인생립 찾아드림",
    tone: "스튜디오 · 하이키", sound: "fast-cut trending",
    scenes: [
      { role: "hook", sec: 2, camera: "립 6종 나열", productSlot: "hero" },
      { role: "detail", sec: 5, camera: "손등 스와치 패스트컷", productSlot: "in-use" },
      { role: "apply", sec: 4, camera: "입술 발색 클로즈업", productSlot: "in-use" },
      { role: "cta", sec: 2, camera: "베스트 컬러 핀", productSlot: "hero" },
    ],
    perf: { views: "2.6M", engagement: "9.6%", roas: "3.9" },
    why: "다색 스와치 패스트컷은 '내 컬러 찾기' 욕구를 자극 — 댓글·저장 전환이 높다.",
    grad: "linear-gradient(135deg,#FBCFE8,#F9A8D4)",
  },
];

export const REMAKE_TEMPLATE_MAP: Record<string, RemakeTemplate> =
  Object.fromEntries(REMAKE_TEMPLATES.map((t) => [t.id, t]));

// 생성 옵션 정의
export const REMAKE_LANGS = ["영어(US)", "한국어", "베트남어", "태국어"] as const;
export const REMAKE_LENGTHS = [15, 30, 60] as const;

// 데모용 결정론적 바이럴 예측 스코어 (실제로는 Glovek 학습 모델/외부 API)
export function mockViralScore(templateId: string, variation: number): { total: number; hook: number; retention: number; fit: number } {
  let h = 0;
  for (let i = 0; i < templateId.length; i++) h = (h * 31 + templateId.charCodeAt(i)) & 0xffff;
  const seed = (h + variation * 977) % 1000;
  const hook = 62 + (seed % 33);
  const retention = 58 + ((seed >> 2) % 37);
  const fit = 66 + ((seed >> 4) % 30);
  const total = Math.round((hook + retention + fit) / 3);
  return { total, hook, retention, fit };
}

// 콘텐츠 분석(후킹·소구점) · 브랜드 헬스스코어 · 유사 콘텐츠 (유료 기능 로직)
import type { Brand } from "./brands";
import type { Content } from "./content";
import type { CategoryId } from "./meta";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}
function pick<T>(arr: T[], seed: number, n: number): T[] {
  const out: T[] = [];
  let s = seed;
  const pool = [...arr];
  for (let i = 0; i < n && pool.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    out.push(pool.splice(s % pool.length, 1)[0]);
  }
  return out;
}

const HOOKS: Record<CategoryId, string[]> = {
  skincare: [
    "3초 비포&애프터로 모공/톤 변화 즉시 시연",
    "‘피부과 안 가고도’ 류의 권위 부정 훅",
    "제형 클로즈업 + 흡수 ASMR로 시선 고정",
    "성분 한 줄 설명(예: 스네일뮤신) 자막 훅",
    "30일 챌린지 결과 공개 포맷",
  ],
  makeup: [
    "원밤 vs 풀커버 분할 화면 비교",
    "톤별/피부톤별 스와치 매칭 시연",
    "‘지속력 테스트’(물·문지름) 실험 훅",
    "GRWM 첫 컷에 완성 룩 먼저 공개",
    "발색 클로즈업 + 손등 스와치",
  ],
  haircare: [
    "before/after 모발 윤기 분할 컷",
    "두피 클렌징 거품/세럼 텍스처 ASMR",
    "‘손상모 1주 루틴’ 결과 공개",
    "빗질 시 끊김 테스트 시연",
    "향/지속력 강조 자막 훅",
  ],
};

const CTAS = [
  "댓글 ‘링크’ 요청 유도 → 핀 댓글 어필리에이트",
  "한정 쿠폰/세일 카운트다운으로 즉시 구매",
  "‘오렌지 카트’ 클릭 유도 + 재고 임박 강조",
  "저장(Save) 유도로 알고리즘 도달 확대",
];

export interface ContentAnalysis {
  hooks: string[];
  usp: string[];
  cta: string;
  audience: string;
  recommend: string;
  hookWindow: string;
}

export function analyzeContent(c: Content): ContentAnalysis {
  const seed = hash(c.influencerId + c.id + c.brandId);
  const hooks = pick(HOOKS[c.category], seed, 3);
  const usp = pick(
    [
      c.isShop ? "틱톡샵 인앱 결제 동선(이탈 최소화)" : "프로필 링크 유도(외부 전환)",
      c.engagementRate >= 8 ? "높은 참여율 → 댓글 소통형 소구" : "정보형 신뢰 소구",
      c.isAd ? "#ad 표기로 신뢰 확보 + 명확한 혜택 제시" : "오가닉 후기 톤(광고 피로 회피)",
      "K-뷰티 ‘성분·효능’ 키워드로 검색 유입",
    ],
    seed + 7,
    3,
  );
  return {
    hooks,
    usp,
    cta: CTAS[seed % CTAS.length],
    audience: c.tier === "mega" ? "광범위 매스 도달(인지)" : c.tier === "macro" ? "관심 카테고리 타깃" : "니치·고전환 마이크로 청중",
    recommend:
      c.estRoasX >= 4
        ? "고ROAS 포맷 — 유사 크리에이터로 스케일업 권장"
        : "테스트 포맷 — 훅 A/B 후 우수안만 증액",
    hookWindow: "0–3초",
  };
}

export function similarContent(all: Content[], c: Content, n = 6): Content[] {
  return all
    .filter((x) => x.id !== c.id && (x.brandId === c.brandId || x.category === c.category))
    .sort((a, b) => {
      const sa = (a.brandId === c.brandId ? 100 : 0) + a.engagementRate;
      const sb = (b.brandId === c.brandId ? 100 : 0) + b.engagementRate;
      return sb - sa;
    })
    .slice(0, n);
}

// 브랜드 헬스 스코어 (0-100): 조회력·인플루언서 다양성·Shop 전환·광고 효율 종합
export function brandHealthScore(b: Brand): { score: number; parts: { label: string; v: number }[] } {
  const reach = Math.min(40, Math.round((Math.log10(b.totalViews + 10) / 9) * 40));
  const diversity = Math.min(25, Math.round((b.influencers / 200) * 25));
  const shop = Math.min(20, Math.round((b.shopRatio / 100) * 20));
  const volume = Math.min(15, Math.round((b.videos / 215) * 15));
  const parts = [
    { label: "조회력", v: reach },
    { label: "크리에이터 다양성", v: diversity },
    { label: "Shop 전환", v: shop },
    { label: "콘텐츠 볼륨", v: volume },
  ];
  return { score: reach + diversity + shop + volume, parts };
}

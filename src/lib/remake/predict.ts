// Remake Studio — 바이럴 예측 스코어.
// 순수 해시(mockViralScore)가 아니라 레퍼런스의 실측 성과 신호(참여율·조회수·훅 유형)를
// 가중해 결정론적으로 산출한다. 즉 "예측 = 잘 터진 레퍼런스일수록 높게".
// 향후 실모델(자체 학습/외부 virality API)로 교체할 수 있도록 이 함수만 바꾸면 된다.
import type { RemakeTemplate } from "@/data/ktrend/remake-templates";

export interface ViralScore { total: number; hook: number; retention: number; fit: number }

function parseViews(s: string): number {
  const m = /([\d.]+)\s*([MK]?)/i.exec(s || "");
  if (!m) return 0;
  const n = parseFloat(m[1]) || 0;
  const u = m[2].toUpperCase();
  return u === "M" ? n * 1_000_000 : u === "K" ? n * 1_000 : n;
}
function parsePct(s: string): number {
  const m = /([\d.]+)/.exec(s || "");
  return m ? parseFloat(m[1]) || 0 : 0;
}
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}
const clamp = (n: number) => Math.max(40, Math.min(99, Math.round(n)));

// 훅 유형별 기대 계수(경험적 가중)
const HOOK_W: Record<string, number> = {
  "before-after": 1.06, reveal: 1.04, listicle: 1.03, asmr: 1.02,
  unboxing: 1.0, "problem-solution": 1.0, routine: 0.98, detail: 1.0,
};

export interface PredictContext { hasProduct?: boolean; hasImage?: boolean }

export function predictViral(t: RemakeTemplate, variation: number, ctx: PredictContext = {}): ViralScore {
  const eng = parsePct(t.perf.engagement);       // 참여율 %
  const views = parseViews(t.perf.views);        // 조회수
  const roas = t.perf.roas ? parseFloat(t.perf.roas) : 0;
  const hookW = HOOK_W[t.hookType] || 1.0;

  // 신호 정규화(대략적 스케일)
  const engN = Math.min(1, eng / 12);            // 12%면 만점
  const viewN = Math.min(1, Math.log10(Math.max(10, views)) / 7); // 1e7=1.0
  const roasN = Math.min(1, roas / 4.5);

  // 변형별 결정론적 변동(±약 6점)
  const seed = (hashSeed(t.id) + variation * 977) % 1000;
  const jitter = ((seed % 13) - 6);

  const hook = clamp(60 + engN * 34 * hookW + jitter);
  const retention = clamp(55 + engN * 22 + viewN * 16 + ((seed >> 2) % 9) - 4);
  const fit = clamp(
    62 + roasN * 18 + viewN * 10 +
    (ctx.hasProduct ? 4 : 0) + (ctx.hasImage ? 4 : 0) +
    ((seed >> 4) % 7) - 3,
  );
  const total = clamp((hook + retention + fit) / 3);
  return { total, hook, retention, fit };
}

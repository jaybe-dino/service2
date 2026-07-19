// Remake 비용 제어(중앙 집중) — 테스트 중 최소 비용, 이후 손쉽게 상향.
// 기본은 "비용 절약 모드(on)": 키프레임/장면/변형/분석프레임을 최소로, 영상 티어를 draft로.
// 상향 방법(둘 중 아무거나):
//   1) 전체 풀품질 복귀:  REMAKE_COST_SAVER=0
//   2) 항목별 상향:       REMAKE_MAX_KEYFRAMES / REMAKE_MAX_SCENES / REMAKE_MAX_VARIATIONS /
//                        REMAKE_ANALYSIS_FRAMES / REMAKE_TIER  (개별 env가 항상 우선)
import type { Tier } from "./providers";

// 기본 on. REMAKE_COST_SAVER=0 이면 종전(풀품질) 기본값 사용.
export function costSaver(): boolean {
  return process.env.REMAKE_COST_SAVER !== "0";
}

// 개별 env가 있으면 그 값을, 없으면 saver/풀품질 기본값을 [min,max]로 클램프.
function envInt(name: string, saverDefault: number, fullDefault: number, min: number, max: number): number {
  const raw = process.env[name];
  const fallback = costSaver() ? saverDefault : fullDefault;
  const n = raw != null && raw !== "" ? Number(raw) : fallback;
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : fallback));
}

// 키프레임 렌더 수(이미지 모델 호출 수) — 레퍼가 세분화된 만큼(보통 8~12컷) 렌더해 디테일 확보.
// 상한이자 기본값. 실제로는 분석된 샷 수만큼만 렌더(min(shots, 이 값)). 60s/레이트리밋 안전상 상한 14.
// 저비용으로 낮추려면 REMAKE_MAX_KEYFRAMES=4 등으로 지정.
export const maxKeyframes = () => envInt("REMAKE_MAX_KEYFRAMES", 10, 10, 1, 14);
// 장면(클립) 수 — 절약 1, 풀 4.
export const maxScenes = () => envInt("REMAKE_MAX_SCENES", 1, 4, 1, 8);
// 변형(A/B) 수 — 절약 1, 풀 2.
export const maxVariations = () => envInt("REMAKE_MAX_VARIATIONS", 1, 2, 1, 4);
// 분석 프레임 수(Claude 비전 입력 수) — 샷을 촘촘히 분절하려면 화면을 충분히 봐야 함 → 기본 12.
// 저비용으로 낮추려면 REMAKE_ANALYSIS_FRAMES=4.
export const analysisFrames = () => envInt("REMAKE_ANALYSIS_FRAMES", 12, 12, 2, 20);

// 기본 영상 티어 — 절약 draft(가장 저렴), 풀 hd. REMAKE_TIER 로 강제 가능.
export function defaultTier(): Tier {
  const forced = (process.env.REMAKE_TIER || "").toLowerCase();
  if (forced === "draft" || forced === "hd" || forced === "premium") return forced as Tier;
  return costSaver() ? "draft" : "hd";
}

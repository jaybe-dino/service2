// Remake v2 — 트렌드 템플릿(REMAKE_TEMPLATES)을 파이프라인이 쓰는 ReferenceSpec으로 변환.
// shot_type/camera는 자유텍스트라 검증 enum과 충돌하므로 생략(선택 필드) → 검증 통과.
// sales(hook/arc/proof)는 템플릿 훅·씬에서 합성. 세일즈 매핑(sales_beat)은 씬 역할로 유지.
import type { RemakeTemplate } from "@/data/ktrend/remake-templates";
import type { ReferenceSpec } from "@/lib/remake/spec";

const BEAT_KO: Record<string, string> = {
  hook: "훅 — 시선 잡기",
  apply: "사용 — 제품 발림/시연",
  result: "결과 — 변화 증명",
  cta: "전환 — 구매 유도",
  detail: "디테일 — 성분/포인트",
};

export function templateToSpec(t: RemakeTemplate): ReferenceSpec {
  const scenes = t.scenes || [];
  const shots = scenes.map((s, i) => ({
    shot_no: i + 1,
    sales_beat: BEAT_KO[s.role] || s.role,
    duration_sec: s.sec,
    needs_product: s.productSlot !== "none",
  }));
  const productSlots = scenes
    .map((s, i) => ({ shot_no: i + 1, slot: s.productSlot }))
    .filter((s) => s.slot !== "none")
    .map((s) => ({ shot_no: s.shot_no, role: s.slot }));

  const arc = scenes.map((s) => BEAT_KO[s.role] || s.role);
  const proof = scenes.find((s) => s.role === "result");

  return {
    ref_id: t.id,
    sales: {
      hook_mechanism: t.hookCopy || `${t.hookType} 훅`,
      sales_arc: arc.length ? arc : ["훅", "사용", "결과", "전환"],
      proof_moment: proof ? "결과 클로즈업으로 변화 증명" : "사용 후 텍스처/결과 강조",
    },
    style: {
      tone: t.tone,
      sound: t.sound,
    },
    shots,
    product_slots: productSlots,
  } as unknown as ReferenceSpec;
}

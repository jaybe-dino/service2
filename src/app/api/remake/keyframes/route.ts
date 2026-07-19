import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { hasImageEdit, composeKeyframe, replicaKeyframe } from "@/lib/remake/imageedit";
import { planKeyframes } from "@/lib/remake/planner";
import { loadCachedFrames } from "@/lib/remake/frames";
import { validateReferenceSpec, LAYER_CONTROL_STAGE1, layerControlStage2, type ReferenceSpec } from "@/lib/remake/spec";
import { maxKeyframes } from "@/lib/remake/cost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ②+③ KeyframePlanner → KeyframeRenderer + 확인 게이트.
// ReferenceSpec + 내 제품 → 샷별 키프레임 이미지(제품 합성). 결과는 사람이 확인/승인하는 관문(M2).
// I2V(M3)는 승인된 키프레임으로만 진행.
export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  if (!hasImageEdit()) return NextResponse.json({ error: "GEMINI_API_KEY 미설정 — 키프레임 렌더에 이미지 모델이 필요합니다." }, { status: 503 });
  await ensureSchema();

  const body = (await req.json().catch(() => ({}))) as {
    spec?: ReferenceSpec; image?: string; stage?: number; preset?: string; shotNos?: number[];
  };
  const v = validateReferenceSpec(body.spec);
  if (!v.ok || !v.spec) return NextResponse.json({ error: `유효한 ReferenceSpec 필요: ${v.errors.join("; ")}` }, { status: 400 });
  const spec = v.spec;

  // 제품 이미지(base64)
  let imageB64 = "", imageMime = "image/png";
  if (typeof body.image === "string" && body.image.startsWith("data:")) {
    const m = body.image.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (m) { imageMime = m[1]; imageB64 = m[2]; }
  }
  if (!imageB64) return NextResponse.json({ error: "제품 이미지가 필요합니다." }, { status: 400 });

  const stage = Number(body.stage) === 2 ? 2 : 1;
  const control = stage === 2 ? layerControlStage2(body.preset || "avatar_B/clean_studio") : LAYER_CONTROL_STAGE1;

  const plans = planKeyframes(spec, control);
  const maxKf = maxKeyframes(); // 비용 절약 기본 1(REMAKE_COST_SAVER=0 또는 REMAKE_MAX_KEYFRAMES로 상향)
  // 소수만 렌더할 때(절약모드) 제품이 등장하는 샷을 우선 선택 → 적게 뽑아도 제품이 반드시 노출.
  const pickMinimal = (all: typeof plans, n: number) =>
    [...all.filter((p) => p.needs_product), ...all.filter((p) => !p.needs_product)]
      .slice(0, n)
      .sort((a, b) => a.shot_no - b.shot_no);
  const wanted = Array.isArray(body.shotNos) && body.shotNos.length
    ? plans.filter((p) => body.shotNos!.includes(p.shot_no))
    : pickMinimal(plans, maxKf);

  // stage 1 = 레퍼 거의 복제(제품만 교체): 실제 레퍼 프레임에 내 제품을 스왑.
  //   프레임 워커(REMAKE_FRAME_SERVICE_URL)로 분석 때 캐시된 프레임이 있어야 복제 가능.
  //   프레임이 없으면(워커 미배포) 텍스트 재창조로 폴백 → replicaFallback=true로 알림.
  const replica = stage === 1;
  const refFrames = replica ? await loadCachedFrames(spec.ref_id).catch(() => []) : [];
  const shotByNo = new Map(spec.shots.map((s) => [s.shot_no, s]));
  const pickFrame = (shotNo: number): { b64: string; mime: string } | null => {
    if (!refFrames.length) return null;
    const s = shotByNo.get(shotNo);
    const t = s ? (Number(s.t_start) + Number(s.t_end)) / 2 : (shotNo - 1) * 3;
    let best = refFrames[0], bestD = Infinity;
    for (const f of refFrames) { const d = Math.abs((f.ts || 0) - t); if (d < bestD) { bestD = d; best = f; } }
    return { b64: best.b64, mime: best.mime };
  };
  const replicaFallback = replica && refFrames.length === 0;

  const product = { b64: imageB64, mime: imageMime };
  interface Img { b64: string; mime: string }
  type Row = { shot_no: number; sales_beat: string; needs_product: boolean; mode: string; ok: boolean; assetId?: string; url?: string; error?: string };

  // 샷 1개 렌더 → 자산 저장 + 결과행. hero가 주어지면 재창조 시 같은 인물·제품을 이어받음(일관성).
  const renderOne = async (plan: typeof plans[number], hero?: Img): Promise<{ row: Row; img: Img | null }> => {
    const base = { shot_no: plan.shot_no, sales_beat: plan.sales_beat, needs_product: plan.needs_product };
    try {
      const rf = replica ? pickFrame(plan.shot_no) : null;
      // 복제 모드 + 프레임 있으면 프레임 복제(제품만 교체) — hero로 제품 외형 통일.
      // 아니면 히어로 앵커 재창조.
      const { img: still, error } = rf
        ? await replicaKeyframe(product, rf, plan, hero ? { hero } : {})
        : await composeKeyframe(product, plan, hero ? { hero } : {});
      if (!still) return { row: { ...base, mode: rf ? "replica" : "recreate", ok: false, error }, img: null };
      const id = randomUUID();
      await sql`INSERT INTO remake_assets (id, mime, data) VALUES (${id}, ${still.mime}, ${still.b64})`;
      return { row: { ...base, mode: rf ? "replica" : "recreate", ok: true, assetId: id, url: `/api/remake/asset/${id}` }, img: still };
    } catch (e) {
      return { row: { ...base, mode: "error", ok: false, error: String(e).slice(0, 160) }, img: null };
    }
  };

  // 항상 히어로 앵커 2라운드: 1) 첫 컷 렌더 → 2) 나머지는 첫 컷을 참조(제품·인물 외형 통일).
  // 복제 모드는 인물·구도를 프레임이 보장하고, hero는 '제품 외형'을 컷 간 통일하는 앵커로 쓰인다.
  const [first, ...rest] = wanted;
  const heroRes = await renderOne(first);
  const hero = heroRes.img || undefined;
  const restRes = rest.length ? await Promise.all(rest.map((p) => renderOne(p, hero))) : [];
  const results: Row[] = [heroRes, ...restRes].map((r) => r.row);
  results.sort((a, b) => a.shot_no - b.shot_no);

  const rendered = results.filter((r) => r.ok).length;
  const firstErr = results.find((r) => !r.ok && r.error)?.error;
  return NextResponse.json({
    ok: rendered > 0,
    stage,
    control,
    planned: plans.length,
    rendered,
    replica,
    replicaFallback,     // true면 복제 요청이지만 프레임 없어 재창조로 폴백(워커 미배포)
    framesLoaded: refFrames.length,
    keyframes: results.sort((a, b) => a.shot_no - b.shot_no),
    error: rendered === 0 ? `키프레임 렌더 실패: ${firstErr || "이미지 모델 오류"}` : undefined,
    note: replicaFallback
      ? "복제하려면 프레임 워커(REMAKE_FRAME_SERVICE_URL)가 필요합니다 — 현재는 레퍼 프레임이 없어 재창조로 대체했습니다."
      : "이 키프레임들을 확인/수정한 뒤 승인해야 M3(image-to-video)로 진행합니다.",
  });
}

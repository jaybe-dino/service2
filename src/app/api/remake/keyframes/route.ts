import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { hasImageEdit, composeKeyframe } from "@/lib/remake/imageedit";
import { planKeyframes } from "@/lib/remake/planner";
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
  const wanted = Array.isArray(body.shotNos) && body.shotNos.length
    ? plans.filter((p) => body.shotNos!.includes(p.shot_no))
    : plans.slice(0, maxKf);

  // 병렬 렌더(각 Nano Banana 호출은 타임박스) → 60초 안에 들도록.
  const product = { b64: imageB64, mime: imageMime };
  const results = await Promise.all(
    wanted.map(async (plan) => {
      try {
        const { img: still, error } = await composeKeyframe(product, plan);
        if (!still) return { shot_no: plan.shot_no, sales_beat: plan.sales_beat, needs_product: plan.needs_product, ok: false, error };
        const id = randomUUID();
        await sql`INSERT INTO remake_assets (id, mime, data) VALUES (${id}, ${still.mime}, ${still.b64})`;
        return {
          shot_no: plan.shot_no, sales_beat: plan.sales_beat, needs_product: plan.needs_product,
          ok: true, assetId: id, url: `/api/remake/asset/${id}`,
        };
      } catch (e) {
        return { shot_no: plan.shot_no, sales_beat: plan.sales_beat, needs_product: plan.needs_product, ok: false, error: String(e).slice(0, 160) };
      }
    }),
  );

  const rendered = results.filter((r) => r.ok).length;
  const firstErr = results.find((r) => !r.ok && r.error)?.error;
  return NextResponse.json({
    ok: rendered > 0,
    stage,
    control,
    planned: plans.length,
    rendered,
    keyframes: results.sort((a, b) => a.shot_no - b.shot_no),
    error: rendered === 0 ? `키프레임 렌더 실패: ${firstErr || "이미지 모델 오류"}` : undefined,
    note: "이 키프레임들을 확인/수정한 뒤 승인해야 M3(image-to-video)로 진행합니다.",
  });
}

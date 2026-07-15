import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { selectProvider, TIERS, type Tier } from "@/lib/remake/providers";
import { validateReferenceSpec, type ReferenceSpec, type Shot } from "@/lib/remake/spec";
import { defaultTier } from "@/lib/remake/cost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ④ ShotAnimator — 승인된 키프레임[] + 각 샷의 camera/action → 샷별 I2V 클립 잡 생성.
// 반드시 image-to-video(키프레임 앵커). t2v 금지. 상태 폴링은 기존 /api/remake/status 사용.
const NEGATIVE = "on-screen text, captions, letters, numbers, hashtags, logos, watermark, UI overlays, warped product, extra fingers, plastic skin, real celebrity likeness";

function motionPrompt(shot: Shot | undefined): string {
  const cam = shot?.camera || "static";
  const act = shot?.action ? ` ${shot.action}.` : "";
  return `Animate this vertical 9:16 keyframe into a short realistic clip with ${cam} camera movement.${act} ` +
    "Keep the product, person and composition exactly as in the image — add only subtle, natural motion. " +
    "Photorealistic UGC. NO on-screen text, captions, letters, logos or UI.";
}

export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const body = (await req.json().catch(() => ({}))) as {
    spec?: ReferenceSpec; tier?: Tier;
    keyframes?: { shot_no: number; assetId: string }[];
  };
  const v = validateReferenceSpec(body.spec);
  if (!v.ok || !v.spec) return NextResponse.json({ error: `유효한 ReferenceSpec 필요: ${v.errors.join("; ")}` }, { status: 400 });
  const spec = v.spec;
  const kfs = Array.isArray(body.keyframes) ? body.keyframes.filter((k) => k && k.assetId) : [];
  if (!kfs.length) return NextResponse.json({ error: "승인된 키프레임(assetId)이 필요합니다." }, { status: 400 });

  const tier: Tier = TIERS.includes(body.tier as Tier) ? (body.tier as Tier) : defaultTier();
  const provider = selectProvider();
  const shotByNo = new Map(spec.shots.map((s) => [s.shot_no, s]));
  const seed = spec.ref_id || "remake";

  // 키프레임 base64 로드(자산) → I2V 제출 → remake_jobs 적재(기존 status가 폴링).
  const jobs = await Promise.all(
    kfs.map(async (kf) => {
      const id = randomUUID();
      try {
        const a = await sql<{ data: string; mime: string }>`SELECT data, mime FROM remake_assets WHERE id=${kf.assetId}`;
        const kb = a.rows[0]?.data;
        if (!kb) throw new Error(`키프레임 자산 없음: ${kf.assetId}`);
        const shot = shotByNo.get(kf.shot_no);
        if (provider.id === "mock") {
          await sql`INSERT INTO remake_jobs (id, provider, template_id, variation, score, status, fidelity)
            VALUES (${id}, 'mock', ${seed}, ${kf.shot_no}, 0, 'in_progress', 'keyframeI2V')`;
          return { id, shot_no: kf.shot_no };
        }
        const { requestId } = await provider.submit({
          prompt: motionPrompt(shot), tier,
          imageBase64: kb, imageMime: a.rows[0]?.mime || "image/png",
          negativePrompt: NEGATIVE,
        });
        await sql`INSERT INTO remake_jobs (id, provider, request_id, template_id, variation, score, status, fidelity)
          VALUES (${id}, ${provider.id}, ${requestId}, ${seed}, ${kf.shot_no}, 0, 'in_progress', 'keyframeI2V')`;
        return { id, shot_no: kf.shot_no };
      } catch (e) {
        await sql`INSERT INTO remake_jobs (id, provider, template_id, variation, score, status, error, fidelity)
          VALUES (${id}, ${provider.id}, ${seed}, ${kf.shot_no}, 0, 'failed', ${String(e).slice(0, 240)}, 'keyframeI2V')`;
        return { id, shot_no: kf.shot_no, failed: true };
      }
    }),
  );

  return NextResponse.json({
    ok: true,
    mode: provider.id,
    provider: provider.label,
    tier,
    jobs: jobs.sort((a, b) => a.shot_no - b.shot_no),
    note: "각 잡을 /api/remake/status?ids=... 로 폴링하세요. 완료되면 /api/remake/assemble 로 최종 편집.",
  });
}

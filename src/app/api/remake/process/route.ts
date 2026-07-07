import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { providerById, type Tier } from "@/lib/remake/providers";
import { type Frame, midTime, fetchCoverFrame, fetchSceneFrames } from "@/lib/remake/frames";
import { hasImageEdit, editProductSwap } from "@/lib/remake/imageedit";
import { REMAKE_TEMPLATE_MAP } from "@/data/ktrend/remake-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Scene { time?: string; roleKo?: string; shot?: string; action?: string }
interface Spec {
  seed: string; variation: number; tier: Tier; providerId: string;
  needsPublicUrl: boolean; imageUrl: string | null;
  productAssetId: string | null; imageMime: string;
  templateId: string | null; promptBase: string; product: { pname?: string; benefit?: string; concern?: string };
  sceneMode: boolean; scene: Scene | null; scenesLen: number;
  refUrl: string | null; canEdit: boolean; hasRef: boolean;
}

const cams = ["subtle push-in", "slow orbit", "gentle handheld sway", "smooth tilt-up reveal"];
const NEGATIVE = "any on-screen text, captions, subtitles, words, letters, numbers, hashtags, hex color codes, gibberish typography, distorted lettering, logos, watermark, UI overlays, real celebrity likeness, copyrighted audio, exaggerated or false efficacy claims";

// 잡 하나를 실제 생성(프레임 → 제품 스왑 → 제출). 각 호출이 독립적인 60s 예산을 가짐.
export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const t0 = Date.now();

  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id 필요" }, { status: 400 });

  const { rows } = await sql<{ status: string; request_id: string | null; spec: string | null }>`
    SELECT status, request_id, spec FROM remake_jobs WHERE id=${id}`;
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "잡 없음" }, { status: 404 });
  // 이미 제출됐거나 종료된 잡은 재처리 안 함(중복 제출 방지).
  if (row.request_id || ["completed", "failed", "nsfw"].includes(row.status)) {
    return NextResponse.json({ ok: true, status: row.status, already: true });
  }
  let spec: Spec | null = null;
  try { spec = row.spec ? (JSON.parse(row.spec) as Spec) : null; } catch { spec = null; }
  if (!spec) {
    await sql`UPDATE remake_jobs SET status='failed', error='스펙 없음(재생성 필요)', updated_at=now() WHERE id=${id}`;
    return NextResponse.json({ ok: false, status: "failed" });
  }

  const timing: string[] = [];
  const mark = (name: string, from: number) => timing.push(`${name}=${Date.now() - from}ms`);

  try {
    const v = spec.variation;
    const t = spec.templateId ? REMAKE_TEMPLATE_MAP[spec.templateId] : undefined;

    // 제품 이미지 로드(자산).
    let imageBase64 = "";
    const imageMime = spec.imageMime || "image/png";
    if (spec.productAssetId) {
      const a = await sql<{ data: string; mime: string }>`SELECT data, mime FROM remake_assets WHERE id=${spec.productAssetId}`;
      imageBase64 = a.rows[0]?.data || "";
    }

    // 1) 프레임(커버 + 이 장면) — 캐시 우선.
    const tf = Date.now();
    const timestamps = spec.scene ? [midTime(spec.scene.time, v)] : [];
    const [refFrame, sceneFrames] = await Promise.all([
      spec.hasRef && spec.refUrl ? fetchCoverFrame(spec.refUrl) : Promise.resolve(null),
      spec.hasRef && spec.refUrl && spec.sceneMode && timestamps.length
        ? fetchSceneFrames(spec.refUrl, timestamps)
        : Promise.resolve([] as (Frame | null)[]),
    ]);
    mark("frames", tf);
    const sceneRef = sceneFrames[0] || refFrame;
    const usedSceneFrames = Boolean(sceneFrames[0]);

    // 2) 제품 스왑 편집(레퍼런스 프레임에서 제품만 교체) — 가장 긴밀한 재현.
    let inputB64 = imageBase64;
    let inputMime = imageMime;
    let edited = false;
    if (spec.canEdit && sceneRef && imageBase64 && hasImageEdit()) {
      const te = Date.now();
      const sc = spec.scene || {};
      const sw = await editProductSwap(
        { b64: sceneRef.b64, mime: sceneRef.mime },
        { b64: imageBase64, mime: imageMime },
        `${sc.roleKo || ""} ${sc.action || ""}`.trim(),
      );
      mark("edit", te);
      if (sw) { inputB64 = sw.b64; inputMime = sw.mime; edited = true; }
    }

    // 3) 프롬프트
    const refNote = (refFrame || usedSceneFrames)
      ? `\n\n[REFERENCE-TO-VIDEO] 첫 번째 입력 이미지는 레퍼런스 영상의${usedSceneFrames ? " 이 장면(timestamp) 실제 프레임" : " 실제 프레임"}입니다. 그 장면의 시각 스타일·구도·프레이밍·카메라 앵글·조명·색감·질감 디테일을 최대한 살려 유사하게 따르세요(똑같이 복제가 아니라 디테일을 살린 유사 재현). 두 번째 입력 이미지는 내 제품입니다 — 같은 룩을 유지하되 화면의 제품만 내 제품으로 교체하세요. 레퍼런스의 글자·로고·특정 인물은 복제 금지.`
      : "";
    const sc = spec.scene || {};
    const head = spec.promptBase ? `${spec.promptBase}\n\n` : (t ? `${buildPrompt(t, spec.product, v)}\n\n` : "");
    const scenePrompt = `${head}SCENE ${v + 1}/${spec.scenesLen || 1} — reproduce this exact beat of the reference:
- timing: ${sc.time || `${v + 1}`}
- role: ${sc.roleKo || ""}
- shot/camera: ${sc.shot || cams[v % cams.length]}
- action: ${sc.action || ""}
Match the reference's framing, camera movement and pacing for THIS scene faithfully (high structure similarity). Keep the product identity (label, color, shape) consistent across scenes. Use distinct visuals/audio from any original clip. Vertical 9:16, photorealistic.
‼ NO on-screen text of any kind — no captions, words, letters, numbers, hashtags, hex color codes, logos or UI. Clean footage only (captions are added later in post).`;

    const prompt = edited
      ? `Animate this vertical 9:16 image into a short realistic clip with subtle, natural motion for a "${sc.roleKo || "beauty"}" short-form beat${sc.action ? ` (${sc.action})` : ""}. Keep the product and composition exactly as in the image; do not change the scene, product or add elements. Photorealistic. NO on-screen text, captions, letters, numbers, hashtags, logos or UI.`
      : (spec.sceneMode
        ? scenePrompt
        : spec.promptBase
        ? `${spec.promptBase}\n\nVARIATION ${v + 1}: ${cams[v % cams.length]} camera movement.`
        : t ? buildPrompt(t, spec.product, v) : "") + refNote;

    // 4) 제출
    const ts = Date.now();
    const provider = providerById(spec.providerId);
    const { requestId } = await provider.submit({
      prompt, tier: spec.tier, imageUrl: spec.imageUrl || undefined,
      imageBase64: inputB64, imageMime: inputMime,
      refImageBase64: edited ? undefined : sceneRef?.b64, refImageMime: edited ? undefined : sceneRef?.mime,
      negativePrompt: NEGATIVE,
    });
    mark("submit", ts);

    const fidelity = edited ? "productSwap" : usedSceneFrames ? "perScene" : refFrame ? "cover" : "text";
    const debug = `${timing.join(" ")} total=${Date.now() - t0}ms edited=${edited} sceneRef=${Boolean(sceneRef)}`;
    await sql`UPDATE remake_jobs SET request_id=${requestId}, status='in_progress', fidelity=${fidelity}, debug=${debug}, updated_at=now() WHERE id=${id}`;
    return NextResponse.json({ ok: true, status: "in_progress", fidelity, debug });
  } catch (e) {
    const debug = `${timing.join(" ")} total=${Date.now() - t0}ms`;
    await sql`UPDATE remake_jobs SET status='failed', error=${String(e).slice(0, 300)}, debug=${debug}, updated_at=now() WHERE id=${id}`;
    return NextResponse.json({ ok: false, status: "failed", error: String(e).slice(0, 200), debug });
  }
}

function buildPrompt(t: (typeof REMAKE_TEMPLATE_MAP)[string], product: { pname?: string; benefit?: string; concern?: string }, variation: number): string {
  return [
    `TikTok-style ${t.category} beauty product hero shot`,
    `${cams[variation % cams.length]} camera movement`,
    t.tone,
    product.pname ? `product: ${product.pname}` : "",
    product.benefit ? `emphasize ${product.benefit}` : "",
    product.concern ? `targets ${product.concern}` : "",
    `mood matching hook "${t.hookCopy}"`,
    "clean, bright, high-conversion UGC aesthetic, vertical 9:16",
    "no on-screen text, no captions, no letters or logos — clean footage only",
  ].filter(Boolean).join(", ");
}

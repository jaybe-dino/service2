import { NextResponse, after } from "next/server";
import { randomUUID } from "crypto";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { selectProvider, TIERS, type Tier } from "@/lib/remake/providers";
import { type Frame, midTime, fetchCoverFrame, fetchSceneFrames } from "@/lib/remake/frames";
import { hasImageEdit, editProductSwap } from "@/lib/remake/imageedit";
import { REMAKE_TEMPLATE_MAP, mockViralScore } from "@/data/ktrend/remake-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Product { pname?: string; benefit?: string; concern?: string; url?: string }
interface Options { lang?: string; length?: number; aiPerson?: boolean; brandColor?: string; tier?: Tier }
interface Scene { time?: string; roleKo?: string; shot?: string; action?: string }

const cams = ["subtle push-in", "slow orbit", "gentle handheld sway", "smooth tilt-up reveal"];

// 템플릿 구조 + 제품 정보 → 이미지→영상 모션 프롬프트. 변형별로 카메라 무빙을 달리함.
function buildPrompt(t: (typeof REMAKE_TEMPLATE_MAP)[string], product: Product, variation: number): string {
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
  ]
    .filter(Boolean)
    .join(", ");
}

const NEGATIVE = "any on-screen text, captions, subtitles, words, letters, numbers, hashtags, hex color codes, gibberish typography, distorted lettering, logos, watermark, UI overlays, real celebrity likeness, copyrighted audio, exaggerated or false efficacy claims";

export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const body = (await req.json().catch(() => ({}))) as {
    templateId?: string;
    image?: string;
    product?: Product;
    options?: Options;
    promptBase?: string;
    scoreSeed?: string;
    tier?: Tier;
    sceneMode?: boolean;
    scenes?: Scene[];
    refTiktokUrl?: string;
  };
  const t = body.templateId ? REMAKE_TEMPLATE_MAP[body.templateId] : undefined;
  const seed = body.scoreSeed || body.templateId || "remake";
  const promptBase = typeof body.promptBase === "string" && body.promptBase.trim() ? body.promptBase.trim() : "";
  if (!t && !promptBase) return NextResponse.json({ error: "템플릿 또는 프롬프트가 필요합니다." }, { status: 400 });

  const product = body.product || {};
  const options = body.options || {};
  const tier: Tier = TIERS.includes(body.tier as Tier) ? (body.tier as Tier)
    : TIERS.includes(options.tier as Tier) ? (options.tier as Tier) : "hd";
  const count = Math.max(1, Math.min(4, Number(process.env.REMAKE_MAX_VARIATIONS ?? 2)));

  const provider = selectProvider();

  // 이미지 파싱(base64) — gemini는 직접 사용, higgsfield는 공개 URL 필요.
  let imageBase64 = "";
  let imageMime = "image/png";
  if (typeof body.image === "string" && body.image.startsWith("data:")) {
    const m = body.image.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (m) { imageMime = m[1]; imageBase64 = m[2]; }
  }

  // 실제 생성은 provider가 mock이 아니고 제품 이미지가 있을 때만. (공개 URL은 빠른 단일 insert)
  let imageUrl: string | null = null;
  const canReal = provider.id !== "mock" && Boolean(imageBase64);
  if (canReal && provider.needsPublicImageUrl) {
    const assetId = randomUUID();
    await sql`INSERT INTO remake_assets (id, mime, data) VALUES (${assetId}, ${imageMime}, ${imageBase64})`;
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      (req.headers.get("host") ? `https://${req.headers.get("host")}` : "");
    imageUrl = `${origin}/api/remake/asset/${assetId}`;
  }
  const real = canReal && (!provider.needsPublicImageUrl || Boolean(imageUrl));
  const usedProvider = real ? provider.id : "mock";

  // 장면별 정밀 모드. 비용·타임아웃 가드: 클립 수 상한(REMAKE_MAX_SCENES, 기본 1).
  const maxScenes = Math.max(1, Math.min(6, Number(process.env.REMAKE_MAX_SCENES ?? 1)));
  const allScenes = Array.isArray(body.scenes) ? body.scenes : [];
  const scenes = allScenes.slice(0, maxScenes);
  const sceneMode = Boolean(body.sceneMode) && scenes.length > 0;
  const unitCount = sceneMode ? scenes.length : count;
  const hasRef = typeof body.refTiktokUrl === "string" && /tiktok\.com/.test(body.refTiktokUrl);
  const refUrl = body.refTiktokUrl as string;
  const canEdit = real && !provider.needsPublicImageUrl && Boolean(imageBase64) && hasImageEdit();

  // 장면별 프롬프트(구조 유사도↑, 제품 정체성 유지, 원본과 비주얼/음원 구분).
  function scenePrompt(idx: number): string {
    const s = scenes[idx] || {};
    const head = promptBase ? `${promptBase}\n\n` : `${t ? buildPrompt(t, product, idx) : ""}\n\n`;
    return `${head}SCENE ${idx + 1}/${scenes.length} — reproduce this exact beat of the reference:
- timing: ${s.time || `${idx + 1}`}
- role: ${s.roleKo || ""}
- shot/camera: ${s.shot || cams[idx % cams.length]}
- action: ${s.action || ""}
Match the reference's framing, camera movement and pacing for THIS scene faithfully (high structure similarity). Keep the product identity (label, color, shape) consistent across scenes. Use distinct visuals/audio from any original clip. Vertical 9:16, photorealistic.
‼ NO on-screen text of any kind — no captions, words, letters, numbers, hashtags, hex color codes, logos or UI. Clean footage only (captions are added later in post).`;
  }

  // 1) 잡 행을 즉시 생성(status=in_progress, request_id=NULL) → 클라이언트는 바로 폴링 시작.
  //    무거운 작업(프레임 취득·제품 스왑 편집·제출)은 응답 후 after()에서 처리 → 504 방지.
  const jobs: { id: string; variation: number }[] = [];
  for (let v = 0; v < unitCount; v++) {
    const id = randomUUID();
    const score = mockViralScore(seed, v).total;
    await sql`INSERT INTO remake_jobs (id, provider, template_id, variation, score, status)
      VALUES (${id}, ${usedProvider}, ${seed}, ${v}, ${score}, 'in_progress')`;
    jobs.push({ id, variation: v });
  }

  // 2) 응답 후 백그라운드: 프레임 → 제품 스왑 편집 → 제출 → 각 잡 행 업데이트.
  if (real) {
    after(async () => {
      try {
        const timestamps = scenes.map((s, idx) => midTime(s.time, idx));
        const [refFrame, sceneFrames] = await Promise.all([
          hasRef ? fetchCoverFrame(refUrl) : Promise.resolve(null),
          hasRef && sceneMode ? fetchSceneFrames(refUrl, timestamps) : Promise.resolve([] as (Frame | null)[]),
        ]);
        const usedSceneFrames = sceneFrames.some(Boolean);
        const refNote = (refFrame || usedSceneFrames)
          ? `\n\n[REFERENCE-TO-VIDEO] 첫 번째 입력 이미지는 레퍼런스 영상의${usedSceneFrames ? " 이 장면(timestamp) 실제 프레임" : " 실제 프레임"}입니다. 그 장면의 시각 스타일·구도·프레이밍·카메라 앵글·조명·색감·질감 디테일을 최대한 살려 유사하게 따르세요(똑같이 복제가 아니라 디테일을 살린 유사 재현). 두 번째 입력 이미지는 내 제품입니다 — 같은 룩을 유지하되 화면의 제품만 내 제품으로 교체하세요. 레퍼런스의 글자·로고·특정 인물은 복제 금지.`
          : "";

        await Promise.all(jobs.map(async ({ id, variation: v }) => {
          try {
            const sceneRef = sceneFrames[v] || refFrame; // 씬별 프레임 우선, 없으면 커버 프레임
            let inputB64 = imageBase64;
            let inputMime = imageMime;
            let edited = false;
            if (canEdit && sceneRef) {
              const sc = scenes[v] || {};
              const sw = await editProductSwap(
                { b64: sceneRef.b64, mime: sceneRef.mime },
                { b64: imageBase64, mime: imageMime },
                `${sc.roleKo || ""} ${sc.action || ""}`.trim(),
              );
              if (sw) { inputB64 = sw.b64; inputMime = sw.mime; edited = true; }
            }
            const prompt = edited
              ? `Animate this vertical 9:16 image into a short realistic clip with subtle, natural motion for a "${scenes[v]?.roleKo || "beauty"}" short-form beat${scenes[v]?.action ? ` (${scenes[v]!.action})` : ""}. Keep the product and composition exactly as in the image; do not change the scene, product or add elements. Photorealistic. NO on-screen text, captions, letters, numbers, hashtags, logos or UI.`
              : (sceneMode
                ? scenePrompt(v)
                : promptBase
                ? `${promptBase}\n\nVARIATION ${v + 1}: ${cams[v % cams.length]} camera movement.`
                : buildPrompt(t!, product, v)) + refNote;

            const { requestId } = await provider.submit({
              prompt, tier, imageUrl: imageUrl || undefined, imageBase64: inputB64, imageMime: inputMime,
              refImageBase64: edited ? undefined : sceneRef?.b64, refImageMime: edited ? undefined : sceneRef?.mime,
              negativePrompt: NEGATIVE,
            });
            await sql`UPDATE remake_jobs SET request_id=${requestId}, fidelity=${edited ? "productSwap" : usedSceneFrames ? "perScene" : refFrame ? "cover" : "text"}, updated_at=now() WHERE id=${id}`;
          } catch (e) {
            await sql`UPDATE remake_jobs SET status='failed', error=${String(e).slice(0, 300)}, updated_at=now() WHERE id=${id}`;
          }
        }));
      } catch (e) {
        // 준비 자체 실패 → 아직 제출 안 된(request_id NULL) 잡을 실패 처리.
        const msg = String(e).slice(0, 200);
        await sql`UPDATE remake_jobs SET status='failed', error=${msg}, updated_at=now()
          WHERE id = ANY(${jobs.map((j) => j.id) as unknown as string}) AND request_id IS NULL`;
      }
    });
  }

  // 예상 정밀도(백그라운드 확정 전 표시용). 실제 결과는 status에서 fidelity로 확정.
  const expectedFidelity = canEdit && hasRef ? "productSwap"
    : hasRef && sceneMode ? "perScene"
    : hasRef ? "cover" : "text";

  return NextResponse.json({
    mode: real ? usedProvider : "mock",
    provider: real ? provider.label : "시뮬레이션",
    tier,
    sceneMode,
    fidelity: expectedFidelity,
    async: real,
    jobs,
  });
}

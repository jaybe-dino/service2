import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { selectProvider, TIERS, type Tier } from "@/lib/remake/providers";
import { REMAKE_TEMPLATE_MAP, mockViralScore } from "@/data/ktrend/remake-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Product { pname?: string; benefit?: string; concern?: string; url?: string }
interface Options { lang?: string; length?: number; aiPerson?: boolean; brandColor?: string; tier?: Tier }

// 템플릿 구조 + 제품 정보 → 이미지→영상 모션 프롬프트. 변형별로 카메라 무빙을 달리함.
function buildPrompt(
  t: (typeof REMAKE_TEMPLATE_MAP)[string],
  product: Product,
  variation: number,
): string {
  const cams = ["subtle push-in", "slow orbit", "gentle handheld sway", "smooth tilt-up reveal"];
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
    promptBase?: string;   // 콘텐츠 레퍼런스에서 만든 상세 프롬프트("프롬프트화")
    scoreSeed?: string;    // 점수 결정론용 시드
    tier?: Tier;           // 품질 티어(재생성 시 override)
    sceneMode?: boolean;   // 장면별 정밀(레퍼런스 각 화면 1:1 재현)
    scenes?: { time?: string; roleKo?: string; shot?: string; action?: string }[];
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

  // 이미지 파싱(base64) — gemini는 이걸 직접 사용, higgsfield는 공개 URL 필요.
  let imageBase64 = "";
  let imageMime = "image/png";
  if (typeof body.image === "string" && body.image.startsWith("data:")) {
    const m = body.image.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (m) { imageMime = m[1]; imageBase64 = m[2]; }
  }

  // 실제 생성은 (1) provider가 mock이 아니고 (2) 제품 이미지가 있을 때만.
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
  // higgsfield인데 공개 URL을 못 만든 경우(오리진 없음 등)만 mock 폴백.
  const real = canReal && (!provider.needsPublicImageUrl || Boolean(imageUrl));
  const usedProvider = real ? provider.id : "mock";

  const cams = ["subtle push-in", "slow orbit", "gentle handheld sway", "smooth tilt-up reveal"];

  // 장면별 정밀 모드: 레퍼런스 장면 그래프를 1:1로 재현(각 화면을 개별 생성).
  const scenes = Array.isArray(body.scenes) ? body.scenes.slice(0, 6) : [];
  const sceneMode = Boolean(body.sceneMode) && scenes.length > 0;
  const unitCount = sceneMode ? scenes.length : count;

  // 장면별 프롬프트: 해당 장면의 타이밍·카메라·동작을 그대로 따르도록 지시(구조 유사도↑),
  // 단 제품 정체성은 일관 유지하고 비주얼/음원은 원본과 구분(표면 유사도↓, 저작권 안전).
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

  const jobs: { id: string; variation: number }[] = [];
  for (let v = 0; v < unitCount; v++) {
    const id = randomUUID();
    const score = mockViralScore(seed, v).total;
    const prompt = sceneMode
      ? scenePrompt(v)
      : promptBase
      ? `${promptBase}\n\nVARIATION ${v + 1}: ${cams[v % cams.length]} camera movement.`
      : buildPrompt(t!, product, v);

    if (real) {
      try {
        const { requestId } = await provider.submit({
          prompt, tier, imageUrl: imageUrl || undefined, imageBase64, imageMime, negativePrompt: NEGATIVE,
        });
        await sql`INSERT INTO remake_jobs (id, provider, request_id, template_id, variation, score, status)
          VALUES (${id}, ${usedProvider}, ${requestId}, ${seed}, ${v}, ${score}, 'in_progress')`;
      } catch (e) {
        await sql`INSERT INTO remake_jobs (id, provider, template_id, variation, score, status, error)
          VALUES (${id}, ${usedProvider}, ${seed}, ${v}, ${score}, 'failed', ${String(e).slice(0, 300)})`;
      }
    } else {
      await sql`INSERT INTO remake_jobs (id, provider, template_id, variation, score, status)
        VALUES (${id}, 'mock', ${seed}, ${v}, ${score}, 'in_progress')`;
    }
    jobs.push({ id, variation: v });
  }

  return NextResponse.json({
    mode: real ? usedProvider : "mock",
    provider: real ? provider.label : "시뮬레이션",
    tier,
    sceneMode,
    jobs,
  });
}

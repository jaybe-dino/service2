import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { selectProvider, TIERS, type Tier } from "@/lib/remake/providers";
import { hasImageEdit } from "@/lib/remake/imageedit";
import { REMAKE_TEMPLATE_MAP, mockViralScore } from "@/data/ktrend/remake-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Product { pname?: string; benefit?: string; concern?: string; url?: string }
interface Options { lang?: string; length?: number; aiPerson?: boolean; brandColor?: string; tier?: Tier }
interface Scene { time?: string; roleKo?: string; shot?: string; action?: string; sceneImagePrompt?: string; motionPrompt?: string }

// 생성 요청 = "잡 생성 + 스펙 저장"만 (가벼움, <2s). 무거운 작업(프레임·제품 스왑·제출)은
// 클라이언트가 각 잡별로 /api/remake/process를 호출해 처리한다(잡마다 새 60s 예산 → 타임아웃 방지).
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
    concept?: string;
    talent?: string;
    setting?: string;
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

  // 제품 이미지 파싱 → 자산으로 한 번 저장(process가 base64로 읽음, higgsfield는 공개 URL 생성).
  let imageBase64 = "";
  let imageMime = "image/png";
  if (typeof body.image === "string" && body.image.startsWith("data:")) {
    const m = body.image.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (m) { imageMime = m[1]; imageBase64 = m[2]; }
  }
  const canReal = provider.id !== "mock" && Boolean(imageBase64);

  let productAssetId: string | null = null;
  let imageUrl: string | null = null;
  if (canReal) {
    productAssetId = randomUUID();
    await sql`INSERT INTO remake_assets (id, mime, data) VALUES (${productAssetId}, ${imageMime}, ${imageBase64})`;
    if (provider.needsPublicImageUrl) {
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        req.headers.get("origin") ||
        (req.headers.get("host") ? `https://${req.headers.get("host")}` : "");
      imageUrl = `${origin}/api/remake/asset/${productAssetId}`;
    }
  }
  const real = canReal && (!provider.needsPublicImageUrl || Boolean(imageUrl));
  const usedProvider = real ? provider.id : "mock";

  // 장면별 정밀 모드. 클립 수 상한(REMAKE_MAX_SCENES, 기본 1).
  const maxScenes = Math.max(1, Math.min(6, Number(process.env.REMAKE_MAX_SCENES ?? 1)));
  const allScenes = Array.isArray(body.scenes) ? body.scenes : [];
  const scenes = allScenes.slice(0, maxScenes);
  const sceneMode = Boolean(body.sceneMode) && scenes.length > 0;
  const unitCount = sceneMode ? scenes.length : count;
  const concept = typeof body.concept === "string" ? body.concept.slice(0, 600) : "";
  const talent = typeof body.talent === "string" ? body.talent.slice(0, 400) : "";
  const setting = typeof body.setting === "string" ? body.setting.slice(0, 400) : "";
  // 맥락 기반 재창조 가능 여부(내 제품을 새 장면에 합성): gemini + 이미지 편집 + 제품 이미지.
  const canCompose = real && !provider.needsPublicImageUrl && Boolean(imageBase64) && hasImageEdit();

  // 잡 행 생성(status=preparing) + 각 잡 스펙 저장. process가 이 스펙으로 실제 생성 수행.
  const jobs: { id: string; variation: number }[] = [];
  for (let v = 0; v < unitCount; v++) {
    const id = randomUUID();
    const score = mockViralScore(seed, v).total;
    const status = real ? "preparing" : "in_progress"; // mock은 상태 라우트가 경과시간으로 완료
    const spec = real
      ? JSON.stringify({
          seed, variation: v, tier, providerId: usedProvider,
          needsPublicUrl: provider.needsPublicImageUrl, imageUrl,
          productAssetId, imageMime,
          promptBase, product, concept, talent, setting,
          scene: scenes[v] || (sceneMode ? null : { action: promptBase, shot: "" }),
          scenesLen: unitCount, variationLabel: `${v + 1}`,
        })
      : null;
    await sql`INSERT INTO remake_jobs (id, provider, template_id, variation, score, status, spec)
      VALUES (${id}, ${usedProvider}, ${seed}, ${v}, ${score}, ${status}, ${spec})`;
    jobs.push({ id, variation: v });
  }

  // 예상 정밀도(process 확정 전 표시). 실제 결과는 status의 fidelity로 갱신.
  const expectedFidelity = canCompose ? "sceneCompose" : "text";

  return NextResponse.json({
    mode: real ? usedProvider : "mock",
    provider: real ? provider.label : "시뮬레이션",
    tier,
    sceneMode,
    fidelity: expectedFidelity,
    needsProcess: real,     // true면 클라이언트가 각 잡 /process 호출
    jobs,
  });
}

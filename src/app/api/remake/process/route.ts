import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { providerById, type Tier } from "@/lib/remake/providers";
import { hasImageEdit, composeScene } from "@/lib/remake/imageedit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Scene { time?: string; roleKo?: string; shot?: string; action?: string; sceneImagePrompt?: string; motionPrompt?: string }
interface Spec {
  seed: string; variation: number; tier: Tier; providerId: string;
  needsPublicUrl: boolean; imageUrl: string | null;
  productAssetId: string | null; imageMime: string;
  promptBase: string; product: { pname?: string; benefit?: string; concern?: string };
  concept?: string; talent?: string; setting?: string;
  scene: Scene | null; scenesLen: number; variationLabel?: string;
  heroJobId?: string; isHero?: boolean; // 컷 간 인물·배경 일관성용 '히어로 스틸' 공유
}

const cams = ["subtle push-in", "slow orbit", "gentle handheld sway", "smooth tilt-up reveal"];
const NEGATIVE = "any on-screen text, captions, subtitles, words, letters, numbers, hashtags, hex color codes, gibberish typography, distorted lettering, logos, watermark, UI overlays, real celebrity likeness, copyrighted audio, exaggerated or false efficacy claims";

// 맥락 기반 재창조 — 잡 하나:
//  1) 내 제품을 '새 장면(새 인물·배경)'에 합성한 스틸 생성(Nano Banana)
//  2) 그 스틸을 image-to-video로 애니메이션
// 레퍼런스 원본은 분석에서만 사용 → 생성 단계는 원본 다운로드 없음(빠름, 타임아웃 여유).
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
    const sc = spec.scene || {};
    const motion = sc.motionPrompt || sc.shot || cams[v % cams.length];

    // 제품 이미지 로드(자산).
    let imageBase64 = "";
    const imageMime = spec.imageMime || "image/png";
    if (spec.productAssetId) {
      const a = await sql<{ data: string; mime: string }>`SELECT data, mime FROM remake_assets WHERE id=${spec.productAssetId}`;
      imageBase64 = a.rows[0]?.data || "";
    }
    const base64Seed = !spec.needsPublicUrl; // gemini(Veo/Omni)면 스틸을 base64 시드로 사용 가능

    // 이 비트의 새 장면 프롬프트(분석에서 제공). 없으면 제품·맥락으로 구성.
    const sceneImagePrompt = sc.sceneImagePrompt
      || [
        spec.concept ? `Concept: ${spec.concept}.` : "",
        `Beat role: ${sc.roleKo || "product moment"}.`,
        sc.action ? `Action: ${sc.action}.` : "",
        spec.talent ? `Talent: ${spec.talent}.` : "A fresh new on-screen person.",
        spec.setting ? `Setting: ${spec.setting}.` : "A bright, clean fresh environment.",
        spec.product.pname ? `Product: ${spec.product.pname}.` : "",
        spec.product.benefit ? `Highlight: ${spec.product.benefit}.` : "",
        `Shot: ${sc.shot || "clean UGC framing"}.`,
      ].filter(Boolean).join(" ");

    // 컷 간 일관성: 히어로(첫 컷) 스틸을 자산으로 공유. 뒤 컷들은 이를 인물·배경 레퍼런스로 사용.
    const heroAssetId = spec.heroJobId ? `herostill:${spec.heroJobId}` : null;
    let hero: { b64: string; mime: string } | undefined;
    if (heroAssetId && !spec.isHero) {
      const h = await sql<{ data: string; mime: string }>`SELECT data, mime FROM remake_assets WHERE id=${heroAssetId}`;
      if (h.rows[0]?.data) hero = { b64: h.rows[0].data, mime: h.rows[0].mime || "image/png" };
    }

    // 1) 새 장면 스틸 합성(내 제품 포함, 새 인물·배경, 앞 컷과 동일 인물 유지).
    let seedB64 = imageBase64;
    let seedMime = imageMime;
    let composed = false;
    if (base64Seed && imageBase64 && hasImageEdit()) {
      const tc = Date.now();
      const still = await composeScene(
        { b64: imageBase64, mime: imageMime },
        sceneImagePrompt,
        { hero, talent: spec.talent, setting: spec.setting },
      );
      mark("compose", tc);
      if (still) {
        seedB64 = still.b64; seedMime = still.mime; composed = true;
        // 히어로 컷이면 스틸을 공유 자산으로 저장(뒤 컷들이 같은 인물·배경 참조).
        if (heroAssetId && spec.isHero) {
          await sql`INSERT INTO remake_assets (id, mime, data) VALUES (${heroAssetId}, ${seedMime}, ${seedB64})
            ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data, mime=EXCLUDED.mime, created_at=now()`;
        }
      }
    }

    // 2) 애니메이션 프롬프트 — 합성 스틸이면 "이 장면을 자연스럽게 움직이기", 아니면 텍스트 기반.
    const prompt = composed
      ? `Animate this vertical 9:16 image into a short, realistic short-form clip. Keep the person, product, composition and style of the image; add natural motion — ${motion}${sc.action ? ` conveying "${sc.action}"` : ""}. Photorealistic UGC. NO on-screen text, captions, letters, numbers, hashtags, logos or UI.`
      : [
          spec.promptBase || "",
          `A short-form vertical 9:16 beauty clip. Beat: ${sc.roleKo || "product moment"}.`,
          sc.action ? `Action: ${sc.action}.` : "",
          spec.talent ? `New person: ${spec.talent}.` : "",
          spec.setting ? `New setting: ${spec.setting}.` : "",
          spec.product.pname ? `Featuring the product ${spec.product.pname}.` : "",
          `Camera: ${motion}. Photorealistic, clean, high-conversion UGC. NO on-screen text, captions, letters, logos or UI.`,
        ].filter(Boolean).join(" ");

    // 3) 제출(image-to-video)
    const ts = Date.now();
    const provider = providerById(spec.providerId);
    const { requestId } = await provider.submit({
      prompt, tier: spec.tier, imageUrl: spec.imageUrl || undefined,
      imageBase64: seedB64, imageMime: seedMime,
      negativePrompt: NEGATIVE,
    });
    mark("submit", ts);

    const fidelity = composed ? "sceneCompose" : "text";
    const debug = `${timing.join(" ")} total=${Date.now() - t0}ms composed=${composed}`;
    await sql`UPDATE remake_jobs SET request_id=${requestId}, status='in_progress', fidelity=${fidelity}, debug=${debug}, updated_at=now() WHERE id=${id}`;
    return NextResponse.json({ ok: true, status: "in_progress", fidelity, debug });
  } catch (e) {
    const raw = String(e);
    const msg = /abort/i.test(raw)
      ? "생성 제출이 지연되어 중단됐습니다(벤더 응답 지연). 잠시 후 다시 시도하거나 티어를 낮춰보세요."
      : raw.slice(0, 300);
    const debug = `${timing.join(" ")} total=${Date.now() - t0}ms`;
    await sql`UPDATE remake_jobs SET status='failed', error=${msg}, debug=${debug}, updated_at=now() WHERE id=${id}`;
    return NextResponse.json({ ok: false, status: "failed", error: msg, debug });
  }
}

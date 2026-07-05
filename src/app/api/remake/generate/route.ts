import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { hasHiggsfield, submitImage2Video } from "@/lib/remake/higgsfield";
import { REMAKE_TEMPLATE_MAP, mockViralScore } from "@/data/ktrend/remake-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Product { pname?: string; benefit?: string; concern?: string; url?: string }
interface Options { lang?: string; length?: number; aiPerson?: boolean; brandColor?: string }

// 템플릿 구조 + 제품 정보 → 이미지→영상 모션 프롬프트. 변형별로 카메라 무빙을 달리함.
function buildPrompt(
  t: (typeof REMAKE_TEMPLATE_MAP)[string],
  product: Product,
  _options: Options,
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
  ]
    .filter(Boolean)
    .join(", ");
}

export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const body = (await req.json().catch(() => ({}))) as {
    templateId?: string;
    image?: string;
    product?: Product;
    options?: Options;
  };
  const t = body.templateId ? REMAKE_TEMPLATE_MAP[body.templateId] : undefined;
  if (!t) return NextResponse.json({ error: "템플릿을 찾을 수 없습니다." }, { status: 400 });

  const product = body.product || {};
  const options = body.options || {};
  const count = Math.max(1, Math.min(4, Number(process.env.REMAKE_MAX_VARIATIONS ?? 2)));

  // 실제 생성은 (1) 키가 있고 (2) 제품 이미지가 있을 때만. 아니면 mock.
  let imageUrl: string | null = null;
  if (hasHiggsfield() && typeof body.image === "string" && body.image.startsWith("data:")) {
    const m = body.image.match(/^data:([^;]+);base64,([\s\S]+)$/);
    if (m) {
      const assetId = randomUUID();
      await sql`INSERT INTO remake_assets (id, mime, data) VALUES (${assetId}, ${m[1]}, ${m[2]})`;
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        req.headers.get("origin") ||
        (req.headers.get("host") ? `https://${req.headers.get("host")}` : "");
      imageUrl = `${origin}/api/remake/asset/${assetId}`;
    }
  }
  const real = Boolean(imageUrl);

  const jobs: { id: string; variation: number }[] = [];
  for (let v = 0; v < count; v++) {
    const id = randomUUID();
    const score = mockViralScore(t.id, v).total;
    if (real && imageUrl) {
      try {
        const { requestId } = await submitImage2Video({ imageUrl, prompt: buildPrompt(t, product, options, v) });
        await sql`INSERT INTO remake_jobs (id, provider, request_id, template_id, variation, score, status)
          VALUES (${id}, 'higgsfield', ${requestId}, ${t.id}, ${v}, ${score}, 'in_progress')`;
      } catch (e) {
        await sql`INSERT INTO remake_jobs (id, provider, template_id, variation, score, status, error)
          VALUES (${id}, 'higgsfield', ${t.id}, ${v}, ${score}, 'failed', ${String(e).slice(0, 300)})`;
      }
    } else {
      // mock: 상태 폴링에서 경과시간으로 완료 시뮬레이션
      await sql`INSERT INTO remake_jobs (id, provider, template_id, variation, score, status)
        VALUES (${id}, 'mock', ${t.id}, ${v}, ${score}, 'in_progress')`;
    }
    jobs.push({ id, variation: v });
  }

  return NextResponse.json({ mode: real ? "higgsfield" : "mock", jobs });
}

import { NextResponse } from "next/server";
import { buildRemakePrompt, type RemakePromptPackage } from "@/data/ktrend/remake-refs";
import type { RemakeTemplate } from "@/data/ktrend/remake-templates";
import { fetchAnalysisFrames, fetchCoverFrame, type Frame } from "@/lib/remake/frames";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Claude로 레퍼런스 구조를 정교한 생성 프롬프트로 변환. 키(ANTHROPIC_API_KEY) 없으면 규칙 기반 폴백.
// 일관성을 위해 별도 SDK 없이 Messages API를 직접 호출(Higgsfield 연동과 동일 패턴).
function hasClaude(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

interface Product { pname?: string; benefit?: string; concern?: string }
interface Options { lang?: string; length?: number; aiPerson?: boolean; brandColor?: string }

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    scenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          time: { type: "string" },
          roleKo: { type: "string" },
          shot: { type: "string" },
          action: { type: "string" },
        },
        required: ["time", "roleKo", "shot", "action"],
      },
    },
    fullPrompt: { type: "string" },
    negative: { type: "string" },
  },
  required: ["headline", "scenes", "fullPrompt", "negative"],
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    template?: RemakeTemplate;
    product?: Product;
    options?: Options;
    isRef?: boolean;
    refTiktokUrl?: string;
  };
  const t = body.template;
  if (!t || !Array.isArray(t.scenes)) {
    return NextResponse.json({ error: "템플릿 정보가 필요합니다." }, { status: 400 });
  }
  const product = body.product || {};
  const options = body.options || {};

  // 규칙 기반 결과(폴백 + AI에게 주는 베이스라인)
  const base: RemakePromptPackage = buildRemakePrompt(t, product, options);
  if (!hasClaude()) {
    return NextResponse.json({ mode: "heuristic", pkg: base });
  }

  // 레퍼런스 실제 프레임(시간순 스트립) → 비전 분석 그라운딩. 워커 있으면 여러 장, 없으면 커버 1장.
  let frames: Frame[] = [];
  if (typeof body.refTiktokUrl === "string" && /tiktok\.com/.test(body.refTiktokUrl)) {
    frames = await fetchAnalysisFrames(body.refTiktokUrl);
    if (!frames.length) {
      const cover = await fetchCoverFrame(body.refTiktokUrl);
      if (cover) frames = [cover];
    }
  }

  const model = process.env.REMAKE_AI_MODEL || "claude-opus-4-8";
  const system =
    "당신은 틱톡샵 K-뷰티 숏폼 광고 영상 감독입니다. " +
    "첨부된 이미지들은 실제 레퍼런스 영상의 시간순 프레임입니다. 추측하지 말고 '보이는 대로' 정밀 분석하여, " +
    "실제 장면 전개·샷/카메라·피사체와 제품 제시 방식·구도·조명·색감·전환을 근거로 브리프를 작성하세요. " +
    "그런 다음 그 실제 스타일과 디테일을 유지하되 제품만 이 브랜드 제품으로 교체해 재구성합니다(복제가 아니라 '디테일 살린 유사 재현'). " +
    "⚠️ 영상 생성 모델은 글자를 제대로 렌더하지 못하므로, fullPrompt/scenes에 '자막·문구·hex 색상코드·로고를 화면에 넣으라'는 지시를 절대 넣지 마세요. " +
    "글자 없는 '깨끗한 실사 영상'을 지시하고, 자막/CTA는 후처리에서 합성한다고 명시하세요. " +
    "실존 인물 유사성, 저작권 음원/로고, 과장·허위 효능 표현은 배제합니다. " +
    "출력은 반드시 지정된 JSON 스키마를 따르며, scenes는 실제 프레임에서 관찰한 각 장면(시간대·역할·샷·구체 동작)을, fullPrompt는 영상 생성 모델에 그대로 전달할 상세 프롬프트를 담습니다.";

  const userMsg = [
    "레퍼런스 구조(성과 신호 포함):",
    JSON.stringify(
      {
        name: t.name,
        category: t.categoryKo,
        hookType: t.hookType,
        hookCopy: t.hookCopy,
        tone: t.tone,
        sound: t.sound,
        perf: t.perf,
        why: t.why,
        scenes: t.scenes,
      },
      null,
      2,
    ),
    "",
    "제품 정보:",
    JSON.stringify(product, null, 2),
    "",
    "생성 옵션:",
    JSON.stringify(options, null, 2),
    "",
    "참고용 규칙 기반 초안(개선의 출발점):",
    base.fullPrompt,
    "",
    frames.length
      ? `첨부된 ${frames.length}장은 이 레퍼런스 영상의 시간순 프레임입니다. 실제로 보이는 장면 전개·샷·구도·색감·제품 제시 방식을 정확히 관찰해 반영하고, 제품만 이 브랜드 제품으로 교체해 재구성하세요(복제 금지).`
      : "",
    "위를 바탕으로, 이 제품에 최적화된 구체적 생성 브리프를 스키마에 맞춰 작성하세요. " +
      "scenes는 실제 프레임에서 관찰한 각 장면의 시간대(0-2s 등)·역할(훅/발림/결과/CTA)·카메라·구체적 액션(카메라 무빙·피사체 동작)을 담습니다. " +
      "fullPrompt는 샷 리스트·톤·사운드·페이싱을 포함하되, ‼화면에 자막·문구·hex코드·로고를 넣지 말라고 명시하고 '깨끗한 실사 영상'을 지시하세요(자막은 후처리).",
  ].filter(Boolean).join("\n");

  // 비전 그라운딩: 실제 프레임(base64)들을 이미지 블록으로 함께 전달
  const content: unknown[] = [{ type: "text", text: userMsg }];
  for (const f of frames) content.push({ type: "image", source: { type: "base64", media_type: f.mime, data: f.b64 } });

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system,
        messages: [{ role: "user", content }],
        output_config: { format: { type: "json_schema", schema: RESPONSE_SCHEMA } },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ mode: "heuristic", pkg: base, warn: `AI 오류(${res.status})` });
    }
    // 응답에서 JSON 텍스트 추출
    const text: string = Array.isArray(data.content)
      ? data.content.filter((b: { type?: string }) => b.type === "text").map((b: { text?: string }) => b.text || "").join("")
      : "";
    let parsed: RemakePromptPackage | null = null;
    try {
      parsed = JSON.parse(text) as RemakePromptPackage;
    } catch {
      parsed = null;
    }
    if (!parsed || !parsed.fullPrompt || !Array.isArray(parsed.scenes)) {
      return NextResponse.json({ mode: "heuristic", pkg: base, warn: "AI 응답 파싱 실패" });
    }
    return NextResponse.json({ mode: "ai", pkg: parsed, grounded: frames.length > 0, framesUsed: frames.length });
  } catch (e) {
    return NextResponse.json({ mode: "heuristic", pkg: base, warn: String(e).slice(0, 120) });
  }
}

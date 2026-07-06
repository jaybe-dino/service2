import { NextResponse } from "next/server";
import { buildRemakePrompt, type RemakePromptPackage } from "@/data/ktrend/remake-refs";
import type { RemakeTemplate } from "@/data/ktrend/remake-templates";

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

  const model = process.env.REMAKE_AI_MODEL || "claude-opus-4-8";
  const system =
    "당신은 틱톡샵 K-뷰티 숏폼 광고 영상 감독입니다. 검증된 바이럴 레퍼런스의 '구조'만 참고해 " +
    "브랜드 제품에 맞는 매우 구체적이고 실행 가능한 영상 생성 브리프를 작성합니다. " +
    "원본을 복제하지 않고 훅·장면·카메라·톤·사운드·자막·CTA를 제품 맥락에 맞게 재구성합니다. " +
    "실존 인물 유사성, 저작권 음원/로고, 과장·허위 효능 표현은 배제합니다. " +
    "출력은 반드시 지정된 JSON 스키마를 따르며, fullPrompt는 영상 생성 모델에 그대로 전달할 상세 프롬프트입니다.";

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
    "위를 바탕으로, 이 제품에 최적화된 구체적 생성 브리프를 스키마에 맞춰 작성하세요. " +
      "scenes는 시간대(0-2s 등)·역할(훅/발림/결과/CTA)·카메라·구체적 액션을 담고, " +
      "fullPrompt는 샷 리스트·톤·사운드·자막·브랜드컬러·CTA를 포함한 실행 프롬프트로 작성합니다.",
  ].join("\n");

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
        messages: [{ role: "user", content: userMsg }],
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
    return NextResponse.json({ mode: "ai", pkg: parsed });
  } catch (e) {
    return NextResponse.json({ mode: "heuristic", pkg: base, warn: String(e).slice(0, 120) });
  }
}

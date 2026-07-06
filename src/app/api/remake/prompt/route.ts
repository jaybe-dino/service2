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

  // 프레임이 있으면 '프레임 우선' — 아키타입 구조를 넣지 않고, 실제 관찰로 씬을 새로 구성.
  const userMsg = frames.length
    ? [
        `첨부된 ${frames.length}장은 이 레퍼런스 영상의 시간순 프레임입니다(앞→뒤 순서).`,
        "이 프레임들만을 근거로 실제 영상을 분석하세요. 아래 참고 정보나 일반적 틀(훅/발림/결과/CTA)에 끼워맞추지 말고, 프레임에 실제로 보이는 대로 장면을 구성합니다:",
        "- 각 프레임에서 실제로 보이는 것: 피사체(사람/손/제품), 구도·앵글, 카메라 워크, 배경·색감·조명, 제품 노출 방식, 화면 분할/전환.",
        "- scenes: 관찰된 실제 장면 수·순서·타이밍으로 구성(억지로 4개로 맞추지 말 것). 각 scene의 shot·action은 '그 프레임에서 실제로 일어나는 일'을 구체적으로.",
        "",
        `카테고리(참고): ${t.categoryKo}`,
        "제품 정보(이 제품으로 교체):",
        JSON.stringify(product, null, 2),
        "생성 옵션:",
        JSON.stringify(options, null, 2),
        "",
        "요구사항: 위 프레임의 실제 스타일·구도·전개를 그대로 살리되(디테일 유사 재현), 화면의 제품만 내 제품으로 교체하는 생성 브리프를 작성하세요. " +
          "fullPrompt는 각 씬의 구체 샷 리스트·카메라·톤·페이싱을 담고, ‼화면에 자막·문구·hex코드·로고를 넣지 말라고 명시(깨끗한 실사 영상, 자막은 후처리). 원본의 글자/로고/특정 인물은 복제 금지.",
      ].filter(Boolean).join("\n")
    : [
        "※ 레퍼런스 실제 프레임을 확보하지 못했습니다(프레임 워커 미연결). 아래 메타데이터로 최선의 추정을 합니다.",
        "레퍼런스 구조(추정):",
        JSON.stringify({ category: t.categoryKo, hookType: t.hookType, tone: t.tone, perf: t.perf }, null, 2),
        "제품 정보:",
        JSON.stringify(product, null, 2),
        "생성 옵션:",
        JSON.stringify(options, null, 2),
        "참고 초안:",
        base.fullPrompt,
        "",
        "이 제품에 맞는 구체 생성 브리프를 작성하세요. ‼화면에 자막·문구·hex코드·로고를 넣지 말 것(깨끗한 실사 영상, 자막은 후처리).",
      ].filter(Boolean).join("\n");

  // 비전 그라운딩: 실제 프레임(base64)들을 이미지 블록으로 함께 전달. media_type은 허용값만.
  const okTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
  const normMime = (m: string) => {
    const t = (m || "").split(";")[0].trim().toLowerCase().replace("image/jpg", "image/jpeg");
    return okTypes.has(t) ? t : "image/jpeg";
  };
  const content: unknown[] = [{ type: "text", text: userMsg }];
  for (const f of frames) content.push({ type: "image", source: { type: "base64", media_type: normMime(f.mime), data: f.b64 } });

  // 구조화 출력 파라미터(output_config) 대신 "순수 JSON만 출력" 지시 + 견고한 파싱 (호환성↑).
  const jsonInstruction =
    '\n\n출력 형식: 아래 JSON 객체 하나만, 코드블록/설명 없이 순수 JSON으로 출력하세요.\n' +
    '{"headline": string, "scenes": [{"time": string, "roleKo": string, "shot": string, "action": string}], "fullPrompt": string, "negative": string}';

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
        max_tokens: 2500,
        system: system + jsonInstruction,
        messages: [{ role: "user", content }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const emsg = (data?.error?.message as string) || JSON.stringify(data).slice(0, 160);
      return NextResponse.json({ mode: "heuristic", pkg: base, warn: `AI 오류 ${res.status}: ${emsg}` });
    }
    const text: string = Array.isArray(data.content)
      ? data.content.filter((b: { type?: string }) => b.type === "text").map((b: { text?: string }) => b.text || "").join("")
      : "";
    const parsed = extractJson(text);
    if (!parsed || !parsed.fullPrompt || !Array.isArray(parsed.scenes)) {
      return NextResponse.json({ mode: "heuristic", pkg: base, warn: `AI 응답 파싱 실패: ${text.slice(0, 120)}` });
    }
    return NextResponse.json({ mode: "ai", pkg: parsed, grounded: frames.length > 0, framesUsed: frames.length });
  } catch (e) {
    return NextResponse.json({ mode: "heuristic", pkg: base, warn: String(e).slice(0, 140) });
  }
}

// 코드블록/여분 텍스트가 있어도 첫 JSON 객체를 뽑아 파싱.
function extractJson(text: string): RemakePromptPackage | null {
  if (!text) return null;
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as RemakePromptPackage;
  } catch {
    /* 계속 */
  }
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s >= 0 && e > s) {
    try {
      return JSON.parse(cleaned.slice(s, e + 1)) as RemakePromptPackage;
    } catch {
      return null;
    }
  }
  return null;
}

import { NextResponse } from "next/server";
import { buildRemakePrompt, type RemakePromptPackage } from "@/data/ktrend/remake-refs";
import type { RemakeTemplate } from "@/data/ktrend/remake-templates";
import { fetchAnalysisFrames, fetchCoverFrame, type Frame } from "@/lib/remake/frames";
import { ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { analysisFrames } from "@/lib/remake/cost";

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

  if (dbConfigured()) { try { await ensureSchema(); } catch { /* 캐시 없이 진행 */ } }

  // 레퍼런스 실제 프레임(시간순 스트립) → 비전 분석 그라운딩. 워커 있으면 여러 장, 없으면 커버 1장.
  let frames: Frame[] = [];
  if (typeof body.refTiktokUrl === "string" && /tiktok\.com/.test(body.refTiktokUrl)) {
    frames = await fetchAnalysisFrames(body.refTiktokUrl, analysisFrames()); // 비용 절약 기본 4프레임
    if (!frames.length) {
      const cover = await fetchCoverFrame(body.refTiktokUrl);
      if (cover) frames = [cover];
    }
  }

  const model = process.env.REMAKE_AI_MODEL || "claude-opus-4-8";
  const system =
    "당신은 틱톡샵 K-뷰티 숏폼 광고 '리메이크' 감독입니다. " +
    "첨부 이미지는 실제 레퍼런스 영상의 시간순 프레임입니다. 이를 정밀 분석하되, 목표는 '복제'가 아니라 '맥락 기반 재창조'입니다. " +
    "핵심 원칙: 레퍼런스의 콘텐츠 맥락(내러티브 전개·훅의 논리·제품이 문제를 해결하는 흐름·감정 아크·페이싱)만 뽑아내고, " +
    "인물·배경·스타일·소품은 '완전히 새롭게' 재설계합니다(원본 인물·장소·브랜드·로고·자막은 절대 복제 금지). " +
    "그리고 화면의 제품은 사용자의 이 제품으로 바꿉니다. 즉 '같은 이야기, 새로운 인물·환경, 내 제품'. " +
    "각 비트(scene)마다 두 개의 영어 프롬프트를 만듭니다: " +
    "(1) sceneImagePrompt — 그 비트의 '새 장면 스틸'을 만들 프롬프트. 새 인물(연령/무드/룩)과 새 환경을 구체적으로 묘사하고, 내 제품이 자연스럽게 등장하도록. " +
    "(2) motionPrompt — 그 스틸을 image-to-video로 자연스럽게 움직일 카메라·동작 묘사(과하지 않게). " +
    "⚠️ 영상/이미지 모델은 글자를 제대로 렌더하지 못하므로, 어떤 프롬프트에도 '자막·문구·hex색상·로고를 화면에 넣으라'고 하지 마세요. 자막/CTA는 후처리 합성입니다. " +
    "실존 인물 유사성, 저작권 음원/로고, 과장·허위 효능 표현은 배제합니다. " +
    "출력은 반드시 지정 JSON 스키마를 따릅니다. concept=맥락 한 줄, talent=새 인물, setting=새 환경, scenes=비트별 재창조 지시, fullPrompt=전체 요약 브리프.";

  const userMsg = frames.length
    ? [
        `첨부된 ${frames.length}장은 이 레퍼런스 영상의 시간순 프레임입니다(앞→뒤 순서).`,
        "이 프레임들을 근거로 '콘텐츠 맥락'을 정확히 분석하세요 — 무엇을 보여주고(훅), 어떤 문제/욕구를 건드리고, 제품이 어떻게 개입해 해결/변화를 주고, 어떻게 마무리(설득)하는지. 픽셀을 베끼지 말고 '의미·전개·감정'을 뽑아냅니다.",
        "그런 다음 그 맥락을 유지한 채, 인물·배경·스타일을 '완전히 새롭게' 재설계하고 화면 제품을 내 제품으로 바꾼 리메이크 브리프를 작성합니다.",
        "- concept: 이 콘텐츠가 통하는 이유(맥락)를 한 줄로.",
        "- talent/setting: 원본과 다른 '새' 인물과 환경을 구체적으로.",
        "- scenes: 관찰된 실제 비트 수·순서로(억지로 개수 맞추지 말 것). 각 비트에 roleKo(역할)·action(그 비트에서 벌어지는 일), 그리고 sceneImagePrompt(새 장면 스틸 생성 영어 프롬프트: 새 인물+새 배경+내 제품 자연 노출)·motionPrompt(스틸 애니메이션 영어 프롬프트).",
        "",
        `카테고리(참고): ${t.categoryKo}`,
        "내 제품(이 제품으로 교체·등장):",
        JSON.stringify(product, null, 2),
        "생성 옵션:",
        JSON.stringify(options, null, 2),
        "",
        "‼ 원본의 특정 인물·장소·로고·자막은 복제 금지. 모든 sceneImagePrompt는 '새 인물·새 배경'을 명시하고 내 제품을 포함하며, 화면에 글자를 넣지 말 것(깨끗한 실사, 자막은 후처리).",
      ].filter(Boolean).join("\n")
    : [
        "※ 레퍼런스 실제 프레임을 확보하지 못했습니다(프레임 워커 미연결). 아래 메타데이터로 맥락을 추정해 리메이크 브리프를 만듭니다.",
        "레퍼런스 구조(추정):",
        JSON.stringify({ category: t.categoryKo, hookType: t.hookType, tone: t.tone, perf: t.perf }, null, 2),
        "내 제품:",
        JSON.stringify(product, null, 2),
        "생성 옵션:",
        JSON.stringify(options, null, 2),
        "참고 초안:",
        base.fullPrompt,
        "",
        "맥락을 유지하되 새 인물·새 배경으로 재창조하고 내 제품을 등장시키는 브리프를 작성하세요. 각 비트에 sceneImagePrompt(새 장면 스틸)·motionPrompt 포함. ‼화면에 자막·문구·hex·로고 금지(깨끗한 실사, 자막은 후처리).",
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
    '\n\n출력 형식: 아래 JSON 객체 하나만, 코드블록/설명 없이 순수 JSON으로 출력하세요. sceneImagePrompt·motionPrompt는 영어로 작성.\n' +
    '{"headline": string, "concept": string, "talent": string, "setting": string, "scenes": [{"time": string, "roleKo": string, "shot": string, "action": string, "sceneImagePrompt": string, "motionPrompt": string}], "fullPrompt": string, "negative": string}';

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
        max_tokens: 4000,
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

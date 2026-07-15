import { NextResponse } from "next/server";
import { fetchAnalysisFrames, type Frame } from "@/lib/remake/frames";
import { ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { coerceSpec, validateReferenceSpec, type ReferenceSpec } from "@/lib/remake/spec";
import { analysisFrames } from "@/lib/remake/cost";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ① Decomposer — 레퍼런스(영상 프레임 + 메타) → ReferenceSpec(4-layer).
// 세일즈 층을 명시적으로 추출(§5 프롬프트). sales_arc 비면 실패로 간주하고 재시도(max 2).
interface Meta { categoryKo?: string; hookType?: string; tone?: string; views?: number; engagement?: number; roas?: number }

// §5 Decomposer 프롬프트 — 그대로 사용.
const SYSTEM = [
  "너는 틱톡 바이럴 광고의 '세일즈 구조 분석가'다.",
  "입력 영상(또는 프레임+카피)을 보고 아래 JSON을 채워라. 비주얼 묘사가 아니라",
  '"왜 이 영상이 전환되는가"를 최우선으로 분석한다.',
  "",
  "반드시 지킬 것:",
  "1) sales.hook_mechanism: 첫 2초가 시선을 잡는 '원리'를 한 문장으로.",
  "2) sales.sales_arc: 시청자를 구매까지 끌고 가는 감정/설득 단계를 순서대로.",
  "3) sales.proof_moment: 신뢰·구매확신을 만드는 결정적 장면.",
  "4) shots[]: 각 샷의 타이밍/샷타입/카메라/구도/on_screen_text와,",
  "   그 샷이 sales_arc의 어느 단계인지(sales_beat)를 반드시 매핑.",
  "5) 원본의 카피·얼굴·브랜드는 참고만 하고 재현 대상이 아니다(구조만 추출).",
  "",
  "출력은 지정된 JSON 스키마만. 설명·마크다운·코드펜스 금지.",
  "스키마: { ref_id, duration_sec, aspect_ratio, sales{hook_mechanism,hook_line,sales_arc[],proof_moment,cta_type,why_it_works}, " +
    "shots[{shot_no,t_start,t_end,shot_type,camera,composition,sales_beat,on_screen_text,action}], " +
    "style{avatar{gender,age_range,vibe},setting,lighting,color_grade,pacing,bgm_mood}, product_slots[{shot_no,role,needs_asset}] }",
  "shot_type ∈ {wide,medium,close-up,ecu,establishing}; camera ∈ {static,pan,dolly,handheld,push-in}.",
].join("\n");

function extractJson(text: string): unknown | null {
  if (!text) return null;
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(cleaned); } catch { /* 계속 */ }
  const s = cleaned.indexOf("{");
  const e = cleaned.lastIndexOf("}");
  if (s >= 0 && e > s) { try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return null; } }
  return null;
}

const okTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const normMime = (m: string) => {
  const t = (m || "").split(";")[0].trim().toLowerCase().replace("image/jpg", "image/jpeg");
  return okTypes.has(t) ? t : "image/jpeg";
};

async function callClaude(frames: Frame[], userText: string): Promise<string> {
  const model = process.env.REMAKE_AI_MODEL || "claude-opus-4-8";
  const content: unknown[] = [{ type: "text", text: userText }];
  for (const f of frames) content.push({ type: "image", source: { type: "base64", media_type: normMime(f.mime), data: f.b64 } });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 4000, system: SYSTEM, messages: [{ role: "user", content }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data?.error?.message as string) || `AI ${res.status}`);
  return Array.isArray(data.content)
    ? data.content.filter((b: { type?: string }) => b.type === "text").map((b: { text?: string }) => b.text || "").join("")
    : "";
}

function videoId(url: string): string {
  const m = /\/video\/(\d+)/.exec(url) || /\/(\d{8,})/.exec(url);
  return m ? m[1] : `ref-${url.slice(-8)}`;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY 미설정 — Decomposer는 비전 모델이 필요합니다." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { refTiktokUrl?: string; meta?: Meta };
  const url = typeof body.refTiktokUrl === "string" ? body.refTiktokUrl : "";
  const meta = body.meta || {};
  if (!/tiktok\.com/.test(url)) {
    return NextResponse.json({ error: "refTiktokUrl(틱톡 URL)이 필요합니다." }, { status: 400 });
  }

  if (dbConfigured()) { try { await ensureSchema(); } catch { /* 캐시 없이 진행 */ } }
  const frames = await fetchAnalysisFrames(url, analysisFrames()); // 비용 절약 기본 4프레임
  if (!frames.length) {
    return NextResponse.json({ error: "레퍼런스 프레임을 확보하지 못했습니다(프레임 워커 미연결)." }, { status: 502 });
  }

  const refId = videoId(url);
  const userText = [
    `이 ${frames.length}장은 레퍼런스 영상의 시간순 프레임입니다(앞→뒤).`,
    meta.categoryKo ? `카테고리(참고): ${meta.categoryKo}` : "",
    meta.hookType ? `훅 유형(참고): ${meta.hookType}` : "",
    (meta.views || meta.engagement || meta.roas)
      ? `성과(참고): ${JSON.stringify({ views: meta.views, engagement: meta.engagement, roas: meta.roas })}`
      : "",
    `ref_id 는 "${refId}" 로, aspect_ratio 는 세로면 "9:16" 로 채워라.`,
    "위 규칙대로 세일즈 구조를 최우선 분석해 JSON 스키마만 출력.",
  ].filter(Boolean).join("\n");

  // 검증 실패(특히 sales_arc 비면) 시 재시도(max 2회 추가).
  let lastErrors: string[] = [];
  let raw = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      raw = await callClaude(frames, attempt === 0 ? userText : `${userText}\n\n(이전 출력 문제: ${lastErrors.join("; ")}. sales 층과 각 shot의 sales_beat를 반드시 채워 다시 출력.)`);
    } catch (e) {
      return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 502 });
    }
    const parsed = extractJson(raw);
    if (parsed) {
      const spec: ReferenceSpec = coerceSpec(parsed, refId);
      if (meta.views || meta.engagement || meta.roas) spec.performance = { views: meta.views, engagement: meta.engagement, roas: meta.roas };
      const v = validateReferenceSpec(spec);
      if (v.ok) {
        return NextResponse.json({ ok: true, spec, framesUsed: frames.length, attempts: attempt + 1 });
      }
      lastErrors = v.errors;
    } else {
      lastErrors = ["JSON 파싱 실패"];
    }
  }

  return NextResponse.json({ ok: false, error: `ReferenceSpec 검증 실패(재시도 소진): ${lastErrors.join("; ")}`, raw: raw.slice(0, 400) }, { status: 422 });
}

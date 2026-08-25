import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 국가코드 → 대상 언어
const LANG: Record<string, string> = {
  US: "English", GB: "English", TH: "Thai (ภาษาไทย)", VN: "Vietnamese (Tiếng Việt)",
  MY: "Malay (Bahasa Melayu)", SG: "English", PH: "Filipino/English", ID: "Indonesian (Bahasa Indonesia)",
  JP: "Japanese (日本語)", SA: "Arabic (العربية)", AE: "Arabic (العربية)", CN: "Chinese (简体中文)", TW: "Traditional Chinese (繁體中文)",
};

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const key = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return NextResponse.json({ error: "번역 미설정: ANTHROPIC_API_KEY 를 등록하세요." }, { status: 400 });

  const b = (await req.json().catch(() => ({}))) as { text?: string; country?: string; lang?: string; subject?: boolean };
  const text = String(b.text || "").trim();
  if (!text) return NextResponse.json({ error: "text 필요" }, { status: 400 });
  const lang = b.lang || LANG[String(b.country || "").toUpperCase()] || "English";
  // remake 라우트와 동일 모델 사용(이 키에서 검증됨). -latest 별칭은 인식 안 될 수 있어 회피.
  const model = process.env.ANTHROPIC_TEXT_MODEL || process.env.REMAKE_AI_MODEL || "claude-opus-4-8";

  const system =
    "You are a professional localization expert for B2B creator-outreach emails in the K-beauty industry. " +
    "Translate the user's Korean text into the requested target language with a natural, professional and friendly business tone for that market. " +
    "Rules: preserve any template variables written as {{like_this}} EXACTLY (do not translate them); keep line breaks; " +
    "output ONLY the translated text — no preamble, notes, quotes or code fences.";
  const user = `Target language: ${lang}\nType: ${b.subject ? "email subject line" : "email body"}\n\n--- SOURCE (Korean) ---\n${text}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens: 2000, system, messages: [{ role: "user", content: user }] }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      content?: { type?: string; text?: string }[]; error?: { message?: string };
    };
    if (!res.ok) return NextResponse.json({ error: data.error?.message || `Claude HTTP ${res.status}` }, { status: 400 });
    const out = (data.content || []).filter((c) => c.type === "text").map((c) => c.text || "").join("").trim();
    if (!out) return NextResponse.json({ error: "번역 결과 없음" }, { status: 400 });
    return NextResponse.json({ translated: out, lang });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e).slice(0, 200) }, { status: 500 });
  }
}

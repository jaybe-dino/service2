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
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) return NextResponse.json({ error: "번역 미설정: GEMINI_API_KEY 를 등록하세요." }, { status: 400 });

  const b = (await req.json().catch(() => ({}))) as { text?: string; country?: string; lang?: string; subject?: boolean };
  const text = String(b.text || "").trim();
  if (!text) return NextResponse.json({ error: "text 필요" }, { status: 400 });
  const lang = b.lang || LANG[String(b.country || "").toUpperCase()] || "English";

  const model = process.env.GEMINI_TEXT_MODEL || "gemini-flash-latest";
  const prompt =
    `You are a professional localization expert for B2B creator-outreach emails in the K-beauty industry.\n` +
    `Translate the following Korean ${b.subject ? "email subject line" : "email body"} into ${lang}.\n` +
    `Rules: keep a natural, professional and friendly business tone for the target market; ` +
    `preserve any template variables written as {{like_this}} EXACTLY, do not translate them; ` +
    `keep line breaks; output ONLY the translated text with no preamble, notes or quotes.\n\n` +
    `--- SOURCE (Korean) ---\n${text}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 } }),
      },
    );
    const j = (await res.json().catch(() => ({}))) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string };
    };
    if (!res.ok) return NextResponse.json({ error: j.error?.message || `Gemini HTTP ${res.status}` }, { status: 400 });
    const out = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
    if (!out) return NextResponse.json({ error: "번역 결과 없음" }, { status: 400 });
    return NextResponse.json({ translated: out, lang });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e).slice(0, 200) }, { status: 500 });
  }
}

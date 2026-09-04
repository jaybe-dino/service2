// 공용 Claude 호출 헬퍼 — 번역·회신 초안·의도 분류·개인화 오프닝에서 공용.
const MODEL = () => process.env.ANTHROPIC_TEXT_MODEL || process.env.REMAKE_AI_MODEL || "claude-opus-4-8";

export function aiConfigured(): boolean {
  return Boolean((process.env.ANTHROPIC_API_KEY || "").trim());
}

export async function askClaude(system: string, user: string, maxTokens = 1200): Promise<{ ok: boolean; text?: string; error?: string }> {
  const key = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!key) return { ok: false, error: "ANTHROPIC_API_KEY 미설정" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL(), max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    const data = (await res.json().catch(() => ({}))) as { content?: { type?: string; text?: string }[]; error?: { message?: string } };
    if (!res.ok) return { ok: false, error: data.error?.message || `Claude HTTP ${res.status}` };
    const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text || "").join("").trim();
    return text ? { ok: true, text } : { ok: false, error: "빈 응답" };
  } catch (e) {
    return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 200) };
  }
}

// JSON 강제 응답 파서 — 코드펜스/여분 텍스트 방어
export function parseJsonLoose<T>(text: string): T | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as T; } catch { return null; }
}

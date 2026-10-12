// 공용 리드 게이트 — 가이드북과 동일한 "정보 입력 후 열람" 흐름을 다른 페이지(tiktokmarketing·retail 등)에 재사용.
// 서명 쿠키로 접근 허용(30일), 제출 시 inquiries 저장 + admin 리드훅 + (저장 성공 시) CompleteRegistration 1회.
import crypto from "node:crypto";

const SECRET = process.env.UNSUB_SECRET || process.env.SESSION_SECRET || "glovek-leadgate";

// kind(페이지)별 접근 쿠키 서명 토큰
export function makeAccessToken(kind: string, email: string): string {
  const sig = crypto.createHmac("sha256", SECRET).update(`lg:${kind}:${email}`).digest("hex").slice(0, 24);
  return Buffer.from(email).toString("base64url") + "." + sig;
}
export function verifyAccessToken(kind: string, tok: string | undefined): boolean {
  if (!tok) return false;
  const [b64, sig] = tok.split(".");
  if (!b64 || !sig) return false;
  try {
    const email = Buffer.from(b64, "base64url").toString("utf-8");
    const exp = crypto.createHmac("sha256", SECRET).update(`lg:${kind}:${email}`).digest("hex").slice(0, 24);
    return crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(sig));
  } catch { return false; }
}
export const accessCookieName = (kind: string) => `lg_${kind}`;

// 허용된 게이트 종류(경로·제목). 여기 없는 kind는 접수하지 않음.
export const GATE_PAGES: Record<string, { path: string; title: string; subtitle: string }> = {
  tiktokmarketing: {
    path: "/tiktokmarketing",
    title: "TikTok Shop<br>온보딩·마케팅 가이드",
    subtitle: "브랜드사 대상 설명자료입니다. 아래 정보를 입력하면 전체 자료를 바로 열람할 수 있습니다.",
  },
  retail: {
    path: "/retail",
    title: "글로벌 유통채널<br>바이어 리서치 DB",
    subtitle: "7개국 유통·리테일 바이어 조사 자료입니다. 아래 정보를 입력하면 전체 자료를 바로 열람할 수 있습니다.",
  },
};

export type Utm = { source: string; medium: string; campaign: string; content: string };
export const EMPTY_UTM: Utm = { source: "", medium: "", campaign: "", content: "" };
const cu = (v: unknown) => String(v ?? "").trim().slice(0, 120);
export function utmFromSearch(sp: Record<string, string | string[] | undefined>): Utm {
  const g = (k: string) => { const v = sp[k]; return cu(Array.isArray(v) ? v[0] : v); };
  return { source: g("utm_source"), medium: g("utm_medium"), campaign: g("utm_campaign"), content: g("utm_content") };
}
export const utmFromForm = (form: FormData | null): Utm => ({
  source: cu(form?.get("utm_source")), medium: cu(form?.get("utm_medium")),
  campaign: cu(form?.get("utm_campaign")), content: cu(form?.get("utm_content")),
});
export const utmMemo = (u: Utm) =>
  [u.source && `src:${u.source}`, u.medium && `med:${u.medium}`, u.campaign && `cmp:${u.campaign}`, u.content && `con:${u.content}`]
    .filter(Boolean).join("/");

// 무료 세미나 회차 — 매주 월 10:30 KST, 매주 월 09:00 KST(=월 00:00 UTC)에 다음 주로 이동. 서버 공통 계산.
export function seminarSession(now: Date = new Date()): { ymd: string; ko: string; atKst: string } {
  const t = now.getTime();
  const DAY = 86400000;
  let cand = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let i = 0; i < 14; i++) { const g = new Date(cand); if (g.getUTCDay() === 1 && cand > t) break; cand += DAY; }
  const g = new Date(cand);
  const y = g.getUTCFullYear(), m = g.getUTCMonth() + 1, d = g.getUTCDate();
  const ymd = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { ymd, ko: `${m}월 ${d}일(월) 오전 10시 30분`, atKst: `${ymd} 10:30 (Asia/Seoul)` };
}

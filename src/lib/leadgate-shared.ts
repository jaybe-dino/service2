// 리드 게이트 공용(클라이언트 안전) — crypto 등 node 전용 모듈을 쓰지 않는 순수 유틸/상수만.
// 클라이언트 컴포넌트(LeadGatePreview)와 서버 양쪽에서 import 가능.

export const GATE_PAGES: Record<string, { path: string; title: string; subtitle: string }> = {
  tiktokmarketing: {
    path: "/tiktokmarketing",
    title: "TikTok Shop<br>온보딩·마케팅 가이드",
    subtitle: "브랜드사 대상 설명자료입니다. 아래 정보를 입력하면 전체 자료를 바로 열람할 수 있습니다.",
  },
  retail: {
    path: "/retail",
    title: "7개국 오프라인 바이어 정보<br>(9,000여 매장)",
    subtitle: "미국·베트남·태국·필리핀·말레이시아·싱가포르·일본 7개국의 오프라인 유통·리테일 바이어와 9,000여 매장을 직접 조사한 비공개 자료입니다.",
  },
};

export const accessCookieName = (kind: string) => `lg_${kind}`;

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

// UTM 유입 파라미터 유틸 (클라이언트)
export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

const KEY = "glovek.utm";

export function parseUtmFromSearch(search: string): Utm {
  const p = new URLSearchParams(search);
  const u: Utm = {};
  const s = p.get("utm_source"); if (s) u.source = s;
  const m = p.get("utm_medium"); if (m) u.medium = m;
  const c = p.get("utm_campaign"); if (c) u.campaign = c;
  const ct = p.get("utm_content"); if (ct) u.content = ct;
  const t = p.get("utm_term"); if (t) u.term = t;
  return u;
}

export function hasUtm(u: Utm): boolean {
  return Boolean(u.source || u.medium || u.campaign || u.content || u.term);
}

export function getStoredUtm(): Utm {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") as Utm; } catch { return {}; }
}

// 첫 유입(first-touch) 보존: 이미 저장돼 있으면 덮어쓰지 않음
export function storeFirstTouchUtm(u: Utm): void {
  try { if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(u)); } catch { /* ignore */ }
}

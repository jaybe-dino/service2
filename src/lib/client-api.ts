// 클라이언트 → 서버 API 헬퍼. basePath 고려.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  brand: string | null;
  role: string | null;
  plan: string;
  proUntil: number;
  isPro: boolean;
}

async function jpost<T>(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

export async function apiMe(): Promise<{ configured: boolean; user: ApiUser | null }> {
  try {
    const res = await fetch(`${BASE}/api/auth/me`, { cache: "no-store" });
    if (!res.ok) return { configured: false, user: null };
    return (await res.json()) as { configured: boolean; user: ApiUser | null };
  } catch {
    return { configured: false, user: null };
  }
}

export const apiSignup = (b: { name: string; email: string; password: string; brand: string; role: string; code?: string; utm?: Record<string, string | undefined> }) =>
  jpost<{ user?: ApiUser; error?: string; promo?: { applied: boolean; trialDays?: number } }>("/api/auth/signup", b);

export const apiLogin = (b: { email: string; password: string }) =>
  jpost<{ user?: ApiUser; error?: string }>("/api/auth/login", b);

export const apiLogout = () => jpost<{ ok: boolean }>("/api/auth/logout", {});

export const apiInvite = (emails: string[]) =>
  jpost<{ invited: number; required: number; domainRejected: number; granted: boolean; user?: ApiUser }>(
    "/api/invite",
    { emails },
  );

export const apiInquiry = (b: Record<string, unknown>) => jpost<{ ok: boolean }>("/api/inquiry", b);

export async function apiBookmarks(): Promise<{ brands: string[]; influencers: string[] }> {
  try {
    const res = await fetch(`${BASE}/api/bookmarks`, { cache: "no-store" });
    if (!res.ok) return { brands: [], influencers: [] };
    return (await res.json()) as { brands: string[]; influencers: string[] };
  } catch {
    return { brands: [], influencers: [] };
  }
}

export const apiToggleBookmark = (type: "brand" | "influencer", id: string) =>
  jpost<{ active: boolean }>("/api/bookmarks", { type, id });

export interface AdminMember {
  id: string; email: string; name: string; brand: string | null;
  role: string | null; plan: string; pro_until: number; created_at: string;
}
export interface AdminInquiry {
  id: number; kind: string; user_email: string | null; created_at: string;
}

export async function apiAdminMembers(): Promise<{
  ok: boolean; members: AdminMember[]; inquiries: AdminInquiry[]; error?: string;
}> {
  try {
    const res = await fetch(`${BASE}/api/admin/members`, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, members: [], inquiries: [], error: data.error ?? `${res.status}` };
    return { ok: true, members: data.members ?? [], inquiries: data.inquiries ?? [] };
  } catch {
    return { ok: false, members: [], inquiries: [], error: "네트워크 오류" };
  }
}

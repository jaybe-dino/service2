"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { PlanId } from "@/data/ktrend/meta";
import {
  ADMIN_EMAILS,
  findAccount,
  findById,
  loadMembers,
  saveMembers,
  type Account,
} from "@/data/ktrend/accounts";
import {
  apiInvite,
  apiLogin,
  apiLogout,
  apiMe,
  apiSignup,
  type ApiUser,
} from "@/lib/client-api";

export const PASS_LIMIT = 5;
export const CLICK_LIMIT = PASS_LIMIT;

interface Quota {
  day: string;
  passes: string[];
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  brand: string;
  role: string;
  code?: string;
  utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string };
}

interface PlanState {
  user: Account | null;
  plan: PlanId;
  isPro: boolean;
  isAdmin: boolean;
  serverMode: boolean; // DB(Postgres) 연결 여부
  ready: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginAs: (accountId: string) => void;
  logout: () => Promise<void>;
  signup: (data: SignupInput) => Promise<{ ok: boolean; error?: string }>;
  invite: (emails: string[]) => Promise<{ granted: boolean; invited: number; required: number; domainRejected: number; error?: string }>;
  startTrial: (days: number) => void;
  trialMsLeft: number;
  isNameRevealed: (handle: string) => boolean;
  revealName: (handle: string) => boolean;
  isVideoOpened: (id: string) => boolean;
  openVideo: (id: string) => boolean;
  passRemaining: number;
  nameRemaining: number;
  clickRemaining: number;
}

const PlanContext = createContext<PlanState | null>(null);
const STORAGE_KEY = "ktrend.auth.accountId";
const QUOTA_KEY = "ktrend.quota";
const TRIAL_KEY = "ktrend.proUntil";

const today = () => new Date().toISOString().slice(0, 10);

function mapApiUser(u: ApiUser): Account {
  return {
    id: u.id,
    email: u.email,
    password: "",
    name: u.name,
    company: u.brand ?? "",
    brand: u.brand ?? undefined,
    role: u.role ?? undefined,
    plan: u.plan as PlanId,
    isMember: true,
    proUntil: u.proUntil,
  };
}

function loadQuota(): Quota {
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (raw) {
      const q = JSON.parse(raw) as Partial<Quota> & { names?: string[]; videos?: string[] };
      if (q.day === today()) {
        if (Array.isArray(q.passes)) return { day: q.day, passes: q.passes };
        const passes = [
          ...(q.videos ?? []).map((v) => `video:${v}`),
          ...(q.names ?? []).map((n) => `name:${n}`),
        ];
        return { day: q.day, passes };
      }
    }
  } catch {
    /* ignore */
  }
  return { day: today(), passes: [] };
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [proUntil, setProUntil] = useState<number>(0);
  const [serverMode, setServerMode] = useState(false);
  const [adminSession, setAdminSession] = useState(false); // dino 어드민 콘솔 세션
  const [ready, setReady] = useState(false);
  const quotaRef = useRef<Quota>({ day: today(), passes: [] });
  const [quota, setQuotaState] = useState<Quota>(quotaRef.current);

  const persistQuota = (q: Quota) => {
    try { localStorage.setItem(QUOTA_KEY, JSON.stringify(q)); } catch { /* ignore */ }
  };
  const commitQuota = (q: Quota) => {
    quotaRef.current = q;
    setQuotaState(q);
    persistQuota(q);
  };

  useEffect(() => {
    try {
      const id = localStorage.getItem(STORAGE_KEY);
      if (id) {
        const acc = findById(id);
        if (acc) setUser(acc); // 초기 표시용 (서버모드면 아래 apiMe가 덮어씀)
      }
      const pu = Number(localStorage.getItem(TRIAL_KEY) || 0);
      if (pu) setProUntil(pu);
    } catch { /* ignore */ }
    const q = loadQuota();
    quotaRef.current = q;
    setQuotaState(q);

    // 서버(DB) 연결 여부 확인 + 세션 복원
    apiMe().then(({ configured, user: su }) => {
      setServerMode(configured);
      if (configured) {
        // 서버모드에선 서버 세션이 진실의 원천 (클라이언트 전용 데모 복원 무시)
        if (su) {
          setUser(mapApiUser(su));
          setProUntil(su.proUntil);
        } else {
          setUser(null);
          persistUser(null);
        }
      }
      setReady(true);
    });

    // 별도 어드민 콘솔(dino) 세션이면 서비스 페이지에서 전 권한 오픈 + 블락 가능
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAdminSession(Boolean(d?.authed)))
      .catch(() => {});
  }, []);

  const persistUser = (acc: Account | null) => {
    try {
      if (acc) localStorage.setItem(STORAGE_KEY, acc.id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  };

  const applyUser = (acc: Account | null, pu?: number) => {
    setUser(acc);
    persistUser(acc);
    if (pu !== undefined) {
      setProUntil(pu);
      try { localStorage.setItem(TRIAL_KEY, String(pu)); } catch { /* ignore */ }
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    // 서버모드: 데모 계정 포함 모두 API 경유 → 실제 서버 세션 발급 (관리자 API 동작)
    if (serverMode) {
      const { ok, data } = await apiLogin({ email, password });
      if (ok && data.user) { applyUser(mapApiUser(data.user), data.user.proUntil); return true; }
      return false;
    }
    // 오프라인/데모 모드(로컬)
    const demo = findAccount(email, password);
    if (demo) { applyUser(demo); return true; }
    return false;
  };

  const loginAs = (accountId: string) => {
    const acc = findById(accountId);
    applyUser(acc ?? null);
  };

  const logout = async () => {
    setUser(null);
    persistUser(null);
    if (serverMode) { try { await apiLogout(); } catch { /* ignore */ } }
  };

  const signup = async (data: SignupInput): Promise<{ ok: boolean; error?: string }> => {
    if (serverMode) {
      const { ok, data: res } = await apiSignup(data);
      if (ok && res.user) { applyUser(mapApiUser(res.user), res.user.proUntil); return { ok: true }; }
      return { ok: false, error: res.error ?? "가입에 실패했습니다." };
    }
    // 데모 모드(로컬)
    const email = data.email.trim().toLowerCase();
    if (!email || !data.name.trim() || !data.brand.trim() || !data.password) {
      return { ok: false, error: "필수 항목을 모두 입력해 주세요." };
    }
    const members = loadMembers();
    if (members.some((m) => m.email.toLowerCase() === email)) {
      return { ok: false, error: "이미 가입된 이메일입니다." };
    }
    const acc: Account = {
      id: `m:${email}`, email, password: data.password, name: data.name.trim(),
      company: data.brand.trim(), brand: data.brand.trim(), role: data.role.trim(),
      plan: "basic", isMember: true,
    };
    saveMembers([...members, acc]);
    applyUser(acc);
    return { ok: true };
  };

  const invite = async (emails: string[]) => {
    if (serverMode) {
      const { ok, data } = await apiInvite(emails);
      if (ok) {
        if (data.user) applyUser(mapApiUser(data.user), data.user.proUntil);
        return { granted: data.granted, invited: data.invited, required: data.required, domainRejected: data.domainRejected };
      }
      return { granted: false, invited: 0, required: 3, domainRejected: 0, error: "초대 처리 실패" };
    }
    // 데모: 같은 도메인 3명 이상이면 Pro 7일
    const myDomain = user?.email.split("@")[1]?.toLowerCase() ?? "";
    const valid = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => /.+@.+\..+/.test(e) && e !== user?.email)));
    const same = valid.filter((e) => e.split("@")[1] === myDomain);
    const domainRejected = valid.length - same.length;
    let granted = false;
    if (same.length >= 3) { startTrial(7); granted = true; }
    return { granted, invited: same.length, required: 3, domainRejected };
  };

  const startTrial = (days: number) => {
    const until = Date.now() + days * 86_400_000;
    setProUntil(until);
    try { localStorage.setItem(TRIAL_KEY, String(until)); } catch { /* ignore */ }
  };

  const plan: PlanId = user?.plan ?? "basic";
  const effectiveProUntil = serverMode ? (user?.proUntil ?? 0) : proUntil;
  const trialActive = effectiveProUntil > Date.now();
  const isAdmin = adminSession || (!!user && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  // 어드민은 서비스 전 영역 권한 오픈
  const isPro = plan === "pro" || plan === "enterprise" || trialActive || isAdmin;
  const trialMsLeft = trialActive ? effectiveProUntil - Date.now() : 0;

  const currentQuota = (): Quota => {
    const q = quotaRef.current;
    return q.day === today() ? q : { day: today(), passes: [] };
  };
  const consume = (key: string): boolean => {
    if (isPro) return true;
    const q = currentQuota();
    if (q.passes.includes(key)) return true;
    if (q.passes.length >= PASS_LIMIT) return false;
    commitQuota({ ...q, passes: [...q.passes, key] });
    return true;
  };

  const isNameRevealed = (handle: string) => isPro || currentQuota().passes.includes(`name:${handle}`);
  const revealName = (handle: string) => consume(`name:${handle}`);
  const isVideoOpened = (id: string) => isPro || currentQuota().passes.includes(`video:${id}`);
  const openVideo = (id: string) => consume(`video:${id}`);

  const liveQuota = quota.day === today() ? quota : { day: today(), passes: [] };
  const passRemaining = isPro ? Infinity : Math.max(0, PASS_LIMIT - liveQuota.passes.length);

  return (
    <PlanContext.Provider
      value={{
        user, plan, isPro, isAdmin, serverMode, ready,
        login, loginAs, logout, signup, invite, startTrial, trialMsLeft,
        isNameRevealed, revealName, isVideoOpened, openVideo,
        passRemaining, nameRemaining: passRemaining, clickRemaining: passRemaining,
      }}
    >
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanState {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}

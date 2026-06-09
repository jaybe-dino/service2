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
}

interface PlanState {
  user: Account | null;
  plan: PlanId;
  isPro: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => boolean;
  loginAs: (accountId: string) => void;
  logout: () => void;
  signup: (data: SignupInput) => { ok: boolean; error?: string };
  startTrial: (days: number) => void;
  trialMsLeft: number;
  ready: boolean;
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
  const [ready, setReady] = useState(false);
  const quotaRef = useRef<Quota>({ day: today(), passes: [] });
  const [quota, setQuotaState] = useState<Quota>(quotaRef.current);

  const persistQuota = (q: Quota) => {
    try {
      localStorage.setItem(QUOTA_KEY, JSON.stringify(q));
    } catch {
      /* ignore */
    }
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
        if (acc) setUser(acc);
      }
      const pu = Number(localStorage.getItem(TRIAL_KEY) || 0);
      if (pu) setProUntil(pu);
    } catch {
      /* ignore */
    }
    const q = loadQuota();
    quotaRef.current = q;
    setQuotaState(q);
    setReady(true);
  }, []);

  const persistUser = (acc: Account | null) => {
    try {
      if (acc) localStorage.setItem(STORAGE_KEY, acc.id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const login = (email: string, password: string) => {
    const acc = findAccount(email, password);
    if (!acc) return false;
    setUser(acc);
    persistUser(acc);
    return true;
  };

  const loginAs = (accountId: string) => {
    const acc = findById(accountId);
    setUser(acc);
    persistUser(acc);
  };

  const logout = () => {
    setUser(null);
    persistUser(null);
  };

  const signup = (data: SignupInput): { ok: boolean; error?: string } => {
    const email = data.email.trim().toLowerCase();
    if (!email || !data.name.trim() || !data.brand.trim() || !data.password) {
      return { ok: false, error: "필수 항목을 모두 입력해 주세요." };
    }
    const members = loadMembers();
    if (members.some((m) => m.email.toLowerCase() === email)) {
      return { ok: false, error: "이미 가입된 이메일입니다." };
    }
    const acc: Account = {
      id: `m:${email}`,
      email,
      password: data.password,
      name: data.name.trim(),
      company: data.brand.trim(),
      brand: data.brand.trim(),
      role: data.role.trim(),
      plan: "basic",
      isMember: true,
    };
    saveMembers([...members, acc]);
    setUser(acc);
    persistUser(acc);
    return { ok: true };
  };

  const startTrial = (days: number) => {
    const until = Date.now() + days * 86_400_000;
    setProUntil(until);
    try {
      localStorage.setItem(TRIAL_KEY, String(until));
    } catch {
      /* ignore */
    }
  };

  const plan: PlanId = user?.plan ?? "basic";
  const trialActive = proUntil > Date.now();
  const isPro = plan === "pro" || plan === "enterprise" || trialActive;
  const isAdmin = !!user && ADMIN_EMAILS.includes(user.email.toLowerCase());
  const trialMsLeft = trialActive ? proUntil - Date.now() : 0;

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
        user,
        plan,
        isPro,
        isAdmin,
        login,
        loginAs,
        logout,
        signup,
        startTrial,
        trialMsLeft,
        ready,
        isNameRevealed,
        revealName,
        isVideoOpened,
        openVideo,
        passRemaining,
        nameRemaining: passRemaining,
        clickRemaining: passRemaining,
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

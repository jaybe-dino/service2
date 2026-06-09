"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { PlanId } from "@/data/ktrend/meta";
import { DEMO_ACCOUNTS, findAccount, type Account } from "@/data/ktrend/accounts";

// Basic 일일 한도
export const NAME_LIMIT = 20; // 계정 이름 공개
export const CLICK_LIMIT = 20; // 콘텐츠 링크 클릭 전환

interface Quota {
  day: string;
  names: string[]; // 공개한 핸들
  videos: string[]; // 클릭 전환한 영상 id
}

interface PlanState {
  user: Account | null;
  plan: PlanId;
  isPro: boolean;
  login: (email: string, password: string) => boolean;
  loginAs: (accountId: string) => void;
  logout: () => void;
  ready: boolean;
  // 계정 이름 게이팅
  isNameRevealed: (handle: string) => boolean;
  revealName: (handle: string) => boolean; // 성공 여부
  nameRemaining: number; // Infinity = 무제한
  // 콘텐츠 링크 클릭 전환 게이팅
  isVideoOpened: (id: string) => boolean;
  openVideo: (id: string) => boolean; // 허용 여부(허용 시 기록)
  clickRemaining: number;
}

const PlanContext = createContext<PlanState | null>(null);
const STORAGE_KEY = "ktrend.auth.accountId";
const QUOTA_KEY = "ktrend.quota";

const today = () => new Date().toISOString().slice(0, 10);

function loadQuota(): Quota {
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (raw) {
      const q = JSON.parse(raw) as Quota;
      if (q.day === today()) return q;
    }
  } catch {
    /* ignore */
  }
  return { day: today(), names: [], videos: [] };
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [quota, setQuota] = useState<Quota>({ day: today(), names: [], videos: [] });

  useEffect(() => {
    try {
      const id = localStorage.getItem(STORAGE_KEY);
      if (id) {
        const acc = DEMO_ACCOUNTS.find((a) => a.id === id);
        if (acc) setUser(acc);
      }
    } catch {
      /* ignore */
    }
    setQuota(loadQuota());
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

  const persistQuota = (q: Quota) => {
    try {
      localStorage.setItem(QUOTA_KEY, JSON.stringify(q));
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
    const acc = DEMO_ACCOUNTS.find((a) => a.id === accountId) ?? null;
    setUser(acc);
    persistUser(acc);
  };

  const logout = () => {
    setUser(null);
    persistUser(null);
  };

  const plan: PlanId = user?.plan ?? "basic";
  const isPro = plan === "pro" || plan === "enterprise";

  // 날짜 경계 보정
  const freshQuota = (): Quota => (quota.day === today() ? quota : { day: today(), names: [], videos: [] });

  const isNameRevealed = (handle: string) => isPro || freshQuota().names.includes(handle);

  const revealName = (handle: string) => {
    if (isPro) return true;
    const q = freshQuota();
    if (q.names.includes(handle)) return true;
    if (q.names.length >= NAME_LIMIT) return false;
    const next = { ...q, names: [...q.names, handle] };
    setQuota(next);
    persistQuota(next);
    return true;
  };

  const isVideoOpened = (id: string) => isPro || freshQuota().videos.includes(id);

  const openVideo = (id: string) => {
    if (isPro) return true;
    const q = freshQuota();
    if (q.videos.includes(id)) return true;
    if (q.videos.length >= CLICK_LIMIT) return false;
    const next = { ...q, videos: [...q.videos, id] };
    setQuota(next);
    persistQuota(next);
    return true;
  };

  const nameRemaining = isPro ? Infinity : Math.max(0, NAME_LIMIT - quota.names.length);
  const clickRemaining = isPro ? Infinity : Math.max(0, CLICK_LIMIT - quota.videos.length);

  return (
    <PlanContext.Provider
      value={{
        user,
        plan,
        isPro,
        login,
        loginAs,
        logout,
        ready,
        isNameRevealed,
        revealName,
        nameRemaining,
        isVideoOpened,
        openVideo,
        clickRemaining,
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

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
import { DEMO_ACCOUNTS, findAccount, type Account } from "@/data/ktrend/accounts";

// 비구매자 하루 열람권 한도 — 콘텐츠 링크 열람과 계정 이름 공개가 공통으로 차감
export const PASS_LIMIT = 5;
export const CLICK_LIMIT = PASS_LIMIT; // 하위 호환 별칭

interface Quota {
  day: string;
  passes: string[]; // 소비 토큰: `video:<id>` 또는 `name:<handle>`
}

interface PlanState {
  user: Account | null;
  plan: PlanId;
  isPro: boolean;
  login: (email: string, password: string) => boolean;
  loginAs: (accountId: string) => void;
  logout: () => void;
  ready: boolean;
  // 계정 이름 게이팅 (열람권 공통 차감)
  isNameRevealed: (handle: string) => boolean;
  revealName: (handle: string) => boolean;
  // 콘텐츠 링크 클릭 전환 게이팅 (열람권 공통 차감)
  isVideoOpened: (id: string) => boolean;
  openVideo: (id: string) => boolean;
  // 남은 열람권 (Infinity = 무제한). nameRemaining/clickRemaining은 동일 값(공통 풀)
  passRemaining: number;
  nameRemaining: number;
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
      const q = JSON.parse(raw) as Partial<Quota> & { names?: string[]; videos?: string[] };
      if (q.day === today()) {
        if (Array.isArray(q.passes)) return { day: q.day, passes: q.passes };
        // 구버전(names/videos 분리) 마이그레이션
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
  const [ready, setReady] = useState(false);
  // 열람권은 ref로 동기 관리(렌더 배칭 stale-closure 방지) + state로 UI 갱신
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
        const acc = DEMO_ACCOUNTS.find((a) => a.id === id);
        if (acc) setUser(acc);
      }
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

  // 읽기 전용: 커밋 없이 ref에서 최신값 동기 조회 (날짜 지나면 빈 풀로 간주)
  const currentQuota = (): Quota => {
    const q = quotaRef.current;
    return q.day === today() ? q : { day: today(), passes: [] };
  };

  const consume = (key: string): boolean => {
    if (isPro) return true;
    const q = currentQuota();
    if (q.passes.includes(key)) return true; // 이미 사용한 항목은 무료
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
        login,
        loginAs,
        logout,
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

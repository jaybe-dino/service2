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

interface AuthState {
  user: Account | null;
  plan: PlanId;
  isPro: boolean; // Pro 이상(유료) 여부
  login: (email: string, password: string) => boolean;
  loginAs: (accountId: string) => void;
  logout: () => void;
  ready: boolean; // localStorage 복원 완료 여부
}

const PlanContext = createContext<AuthState | null>(null);
const STORAGE_KEY = "ktrend.auth.accountId";

export function PlanProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);

  // 새로고침 후에도 로그인 유지
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
    setReady(true);
  }, []);

  const persist = (acc: Account | null) => {
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
    persist(acc);
    return true;
  };

  const loginAs = (accountId: string) => {
    const acc = DEMO_ACCOUNTS.find((a) => a.id === accountId) ?? null;
    setUser(acc);
    persist(acc);
  };

  const logout = () => {
    setUser(null);
    persist(null);
  };

  const plan: PlanId = user?.plan ?? "basic";
  const isPro = plan === "pro" || plan === "enterprise";

  return (
    <PlanContext.Provider value={{ user, plan, isPro, login, loginAs, logout, ready }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): AuthState {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}

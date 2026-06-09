"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { PlanId } from "@/data/ktrend/meta";

interface PlanState {
  plan: PlanId;
  setPlan: (p: PlanId) => void;
  isPro: boolean; // Pro 이상(유료) 여부
}

const PlanContext = createContext<PlanState | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  // 데모: 기본 Basic(무료) — 지표 블러 처리 확인용. 헤더에서 토글.
  const [plan, setPlan] = useState<PlanId>("basic");
  const isPro = plan === "pro" || plan === "enterprise";
  return (
    <PlanContext.Provider value={{ plan, setPlan, isPro }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanState {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within PlanProvider");
  return ctx;
}

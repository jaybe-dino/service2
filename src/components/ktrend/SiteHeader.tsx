"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { usePlan } from "./PlanContext";
import type { PlanId } from "@/data/ktrend/meta";

const NAV = [
  { href: "/explorer", label: "콘텐츠 탐색" },
  { href: "/influencers", label: "인플루언서 DB" },
  { href: "/reports", label: "성장 리포트" },
  { href: "/viral", label: "바이럴 감지" },
  { href: "/plans", label: "요금제" },
];

const PLAN_CYCLE: PlanId[] = ["basic", "pro", "enterprise"];
const PLAN_LABEL: Record<PlanId, string> = {
  basic: "Basic (무료)",
  pro: "Pro",
  enterprise: "Enterprise",
};

export default function SiteHeader() {
  const pathname = usePathname();
  const { plan, setPlan, isPro } = usePlan();

  const cyclePlan = () => {
    const i = PLAN_CYCLE.indexOf(plan);
    setPlan(PLAN_CYCLE[(i + 1) % PLAN_CYCLE.length]);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1480px] items-center gap-6 px-4">
        <Link href="/explorer" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
            <Sparkles size={16} />
          </span>
          <span className="text-[15px] font-black tracking-tight">
            K-Trend<span className="text-[var(--accent)]"> Analytics</span>
          </span>
          <span className="kt-badge-brand ml-1">v6.0</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  active
                    ? "bg-[var(--accent-light)] text-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={cyclePlan}
            title="데모: 플랜을 전환하면 유료 지표 잠금이 해제됩니다"
            className={`kt-btn px-3 py-1.5 text-[11px] ${
              isPro ? "kt-btn-primary" : "kt-btn-outline"
            }`}
          >
            현재 플랜: {PLAN_LABEL[plan]}
          </button>
        </div>
      </div>
    </header>
  );
}

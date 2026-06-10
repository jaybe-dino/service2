"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, Sparkles, Bookmark } from "lucide-react";
import { usePlan } from "./PlanContext";
import type { PlanId } from "@/data/ktrend/meta";

const NAV = [
  { href: "/explorer", label: "콘텐츠 탐색" },
  { href: "/influencers", label: "인플루언서 DB" },
  { href: "/reports", label: "브랜드" },
  { href: "/plans", label: "요금제" },
];

const PLAN_LABEL: Record<PlanId, string> = {
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};
const PLAN_COLOR: Record<PlanId, string> = {
  basic: "#64748b",
  pro: "#1A56DB",
  enterprise: "#7C3AED",
};

export default function SiteHeader() {
  const pathname = usePathname();
  const { user, plan, logout, isPro, passRemaining } = usePlan();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1480px] items-center gap-6 px-4">
        <Link href="/explorer" className="flex items-center gap-2">
          <span className="kt-grad-bg flex h-7 w-7 items-center justify-center rounded-lg text-white">
            <Sparkles size={16} />
          </span>
          <span className="text-[16px] font-black tracking-tight kt-grad-text">Glovek</span>
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
          {user && !isPro && (
            <span className="hidden rounded-md bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700 sm:inline">
              오늘 열람권 {passRemaining}건 남음
            </span>
          )}
          {user ? (
            <>
              <Link href="/saved" title="저장됨" className="kt-btn kt-btn-outline px-2 py-1.5 text-[11px]">
                <Bookmark size={13} />
              </Link>
              <Link
                href="/mypage"
                className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                style={{ background: PLAN_COLOR[plan] }}
                title="마이페이지"
              >
                {PLAN_LABEL[plan]}
              </Link>
              <Link href="/mypage" className="hidden text-right leading-tight sm:block">
                <div className="text-[11px] font-bold hover:text-[var(--accent)]">{user.name}</div>
                <div className="text-[9px] text-[var(--muted)]">{user.company}</div>
              </Link>
              <button
                onClick={logout}
                title="로그아웃"
                className="kt-btn kt-btn-outline px-2.5 py-1.5 text-[11px]"
              >
                <LogOut size={13} /> 로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]">
                <LogIn size={13} /> 로그인
              </Link>
              <Link href="/signup" className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

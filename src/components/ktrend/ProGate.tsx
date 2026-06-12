"use client";

import Link from "next/link";
import { Lock, LogIn, Check } from "lucide-react";
import { usePlan } from "./PlanContext";

// Pro 전용 게이트: 비Pro/비로그인은 실루엣 + 전환 시 열람 가능한 기능 설명 업셀
export default function ProGate({
  children,
  label = "이 페이지",
  features,
}: {
  children: React.ReactNode;
  label?: string;
  features?: string[];
}) {
  const { isPro, user, ready } = usePlan();

  // 세션 복원 전엔 깜빡임 방지로 그대로 렌더
  if (!ready || isPro) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[7px] saturate-50 opacity-70" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex items-start justify-center bg-white/30 pt-20">
        <div className="kt-card sticky top-24 max-w-sm p-6 text-center shadow-xl">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full kt-grad-bg text-white">
            <Lock size={22} />
          </span>
          <h2 className="mt-3 text-[16px] font-black">{label}는 Pro 전용입니다</h2>
          <p className="mt-1.5 text-[12px] text-[var(--muted)]">
            Pro로 전환하면 아래 기능을 모두 열람할 수 있어요.
          </p>
          {features && features.length > 0 && (
            <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-left">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[12px]">
                  <Check size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/plans" className="kt-btn kt-btn-primary px-5 py-2 text-[12px]">Pro로 업그레이드</Link>
            {!user && (
              <Link href="/login" className="kt-btn kt-btn-outline px-5 py-2 text-[12px]">
                <LogIn size={13} /> 로그인
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

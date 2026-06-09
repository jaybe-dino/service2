"use client";

import Link from "next/link";
import { Ticket, Infinity as InfinityIcon, LogIn } from "lucide-react";
import { usePlan, CLICK_LIMIT } from "./PlanContext";

// 상단 열람권 표기 바
export default function ViewPassBar() {
  const { user, isPro, clickRemaining } = usePlan();

  if (isPro) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-light)] px-3 py-2 text-[12px]">
        <InfinityIcon size={15} className="text-[var(--accent)]" />
        <span className="font-semibold text-[var(--accent)]">열람권 무제한</span>
        <span className="text-[var(--muted)]">— 모든 콘텐츠를 제한 없이 열람할 수 있어요.</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
        <Ticket size={15} />
        <span className="font-semibold">로그인하면 하루 열람권 {CLICK_LIMIT}건이 제공됩니다</span>
        <Link href="/login" className="kt-btn kt-btn-primary ml-auto px-3 py-1 text-[11px]">
          <LogIn size={12} /> 로그인
        </Link>
      </div>
    );
  }

  const used = CLICK_LIMIT - clickRemaining;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[12px]">
      <Ticket size={15} className="text-[var(--accent)]" />
      <span className="font-semibold">오늘 열람권</span>
      <span className="font-black text-[var(--accent)]">{clickRemaining}</span>
      <span className="text-[var(--muted)]">/ {CLICK_LIMIT} 남음</span>
      {/* 진행 게이지 */}
      <span className="ml-1 hidden h-1.5 w-28 overflow-hidden rounded bg-slate-100 sm:inline-block">
        <span
          className="block h-full bg-[var(--accent)]"
          style={{ width: `${(used / CLICK_LIMIT) * 100}%` }}
        />
      </span>
      {clickRemaining === 0 && (
        <Link href="/plans" className="kt-btn kt-btn-primary ml-auto px-3 py-1 text-[11px]">
          Pro로 무제한
        </Link>
      )}
    </div>
  );
}

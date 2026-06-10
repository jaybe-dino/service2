"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Lock, LogIn } from "lucide-react";
import BrandAvatar from "./BrandAvatar";
import { usePlan } from "./PlanContext";

// 계정 이름 게이팅: 비구매자는 열람권(하루 5건, 콘텐츠 열람과 공통)에서 차감.
// 공개 후 핸들은 내부 인플루언서 상세(/influencer/<handle>)로 연결.

export default function CreatorName({
  handle,
  avatarSize = 22,
  className = "",
}: {
  handle: string;
  avatarSize?: number;
  className?: string;
}) {
  const { user, isNameRevealed, revealName, nameRemaining } = usePlan();
  const router = useRouter();
  const [, force] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const revealed = isNameRevealed(handle);

  const noCtx = (e: React.MouseEvent) => e.preventDefault();

  if (revealed) {
    return (
      <span className={`flex items-center gap-1.5 ${className}`}>
        <BrandAvatar name={handle} size={avatarSize} />
        <Link
          href={`/influencer/${handle}`}
          className="truncate text-[11px] font-semibold hover:text-[var(--accent)]"
          title="인플루언서 상세 보기"
        >
          @{handle}
        </Link>
      </span>
    );
  }

  const handleReveal = () => {
    if (!user) {
      router.push("/login"); // 비로그인: 무조건 로그인
      return;
    }
    if (revealName(handle)) force((n) => n + 1);
    else setBlocked(true);
  };

  return (
    <span className={`flex items-center gap-1.5 ${className}`} onContextMenu={noCtx}>
      {/* 마스킹 시 핸들을 DOM에 노출하지 않음 (중립 아바타) */}
      <span
        aria-hidden
        style={{ width: avatarSize, height: avatarSize }}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-white"
      >
        ?
      </span>
      <span className="select-none truncate text-[11px] font-semibold text-slate-400">@••••••</span>
      {blocked ? (
        <Link href="/plans" className="ml-auto flex items-center gap-0.5 rounded bg-[var(--fg)]/85 px-1.5 py-0.5 text-[8px] font-bold text-white">
          <Lock size={9} /> Pro
        </Link>
      ) : (
        <button
          onClick={handleReveal}
          className="ml-auto flex items-center gap-0.5 rounded border border-[var(--accent)] px-1.5 py-0.5 text-[8px] font-bold text-[var(--accent)] hover:bg-[var(--accent-light)]"
          title={user ? `오늘 남은 열람권 ${nameRemaining}건` : "로그인 후 이용"}
        >
          {user ? <Eye size={9} /> : <LogIn size={9} />} 이름 보기
        </button>
      )}
    </span>
  );
}

"use client";

import Link from "next/link";
import BrandAvatar from "./BrandAvatar";
import { usePlan } from "./PlanContext";

// 계정 이름 게이팅(테스트2): 로그인하면 공개 + 틱톡/상세 이동, 비로그인은 실루엣.
export default function CreatorName({
  handle,
  avatarSize = 22,
  className = "",
}: {
  handle: string;
  avatarSize?: number;
  className?: string;
}) {
  const { user, isAdmin } = usePlan();
  const revealed = Boolean(user) || isAdmin;

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

  // 비로그인: 핸들을 DOM에 노출하지 않음 (중립 아바타 + 실루엣)
  return (
    <span className={`flex items-center gap-1.5 ${className}`} onContextMenu={(e) => e.preventDefault()}>
      <span
        aria-hidden
        style={{ width: avatarSize, height: avatarSize }}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-300 text-[10px] font-bold text-white"
      >
        ?
      </span>
      <span className="select-none truncate text-[11px] font-semibold text-slate-400">@••••••</span>
    </span>
  );
}

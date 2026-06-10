"use client";

import Link from "next/link";
import BrandAvatar from "./BrandAvatar";
import { usePlan } from "./PlanContext";

// 계정 이름 게이팅: Pro 이상만 공개(핸들 → /influencer/<handle>), 그 외는 실루엣 마스킹.
export default function CreatorName({
  handle,
  avatarSize = 22,
  className = "",
}: {
  handle: string;
  avatarSize?: number;
  className?: string;
}) {
  const { isNameRevealed } = usePlan();
  const revealed = isNameRevealed(handle);

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

  // 마스킹: 핸들을 DOM에 노출하지 않음 (중립 아바타 + 실루엣)
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

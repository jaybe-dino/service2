"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Lock } from "lucide-react";
import BrandAvatar from "./BrandAvatar";
import { usePlan } from "./PlanContext";

// 계정 이름 게이팅: Basic은 하루 20개까지 공개. 공개 전에는 마스킹 + href 미노출 + 우클릭 차단.
function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function CreatorName({
  handle,
  avatarSize = 22,
  className = "",
}: {
  handle: string;
  avatarSize?: number;
  className?: string;
}) {
  const { isNameRevealed, revealName, nameRemaining } = usePlan();
  const [, force] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const revealed = isNameRevealed(handle);

  const noCtx = (e: React.MouseEvent) => e.preventDefault();

  if (revealed) {
    return (
      <span className={`flex items-center gap-1.5 ${className}`} onContextMenu={noCtx}>
        <BrandAvatar name={handle} size={avatarSize} />
        <button
          onClick={() => openExternal(`https://www.tiktok.com/@${handle}`)}
          className="truncate text-[11px] font-semibold hover:text-[var(--accent)]"
          title="틱톡 프로필 열기"
        >
          @{handle}
        </button>
      </span>
    );
  }

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
          onClick={() => {
            if (revealName(handle)) force((n) => n + 1);
            else setBlocked(true);
          }}
          className="ml-auto flex items-center gap-0.5 rounded border border-[var(--accent)] px-1.5 py-0.5 text-[8px] font-bold text-[var(--accent)] hover:bg-[var(--accent-light)]"
          title={`오늘 남은 이름 공개 ${nameRemaining}회`}
        >
          <Eye size={9} /> 이름 보기
        </button>
      )}
    </span>
  );
}

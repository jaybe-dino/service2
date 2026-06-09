"use client";

import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import { usePlan } from "./PlanContext";
import { useBookmarks, type BookmarkType } from "./BookmarkContext";

// 로그인 시에만 북마크 가능 (비로그인 클릭 시 로그인 유도)
export default function BookmarkButton({
  type,
  id,
  label = false,
  size = 14,
  className = "",
}: {
  type: BookmarkType;
  id: string;
  label?: boolean;
  size?: number;
  className?: string;
}) {
  const { user } = usePlan();
  const { has, toggle } = useBookmarks();
  const router = useRouter();
  const active = !!user && has(type, id);

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    toggle(type, id);
  };

  return (
    <button
      onClick={onClick}
      title={active ? "북마크 해제" : "북마크"}
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-semibold transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      } ${className}`}
    >
      <Bookmark size={size} fill={active ? "currentColor" : "none"} />
      {label && (active ? "저장됨" : "북마크")}
    </button>
  );
}

"use client";

import Link from "next/link";
import { Bookmark, LogIn } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import BrandAvatar from "@/components/ktrend/BrandAvatar";
import BookmarkButton from "@/components/ktrend/BookmarkButton";
import CreatorName from "@/components/ktrend/CreatorName";
import { usePlan } from "@/components/ktrend/PlanContext";
import { useBookmarks } from "@/components/ktrend/BookmarkContext";
import { BRAND_MAP } from "@/data/ktrend/brands";
import { INFLUENCER_MAP } from "@/data/ktrend/influencers";
import { TIERS } from "@/data/ktrend/meta";
import { fmtCompact } from "@/data/ktrend/content";

export default function SavedPage() {
  const { user } = usePlan();
  const { brands, influencers } = useBookmarks();

  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <Bookmark className="mx-auto text-[var(--muted)]" />
          <h1 className="mt-3 text-[18px] font-black">저장된 항목</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">로그인하면 관심 브랜드·인플루언서를 저장할 수 있어요.</p>
          <Link href="/login" className="kt-btn kt-btn-primary mt-4 px-5 py-2 text-[12px]"><LogIn size={14} /> 로그인</Link>
        </div>
      </PageShell>
    );
  }

  const savedBrands = brands.map((id) => BRAND_MAP[id]).filter(Boolean);
  const savedInfs = influencers.map((h) => INFLUENCER_MAP[h]).filter(Boolean);

  return (
    <PageShell>
      <h1 className="mb-1 flex items-center gap-2 text-[20px] font-black tracking-tight">
        <Bookmark size={18} className="text-[var(--accent)]" /> 저장된 항목
      </h1>
      <p className="mb-5 text-[12px] text-[var(--muted)]">관심 브랜드와 인플루언서를 모아봤어요.</p>

      {/* 브랜드 */}
      <h2 className="mb-2 text-[13px] font-bold">브랜드 ({savedBrands.length})</h2>
      {savedBrands.length ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {savedBrands.map((b) => (
            <div key={b.id} className="kt-card flex items-center gap-3 p-4">
              <BrandAvatar name={b.name} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold">{b.name}</div>
                <div className="text-[10px] text-[var(--muted)]">영상 {b.videos} · 누적 {fmtCompact(b.totalViews)}</div>
              </div>
              <BookmarkButton type="brand" id={b.id} size={13} />
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-6 rounded-md bg-slate-50 px-3 py-3 text-[11px] text-[var(--muted)]">
          저장한 브랜드가 없습니다. 콘텐츠 카드의 북마크 아이콘으로 저장하세요.
        </p>
      )}

      {/* 인플루언서 */}
      <h2 className="mb-2 text-[13px] font-bold">인플루언서 ({savedInfs.length})</h2>
      {savedInfs.length ? (
        <div className="kt-card divide-y divide-[var(--border)]">
          {savedInfs.map((inf) => (
            <div key={inf.handle} className="flex items-center gap-3 p-3">
              <CreatorName handle={inf.handle} avatarSize={26} className="min-w-0 flex-1" />
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: TIERS[inf.tier].color }}>
                {TIERS[inf.tier].label}
              </span>
              <span className="text-[10px] text-[var(--muted)]">{fmtCompact(inf.totalViews)}</span>
              <BookmarkButton type="influencer" id={inf.handle} size={13} />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-md bg-slate-50 px-3 py-3 text-[11px] text-[var(--muted)]">
          저장한 인플루언서가 없습니다. 인플루언서 DB에서 북마크하세요.
        </p>
      )}
    </PageShell>
  );
}

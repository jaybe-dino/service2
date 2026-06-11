"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Lock, ExternalLink, Send, Sparkles, Ban } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import BrandAvatar from "@/components/ktrend/BrandAvatar";
import BookmarkButton from "@/components/ktrend/BookmarkButton";
import ContentCard from "@/components/ktrend/ContentCard";
import InquiryModal from "@/components/ktrend/InquiryModal";
import { usePlan } from "@/components/ktrend/PlanContext";
import { INFLUENCER_MAP } from "@/data/ktrend/influencers";
import { BRAND_MAP } from "@/data/ktrend/brands";
import { TIERS, tierOf } from "@/data/ktrend/meta";
import { loadContent, sortContent, fmtCompact, type Content } from "@/data/ktrend/content";

export default function InfluencerDetailPage() {
  const { handle } = useParams<{ handle: string }>();
  const { user, isPro } = usePlan();
  const [content, setContent] = useState<Content[] | null>(null);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    loadContent().then(setContent);
    fetch("/api/admin/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setIsAdmin(Boolean(d?.authed)))
      .catch(() => {});
  }, []);

  const blockInfluencer = async () => {
    if (!confirm(`@${handle} 를 블락하시겠습니까?\n수집·노출이 모두 차단되고 기존 수집분도 제거됩니다.`)) return;
    const r = await fetch("/api/admin/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "handle", value: handle, reason: "wrong-tagging" }),
    });
    if (r.ok) setBlocked(true);
  };

  const items = useMemo(
    () => (content ? sortContent(content.filter((c) => c.influencerId === handle), "views") : []),
    [content, handle],
  );

  const info = useMemo(() => {
    const known = INFLUENCER_MAP[handle];
    if (known) return known;
    if (!items.length) return null;
    const totalViews = items.reduce((s, c) => s + c.views, 0);
    const avg = Math.round(totalViews / items.length);
    return {
      handle, videos: items.length, totalViews, avgViews: avg, tier: tierOf(avg),
      brands: Array.from(new Set(items.map((c) => BRAND_MAP[c.brandId]?.name).filter(Boolean) as string[])).slice(0, 8),
    };
  }, [handle, items]);

  // 유료 게이트
  if (!isPro) {
    return (
      <PageShell>
        <Link href="/influencers" className="mb-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--accent)]">
          <ArrowLeft size={13} /> 인플루언서
        </Link>
        <div className="kt-card mx-auto max-w-md p-8 text-center">
          <Lock className="mx-auto text-[var(--accent)]" />
          <h1 className="mt-3 text-[18px] font-black">@{handle}</h1>
          <p className="mt-2 text-[12px] text-[var(--muted)]">
            인플루언서 상세 프로필과 업로드한 콘텐츠 연계 분석은 <b className="text-[var(--accent)]">유료(Pro)</b> 기능입니다.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/plans" className="kt-btn kt-btn-primary px-5 py-2 text-[12px]">Pro 보기</Link>
            {!user && <Link href="/login" className="kt-btn kt-btn-outline px-5 py-2 text-[12px]">로그인</Link>}
          </div>
        </div>
      </PageShell>
    );
  }

  if (!content) {
    return (
      <PageShell>
        <div className="flex items-center justify-center gap-2 py-24 text-[var(--muted)]"><Loader2 className="animate-spin" size={16} /> 로딩…</div>
      </PageShell>
    );
  }

  if (!info) {
    return (
      <PageShell>
        <div className="py-20 text-center">
          <p className="text-[14px] font-semibold">@{handle} 콘텐츠를 찾을 수 없습니다.</p>
          <Link href="/influencers" className="kt-btn kt-btn-primary mt-3 px-4 py-2 text-[12px]">인플루언서</Link>
        </div>
      </PageShell>
    );
  }

  const tier = TIERS[info.tier];

  return (
    <PageShell>
      <Link href="/influencers" className="mb-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--accent)]">
        <ArrowLeft size={13} /> 인플루언서
      </Link>

      {/* 프로필 헤더 */}
      <div className="mb-4 flex flex-wrap items-center gap-3 kt-card p-4">
        <BrandAvatar name={handle} size={48} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-black tracking-tight">@{handle}</h1>
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: tier.color }}>{tier.label}</span>
          </div>
          <p className="text-[11px] text-[var(--muted)]">{tier.range}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <BookmarkButton type="influencer" id={handle} label size={14} />
          <button onClick={() => setProposeOpen(true)} className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]"><Send size={13} /> 제안 보내기</button>
          <a href={`https://www.tiktok.com/@${handle}`} target="_blank" rel="noreferrer noopener" className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]"><ExternalLink size={13} /> 틱톡</a>
          {isAdmin && (
            <button
              onClick={blockInfluencer}
              disabled={blocked}
              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-600 disabled:opacity-50"
            >
              <Ban size={13} /> {blocked ? "블락됨" : "블락 (수집·노출 차단)"}
            </button>
          )}
        </div>
      </div>
      {blocked && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-600">
          이 인플루언서는 블락되었습니다. 다음 배포/새로고침부터 전 영역에서 제외됩니다.
        </div>
      )}

      {/* 스탯 */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "업로드 콘텐츠", v: `${info.videos}` },
          { l: "누적 조회수", v: fmtCompact(info.totalViews) },
          { l: "평균 조회수", v: fmtCompact(info.avgViews) },
          { l: "협업 브랜드", v: `${info.brands.length}` },
        ].map((s) => (
          <div key={s.l} className="kt-card p-4">
            <div className="text-[11px] text-[var(--muted)]">{s.l}</div>
            <div className="mt-1 text-[20px] font-black text-[var(--accent)]">{s.v}</div>
          </div>
        ))}
      </div>

      {/* 협업 브랜드 */}
      <div className="mb-4 kt-card p-4">
        <h3 className="mb-2 text-[13px] font-bold">협업 브랜드</h3>
        <div className="flex flex-wrap gap-1.5">
          {info.brands.map((b) => (
            <span key={b} className="kt-badge-brand">{b}</span>
          ))}
        </div>
      </div>

      {/* 업로드한 콘텐츠 연계 */}
      <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-bold">
        <Sparkles size={14} className="text-[var(--accent)]" /> 업로드한 콘텐츠 ({items.length})
      </h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {items.slice(0, 24).map((c) => (
          <ContentCard key={c.id} content={c} />
        ))}
      </div>

      {proposeOpen && (
        <InquiryModal kind="proposal" context={`@${handle}`} onClose={() => setProposeOpen(false)} />
      )}
    </PageShell>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Play, Eye, Lock, LogIn, TrendingUp, Share2, Sparkles } from "lucide-react";
import CreatorName from "./CreatorName";
import ContentAnalysisModal from "./ContentAnalysisModal";
import BookmarkButton from "./BookmarkButton";
import { usePlan, CLICK_LIMIT } from "./PlanContext";
import { BRAND_MAP } from "@/data/ktrend/brands";
import { CATEGORY_MAP, TIERS } from "@/data/ktrend/meta";
import { fmtCompact, fmtUSD, type Content } from "@/data/ktrend/content";

// --- TikTok oEmbed 썸네일: 뷰포트 진입 시 지연 로드 + 캐시 (실패 시 그라데이션 폴백) ---
const thumbCache = new Map<string, string | null>();
const thumbInflight = new Map<string, Promise<string | null>>();

function fetchThumb(url: string): Promise<string | null> {
  if (thumbCache.has(url)) return Promise.resolve(thumbCache.get(url) ?? null);
  if (thumbInflight.has(url)) return thumbInflight.get(url)!;
  try {
    const cached = sessionStorage.getItem(`tt:${url}`);
    if (cached !== null) {
      const v = cached || null;
      thumbCache.set(url, v);
      return Promise.resolve(v);
    }
  } catch {
    /* 무시 */
  }
  const p = fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { thumbnail_url?: string } | null) => {
      const t = j?.thumbnail_url ?? null;
      thumbCache.set(url, t);
      try {
        sessionStorage.setItem(`tt:${url}`, t ?? "");
      } catch {
        /* 무시 */
      }
      return t;
    })
    .catch(() => {
      thumbCache.set(url, null);
      return null;
    })
    .finally(() => thumbInflight.delete(url));
  thumbInflight.set(url, p);
  return p;
}

function useThumbnail(url: string, ref: React.RefObject<HTMLElement | null>): string | null {
  const [thumb, setThumb] = useState<string | null>(() => thumbCache.get(url) ?? null);
  useEffect(() => {
    const cached = thumbCache.get(url);
    if (cached) {
      setThumb(cached);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      fetchThumb(url).then(setThumb);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          fetchThumb(url).then(setThumb);
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [url, ref]);
  return thumb;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--accent-light)]/60 px-2 py-1.5">
      <div className="text-[9px] font-medium text-[var(--muted)]">{label}</div>
      <div className="text-[13px] font-bold text-[var(--fg)]">{value}</div>
    </div>
  );
}

export default function ContentCard({ content }: { content: Content }) {
  const { user, openVideo, isVideoOpened } = usePlan();
  const router = useRouter();
  const brand = BRAND_MAP[content.brandId];
  const tier = TIERS[content.tier];
  const cat = CATEGORY_MAP[content.category];

  const mediaRef = useRef<HTMLDivElement | null>(null);
  const thumb = useThumbnail(content.tiktokUrl, mediaRef);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const handleOpen = () => {
    if (!user) {
      // 비로그인: 무조건 로그인 유도
      router.push("/login");
      return;
    }
    if (openVideo(content.id)) {
      window.open(content.tiktokUrl, "_blank", "noopener,noreferrer");
    } else {
      setBlocked(true);
    }
  };

  const opened = isVideoOpened(content.id);

  return (
    <article className="kt-card group flex flex-col overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
      {/* 9:16 미디어 — href 미노출, 클릭 시 쿼터 확인 후 새 탭 열기 */}
      <div
        ref={mediaRef}
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleOpen()}
        className="relative block aspect-[9/16] cursor-pointer select-none overflow-hidden"
        style={{
          background: `linear-gradient(160deg, hsl(${content.hue} 65% 52%), hsl(${(content.hue + 50) % 360} 60% 38%))`,
        }}
      >
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            loading="lazy"
            draggable={false}
            referrerPolicy="no-referrer"
            onLoad={() => setLoaded(true)}
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          />
        )}

        <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1">
          <span className="kt-badge-tiktok">TikTok</span>
          {content.isShop && (
            <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[8px] font-bold text-white">SHOP</span>
          )}
          {content.isAd && (
            <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[8px] font-bold text-black">#ad</span>
          )}
        </div>
        {content.viralScore >= 80 && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <TrendingUp size={9} /> {content.viralScore}
          </span>
        )}

        {/* 차단 안내 / 로그인 유도 / 호버 재생 */}
        {blocked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/65 p-3 text-center">
            <Lock size={20} className="text-white" />
            <p className="text-[10px] font-semibold leading-snug text-white">
              오늘 무료 열람권({CLICK_LIMIT}건)을 모두 사용했어요
            </p>
            <Link href="/plans" className="kt-btn kt-btn-primary px-3 py-1.5 text-[10px]">
              Pro로 무제한 열람
            </Link>
          </div>
        ) : !user ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[var(--accent)] shadow-lg">
              <LogIn size={18} />
            </span>
            <span className="rounded bg-black/55 px-2 py-0.5 text-[9px] font-semibold text-white">로그인하고 열람</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
              <Play size={20} className="ml-0.5" fill="currentColor" />
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-[10px] font-semibold text-white">
          <span className="flex items-center gap-0.5"><Eye size={11} /> {fmtCompact(content.views)}</span>
          <span className="flex items-center gap-0.5"><Heart size={11} /> {fmtCompact(content.likes)}</span>
          <span className="flex items-center gap-0.5"><MessageCircle size={11} /> {fmtCompact(content.comments)}</span>
          <span className="flex items-center gap-0.5"><Share2 size={11} /> {fmtCompact(content.shares)}</span>
        </div>
      </div>

      {/* 카드 바디 — 성과 지표는 전체 공개 */}
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <div className="flex items-center gap-1.5">
          <Link href={`/brand/${content.brandId}`} className="kt-badge-brand hover:underline">{brand?.name ?? "Brand"}</Link>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
            {cat?.icon} {cat?.nameKo}
          </span>
          <BookmarkButton type="brand" id={content.brandId} size={11} className="ml-auto !px-1 !py-0.5" />
        </div>

        {/* 크리에이터 (계정 이름 게이팅) */}
        <div className="flex items-center gap-1.5">
          <CreatorName handle={content.influencerId} className="min-w-0 flex-1" />
          <span className="rounded px-1.5 py-0.5 text-[8px] font-bold text-white" style={{ background: tier.color }}>
            {tier.label}
          </span>
        </div>

        {/* 2x2 성과 지표 (전체 공개) */}
        <div className="mt-0.5 grid grid-cols-2 gap-1.5">
          <Metric label="수수료율 (추정)" value={`${content.commissionRate}%`} />
          <Metric label="추정 ROAS" value={`${content.estRoasX}x`} />
          <Metric label="추정 매출" value={fmtUSD(content.estRevenueUSD)} />
          <Metric label="참여율" value={`${content.engagementRate}%`} />
        </div>

        <button
          onClick={() => setShowAnalysis(true)}
          className="kt-btn kt-btn-outline mt-0.5 w-full py-1.5 text-[10px]"
        >
          <Sparkles size={11} /> 후킹·소구점 분석
        </button>

        {opened && (
          <p className="text-[8px] font-medium text-emerald-600">✓ 오늘 열람한 콘텐츠</p>
        )}
      </div>

      {showAnalysis && (
        <ContentAnalysisModal content={content} onClose={() => setShowAnalysis(false)} />
      )}
    </article>
  );
}

"use client";

import { Heart, MessageCircle, Play, Eye, Lock, TrendingUp, Share2 } from "lucide-react";
import BrandAvatar from "./BrandAvatar";
import { usePlan } from "./PlanContext";
import { BRAND_MAP } from "@/data/ktrend/brands";
import { CATEGORY_MAP, TIERS } from "@/data/ktrend/meta";
import { fmtCompact, fmtUSD, type Content } from "@/data/ktrend/content";

function Metric({ label, value, locked }: { label: string; value: string; locked: boolean }) {
  return (
    <div className="rounded-md bg-[var(--accent-light)]/60 px-2 py-1.5">
      <div className="text-[9px] font-medium text-[var(--muted)]">{label}</div>
      <div className={`text-[13px] font-bold text-[var(--fg)] ${locked ? "kt-locked" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export default function ContentCard({ content }: { content: Content }) {
  const { isPro } = usePlan();
  const brand = BRAND_MAP[content.brandId];
  const tier = TIERS[content.tier];
  const cat = CATEGORY_MAP[content.category];

  return (
    <article className="kt-card group flex flex-col overflow-hidden">
      {/* 9:16 틱톡 임베드 썸네일 (실제 영상으로 이동) */}
      <a
        href={content.tiktokUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="relative block aspect-[9/16] overflow-hidden"
        style={{
          background: `linear-gradient(160deg, hsl(${content.hue} 65% 52%), hsl(${(content.hue + 50) % 360} 60% 38%))`,
        }}
      >
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

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
            <Play size={20} className="ml-0.5" fill="currentColor" />
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-[10px] font-semibold text-white">
          <span className="flex items-center gap-0.5"><Eye size={11} /> {fmtCompact(content.views)}</span>
          <span className="flex items-center gap-0.5"><Heart size={11} /> {fmtCompact(content.likes)}</span>
          <span className="flex items-center gap-0.5"><MessageCircle size={11} /> {fmtCompact(content.comments)}</span>
          <span className="flex items-center gap-0.5"><Share2 size={11} /> {fmtCompact(content.shares)}</span>
        </div>
      </a>

      {/* 카드 바디 */}
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="kt-badge-brand">{brand?.name ?? "Brand"}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
            {cat?.icon} {cat?.nameKo}
          </span>
          <span className="ml-auto text-[9px] text-[var(--muted)]">{content.date}</span>
        </div>

        {/* 크리에이터 */}
        <div className="flex items-center gap-1.5">
          <BrandAvatar name={content.influencerId} size={22} />
          <a
            href={`https://www.tiktok.com/@${content.influencerId}`}
            target="_blank"
            rel="noreferrer noopener"
            className="truncate text-[11px] font-semibold hover:text-[var(--accent)]"
          >
            @{content.influencerId}
          </a>
          <span
            className="ml-auto rounded px-1.5 py-0.5 text-[8px] font-bold text-white"
            style={{ background: tier.color }}
          >
            {tier.label}
          </span>
        </div>

        {/* 2x2 수익화 지표 그리드 */}
        <div className="relative mt-0.5 grid grid-cols-2 gap-1.5">
          <Metric label="수수료율 (추정)" value={`${content.commissionRate}%`} locked={!isPro} />
          <Metric label="추정 ROAS" value={`${content.estRoasX}x`} locked={!isPro} />
          <Metric label="추정 매출" value={fmtUSD(content.estRevenueUSD)} locked={!isPro} />
          <Metric label="참여율" value={`${content.engagementRate}%`} locked={false} />

          {!isPro && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/30">
              <span className="flex items-center gap-1 rounded-full bg-[var(--fg)]/85 px-2.5 py-1 text-[9px] font-bold text-white">
                <Lock size={10} /> Pro 가입 후 확인
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

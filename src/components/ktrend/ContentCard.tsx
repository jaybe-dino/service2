"use client";

import { Heart, MessageCircle, Play, Eye, Lock, TrendingUp } from "lucide-react";
import BrandAvatar from "./BrandAvatar";
import { usePlan } from "./PlanContext";
import { BRAND_MAP } from "@/data/ktrend/brands";
import { INFLUENCER_MAP } from "@/data/ktrend/influencers";
import { CONTENT_STYLE_MAP, COUNTRY_MAP, TIERS } from "@/data/ktrend/meta";
import { fmtCompact, fmtUSD, type Content } from "@/data/ktrend/content";

function Metric({
  label,
  value,
  locked,
}: {
  label: string;
  value: string;
  locked: boolean;
}) {
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
  const inf = INFLUENCER_MAP[content.influencerId];
  const country = COUNTRY_MAP[content.country];
  const tier = TIERS[inf.tier];
  const style = CONTENT_STYLE_MAP[content.style];

  return (
    <article className="kt-card group flex flex-col overflow-hidden">
      {/* 9:16 틱톡 임베드 썸네일 */}
      <a
        href={content.tiktokUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="relative block aspect-[9/16] overflow-hidden"
        style={{
          background: `linear-gradient(160deg, hsl(${content.hue} 65% 52%), hsl(${(content.hue + 50) % 360} 60% 38%))`,
        }}
      >
        {/* 상단 배지 */}
        <div className="absolute left-2 top-2 flex items-center gap-1">
          <span className="kt-badge-tiktok">TikTok</span>
          <span className="rounded bg-black/45 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur">
            {country.flag} {content.country}
          </span>
        </div>
        {content.viralScore >= 75 && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <TrendingUp size={9} /> 바이럴 {content.viralScore}
          </span>
        )}

        {/* 호버 재생 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
            <Play size={20} className="ml-0.5" fill="currentColor" />
          </span>
        </div>

        {/* 하단 스탯 오버레이 */}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-[10px] font-semibold text-white">
          <span className="flex items-center gap-1"><Eye size={11} /> {fmtCompact(content.views)}</span>
          <span className="flex items-center gap-1"><Heart size={11} /> {fmtCompact(content.likes)}</span>
          <span className="flex items-center gap-1"><MessageCircle size={11} /> {fmtCompact(content.comments)}</span>
        </div>
      </a>

      {/* 카드 바디 */}
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <div className="flex items-center gap-1.5">
          <span className="kt-badge-brand">{brand?.nameEn ?? "Brand"}</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
            {style.nameKo}
          </span>
          <span className="ml-auto text-[9px] text-[var(--muted)]">{content.subCategory}</span>
        </div>

        {/* 캡션 2줄 고정 */}
        <p className="line-clamp-2 h-[30px] text-[11px] leading-[1.35] text-[var(--fg)]">
          {content.caption}
        </p>

        {/* 크리에이터 */}
        <div className="flex items-center gap-1.5">
          <BrandAvatar name={inf.name} size={22} />
          <span className="truncate text-[11px] font-semibold">@{inf.handle}</span>
          <span
            className="ml-auto rounded px-1.5 py-0.5 text-[8px] font-bold text-white"
            style={{ background: tier.color }}
          >
            {tier.label}
          </span>
        </div>

        {/* 2x2 수익화 지표 그리드 */}
        <div className="relative mt-0.5 grid grid-cols-2 gap-1.5">
          <Metric label="수수료율" value={`${content.commissionRate}%`} locked={!isPro} />
          <Metric label="추정 ROAS" value={`${content.estRoasX}x`} locked={!isPro} />
          <Metric label="추정 매출" value={fmtUSD(content.estRevenueUSD)} locked={!isPro} />
          <Metric label="누적 조회수" value={fmtCompact(content.views)} locked={false} />

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

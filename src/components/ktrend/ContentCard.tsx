"use client";

import { Play, Heart, MessageCircle, Share2, TrendingUp, Music2 } from "lucide-react";
import { BRAND_BY_ID } from "@/data/ktrend/brands";
import { COUNTRIES, gradientFor } from "@/data/ktrend/meta";
import { formatCount, formatUsd, type ContentItem } from "@/data/ktrend/content";
import BrandAvatar from "./BrandAvatar";

const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

// id에서 결정적으로 영상 길이(15~59초) 생성
function durationFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const sec = 15 + (h % 45);
  return `0:${String(sec).padStart(2, "0")}`;
}

function roasTone(roas: number): string {
  if (roas >= 6) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (roas >= 3) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

export default function ContentCard({ item, index }: { item: ContentItem; index: number }) {
  const brand = BRAND_BY_ID[item.brandId];
  const country = COUNTRY_BY_CODE[item.country];
  const [from, to] = gradientFor(index + 3);

  return (
    <article className="group mb-3 break-inside-avoid overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
      {/* 임베디드 틱톡 플레이어 (모사) */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: `1 / ${item.aspect}`,
          backgroundImage: `linear-gradient(150deg, ${from}, ${to})`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.4),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15" />

        {item.trending && (
          <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur">
            <TrendingUp className="h-3 w-3" /> 바이럴
          </span>
        )}
        <span className="absolute right-2.5 top-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
          {country?.flag} {item.style}
        </span>

        {/* 재생 버튼 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/40 backdrop-blur transition-all duration-200 group-hover:scale-110 group-hover:bg-white/35">
            <Play className="h-6 w-6 translate-x-0.5 fill-white text-white" />
          </span>
        </div>

        {/* 영상 길이 */}
        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white tabular-nums backdrop-blur">
          {durationFor(item.id)}
        </span>

        {/* 하단 크리에이터 + 조회수 */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-2.5">
          <span className="flex items-center gap-1 text-sm font-semibold text-white drop-shadow">
            <Music2 className="h-3 w-3 opacity-80" /> @{item.creator}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-white drop-shadow">
            <Play className="h-3 w-3 fill-white" /> {formatCount(item.views)}
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-2">
          <BrandAvatar name={brand.name} index={index} size={28} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{brand.name}</p>
            <p className="truncate text-[11px] text-slate-400">{brand.nameKo} · {item.tier}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${roasTone(item.estRoas)}`}>
            {item.estRoas}x
          </span>
        </div>

        <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-slate-600">{item.caption}</p>

        <div className="mt-2.5 flex items-center gap-2.5 text-[11px] text-slate-400">
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {formatCount(item.likes)}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {formatCount(item.comments)}</span>
          <span className="flex items-center gap-1"><Share2 className="h-3.5 w-3.5" /> {formatCount(item.shares)}</span>
          <span className="ml-auto">{item.daysAgo === 0 ? "오늘" : `${item.daysAgo}일 전`}</span>
        </div>

        {/* 틱톡 샵 어필리에이트 지표 */}
        <div className="mt-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/70 p-2.5">
          <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> TikTok Shop 어필리에이트
          </div>
          <div className="grid grid-cols-3 gap-1 text-center">
            <Metric label="수수료" value={`${item.commission}%`} />
            <Metric label="기여매출" value={formatUsd(item.estRevenue)} accent />
            <Metric label="CPM" value={`$${item.estCpm}`} />
          </div>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className={`text-[13px] font-bold ${accent ? "text-rose-600" : "text-slate-800"}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-400">{label}</p>
    </div>
  );
}

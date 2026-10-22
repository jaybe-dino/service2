"use client";

import { useState } from "react";

export type UgcPlatform = "tiktok" | "instagram" | "drive";
export interface UgcItem { id: string; url: string; platform: UgcPlatform; handle: string | null; thumb: string | null; caption: string | null }

const META: Record<UgcPlatform, { label: string; grad: string }> = {
  tiktok: { label: "TikTok", grad: "from-[#121016] to-[#2c2733]" },
  instagram: { label: "Instagram", grad: "from-[#2a1526] to-[#3b1b2d]" },
  drive: { label: "영상", grad: "from-slate-700 to-slate-900" },
};

function PlayGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" fill="currentColor" />
    </svg>
  );
}

// 캡처가 있는 대표 카드(크게)
export function UgcCard({ item }: { item: UgcItem }) {
  const [broken, setBroken] = useState(false);
  const m = META[item.platform];
  const label = item.handle ? "@" + item.handle : "원본 영상";
  const showImg = !!item.thumb && !broken;
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-2xl border border-[var(--border)] bg-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
      aria-label={`${m.label} 레퍼런스 영상 원본 보기${item.handle ? " (@" + item.handle + ")" : ""}`}>
      <div className={`relative flex aspect-[9/16] w-full items-center justify-center bg-gradient-to-br ${m.grad}`}>
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumb!} alt={`${label} 레퍼런스 영상`} loading="lazy"
            onError={() => setBroken(true)}
            className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex flex-col items-center gap-2.5 px-3 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-white/12 text-white backdrop-blur-sm"><PlayGlyph /></span>
            <span className="text-[12px] font-bold text-white/85">{item.handle ? "@" + item.handle : m.label}</span>
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur-sm">{m.label}</span>
        {showImg && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent p-2.5 pt-8">
            <span className="truncate text-[11px] font-bold text-white/90">{label}</span>
            <span className="shrink-0 text-[11px] font-bold text-white">원본 ↗</span>
          </div>
        )}
      </div>
      <div className="bg-white px-3 py-2.5">
        {item.caption
          ? <p className="line-clamp-2 text-[11.5px] font-semibold leading-snug text-[var(--fg)]">{item.caption}</p>
          : <div className="flex items-center justify-between gap-2"><span className="truncate text-[12px] font-semibold text-[var(--muted)]">{label}</span><span className="shrink-0 text-[12px] font-bold text-[var(--accent)]">원본 보기 ↗</span></div>}
      </div>
    </a>
  );
}

// 캡처 없는 폴백 — 작고 명료한 링크 칩
function UgcLinkChip({ item }: { item: UgcItem }) {
  const m = META[item.platform];
  const label = item.handle ? "@" + item.handle : m.label + " 영상";
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="group flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 transition hover:border-[var(--accent)] hover:shadow-sm">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white"><PlayGlyph size={14} /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold leading-tight">{label}</span>
        <span className="block text-[10px] font-semibold text-slate-400">{m.label}</span>
      </span>
      <span className="shrink-0 text-[12px] font-bold text-[var(--accent)] opacity-0 transition group-hover:opacity-100">↗</span>
    </a>
  );
}

export default function ReferUGC({ items, fallbackInitial = 6 }: { items: UgcItem[]; fallbackInitial?: number }) {
  const [all, setAll] = useState(false);
  const captured = items.filter((i) => i.thumb);
  const linkOnly = items.filter((i) => !i.thumb);
  const shownLinks = all ? linkOnly : linkOnly.slice(0, fallbackInitial);
  return (
    <div>
      {captured.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {captured.map((it) => <UgcCard key={it.id} item={it} />)}
        </div>
      )}

      {linkOnly.length > 0 && (
        <div className="mt-10">
          <div className="mb-3 text-[13px] font-bold text-[var(--muted)]">더 많은 제작 사례 <span className="font-normal text-slate-400">· 원본 영상 보기</span></div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {shownLinks.map((it) => <UgcLinkChip key={it.id} item={it} />)}
          </div>
          {linkOnly.length > fallbackInitial && (
            <div className="mt-5 text-center">
              <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all}
                className="rounded-full border border-[var(--border)] bg-white px-6 py-2.5 text-[13px] font-bold text-[var(--fg)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                {all ? "접기" : `사례 더 보기 (+${linkOnly.length - fallbackInitial})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

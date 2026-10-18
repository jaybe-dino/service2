"use client";

import { useState } from "react";

export interface FeedItem { handle: string; brand: string | null; views: number; url: string; cover: string; isShop?: boolean }

const fmt = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : String(n));

function Card({ v }: { v: FeedItem }) {
  const [ok, setOk] = useState(true);
  return (
    <a href={v.url} target="_blank" rel="noopener noreferrer"
      className="group relative block w-[150px] shrink-0 snap-start overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 sm:w-[168px]">
      <div className="aspect-[9/16] w-full">
        {ok ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/img?u=${encodeURIComponent(v.cover)}`} alt={v.brand || v.handle} loading="lazy"
            onError={() => setOk(false)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-2 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white">▶</span>
            {v.brand && <span className="line-clamp-2 text-[11px] font-bold text-white/90">{v.brand}</span>}
          </div>
        )}
      </div>
      {v.isShop && (
        <span className="absolute left-2 top-2 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[9px] font-black text-white shadow">SHOP</span>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2.5">
        <div className="truncate text-[11px] font-bold text-white">@{v.handle}</div>
        <div className="text-[10px] font-semibold text-amber-200/90">▶ {fmt(v.views)}</div>
      </div>
    </a>
  );
}

export default function ReferFeed({ items }: { items: FeedItem[] }) {
  return (
    <div className="kt-noscrollbar flex snap-x gap-3 overflow-x-auto pb-3">
      {items.map((v, i) => <Card key={`${v.handle}-${i}`} v={v} />)}
    </div>
  );
}

import type { ReferCurated as Item } from "@/data/refer";

// 고정 선별 10건 콘텐츠 레퍼런스 카드(서버 컴포넌트, 상호작용 없음).
// 카드 전체가 TikTok 원본으로 연결. 포스터는 로컬 정적 자산(540×960)으로 lazy + 명시 치수.
export default function ReferCurated({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((v) => (
        <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
          aria-label={`${v.brandKo} ${v.brand} · ${v.title} — 원본 영상 보기 (@${v.handle})`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="relative aspect-[9/16] w-full overflow-hidden bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.thumb} alt={`${v.brand} ${v.format} 콘텐츠 포스터`} width={540} height={960} loading="lazy"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">{v.format}</span>
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3">
            <div className="text-[12px] font-extrabold leading-tight text-[var(--fg)]">
              {v.brandKo} <span className="font-semibold text-[var(--muted)]">{v.brand}</span>
            </div>
            <div className="line-clamp-2 text-[13px] font-bold leading-snug">{v.title}</div>
            <p className="line-clamp-2 text-[11.5px] leading-snug text-[var(--muted)]">{v.note}</p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
              <span className="truncate text-[11px] font-semibold text-slate-400">@{v.handle}</span>
              <span className="shrink-0 text-[11px] font-bold text-[var(--accent)]">원본 영상 보기 ↗</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

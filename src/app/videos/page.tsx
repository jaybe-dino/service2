"use client";

// 바이럴 영상 랭킹 — 신규(롤백 가능). 메뉴 비노출, /videos 직접 접근 전용.
// kalodata식 영상 성과 랭킹(조회수/급상승) + 광고·샵·제품태그 배지. 데이터: /api/videos.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import { Search, Play, Eye, Heart, Megaphone, ShoppingBag, Package, Film, ArrowUpRight } from "lucide-react";
import { COUNTRIES } from "@/data/ktrend/meta";

const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.active);
const FLAG: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.id, c.flag]));
interface Vid { id: string; handle: string; brand: string; views: number; likes: number; url: string; country: string; isAd: boolean; isShop: boolean; postedAt: string; hasProduct: boolean; engage: number; growth: number | null; growthPct: number | null }
type Sort = "views" | "growth";
const compact = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K" : String(n));

export default function VideosPage() {
  const [videos, setVideos] = useState<Vid[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("views");
  const [country, setCountry] = useState("");
  const [onlyShop, setOnlyShop] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams({ sort, limit: "120" });
    if (country) params.set("country", country);
    if (onlyShop) params.set("shop", "1");
    fetch(`/api/videos?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (!alive) return; setVideos(Array.isArray(d.videos) ? d.videos : []); setConfigured(d.configured !== false); })
      .catch(() => { if (alive) setVideos([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [sort, country, onlyShop]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? videos.filter((v) => v.handle.toLowerCase().includes(s) || v.brand.toLowerCase().includes(s)) : videos;
  }, [videos, q]);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-1 flex items-center gap-2">
          <Film size={20} className="text-[var(--accent)]" />
          <h1 className="text-[22px] font-black tracking-tight">바이럴 영상</h1>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">베타 · 신규</span>
        </div>
        <p className="mb-4 text-[12px] text-[var(--muted)]">조회수·급상승 기준 영상 랭킹. 급상승은 일별 스냅샷이 누적되면 채워집니다.</p>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="크리에이터·브랜드 검색" className="w-full rounded-lg border border-[var(--border)] py-2 pl-9 pr-3 text-[13px]" />
          </div>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-[13px]">
            <option value="">🌐 전체 국가</option>
            {ACTIVE_COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.flag} {c.nameKo}</option>)}
          </select>
          <button onClick={() => setOnlyShop((v) => !v)} className={`rounded-lg border px-3 py-2 text-[12px] font-semibold ${onlyShop ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>샵 영상만</button>
          <div className="flex gap-1">
            {(["views", "growth"] as Sort[]).map((s) => (
              <button key={s} onClick={() => setSort(s)} className={`rounded-lg border px-3 py-2 text-[12px] font-semibold ${sort === s ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>
                {s === "views" ? "조회수순" : "급상승순"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : !configured ? (
          <div className="rounded-xl border border-[var(--border)] p-8 text-center text-[13px] text-[var(--muted)]">DB가 아직 설정되지 않았습니다.</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
            <Film size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-[13px] font-semibold">아직 수집된 영상이 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((v, i) => (
              <a key={v.id} href={v.url || undefined} target="_blank" rel="noopener noreferrer"
                className="group flex flex-col rounded-xl border border-[var(--border)] bg-white p-3.5 transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${i < 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>{i + 1}</span>
                    <span className="truncate text-[12px] font-bold group-hover:text-[var(--accent)]">@{v.handle || "unknown"}</span>
                  </div>
                  <span className="text-[13px]">{FLAG[v.country] || "🌐"}</span>
                </div>
                {v.brand && <div className="mt-1 truncate text-[10px] text-[var(--muted)]">{v.brand}</div>}
                <div className="mt-2.5 flex items-end gap-3">
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]"><Eye size={11} /> 조회수</div>
                    <div className="text-[17px] font-black leading-none">{compact(v.views)}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]"><Heart size={11} /> 좋아요</div>
                    <div className="text-[13px] font-bold leading-none text-rose-500">{compact(v.likes)}</div>
                  </div>
                  {v.growth != null && v.growth > 0 && (
                    <div className="ml-auto text-right">
                      <div className="text-[10px] text-[var(--muted)]">급상승</div>
                      <div className="inline-flex items-center gap-0.5 text-[13px] font-bold leading-none text-emerald-600"><ArrowUpRight size={12} />{compact(v.growth)}</div>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1">
                  {v.hasProduct && <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700"><Package size={9} /> 제품태그</span>}
                  {v.isAd && <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700"><Megaphone size={9} /> 광고</span>}
                  {v.isShop && <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700"><ShoppingBag size={9} /> 샵</span>}
                  {v.postedAt && <span className="text-[9px] text-slate-400">{v.postedAt}</span>}
                  <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--muted)] group-hover:text-[var(--accent)]"><Play size={10} /> 보기</span>
                </div>
              </a>
            ))}
          </div>
        )}
        {rows.length > 0 && <Link href="/products" className="mt-4 inline-block text-[12px] font-semibold text-[var(--accent)]">→ 제품 랭킹 보기</Link>}
      </div>
    </PageShell>
  );
}

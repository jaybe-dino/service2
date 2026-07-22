"use client";

// 크리에이터 랭킹 — 신규(롤백 가능). 메뉴 비노출, /creators 직접 접근 전용.
// kalodata식 '크리에이터 → 매출 기여(유도 GMV)' 관점. 데이터: /api/creators.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import { Search, Info, Users, TrendingUp, Eye } from "lucide-react";

interface Creator { handle: string; videos: number; totalViews: number; avgViews: number; brands: string[]; inducedGmv: number; taggedProducts: number }
interface Summary { count: number; totalInducedGmv: number; withInduced: number }
type Sort = "induced" | "views" | "videos";
const compact = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K" : String(n));

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("induced");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/creators?sort=${sort}&limit=300`)
      .then((r) => r.json())
      .then((d) => { if (!alive) return; setCreators(Array.isArray(d.creators) ? d.creators : []); setSummary(d.summary || null); setConfigured(d.configured !== false); })
      .catch(() => { if (alive) setCreators([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [sort]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? creators.filter((c) => c.handle.toLowerCase().includes(s) || c.brands.some((b) => b.toLowerCase().includes(s))) : creators;
  }, [creators, q]);

  const maxInduced = useMemo(() => rows.reduce((m, c) => Math.max(m, c.inducedGmv), 0), [rows]);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-1 flex items-center gap-2">
          <Users size={20} className="text-[var(--accent)]" />
          <h1 className="text-[22px] font-black tracking-tight">크리에이터 랭킹</h1>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">베타 · 신규</span>
        </div>
        <p className="mb-4 text-[12px] text-[var(--muted)]">태그한 제품 매출로 본 크리에이터 영향력. <b>유도 GMV</b> = 크리에이터가 태그한 제품들의 추정 GMV 합.</p>

        {summary && (
          <div className="mb-4 grid grid-cols-3 gap-2.5">
            <Kpi icon={<Users size={14} />} label="크리에이터" value={compact(summary.count)} />
            <Kpi icon={<TrendingUp size={14} />} label="총 유도 GMV" value={`$${compact(summary.totalInducedGmv)}`} accent />
            <Kpi icon={<Eye size={14} />} label="매출 연결됨" value={`${compact(summary.withInduced)}명`} />
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="크리에이터·브랜드 검색" className="w-full rounded-lg border border-[var(--border)] py-2 pl-9 pr-3 text-[13px]" />
          </div>
          <div className="flex gap-1">
            {(["induced", "views", "videos"] as Sort[]).map((s) => (
              <button key={s} onClick={() => setSort(s)} className={`rounded-lg border px-3 py-2 text-[12px] font-semibold ${sort === s ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>
                {s === "induced" ? "유도 GMV순" : s === "views" ? "조회수순" : "영상수순"}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-[var(--muted)]">
          <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <span>유도 GMV는 영상에 <b>직접 태그된 제품</b>이 있을 때 산출됩니다. 태그 정보가 없는 영상은 브랜드 매칭만 되며 유도 GMV에 포함되지 않습니다(추정치).</span>
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : !configured ? (
          <div className="rounded-xl border border-[var(--border)] p-8 text-center text-[13px] text-[var(--muted)]">DB가 아직 설정되지 않았습니다.</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
            <Users size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-[13px] font-semibold">아직 크리에이터 집계가 없습니다</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">영상 수집이 쌓이면 이 랭킹이 채워집니다.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50 text-[11px] text-[var(--muted)]">
                <tr>
                  <th className="p-2.5 pl-3">#</th>
                  <th className="p-2.5">크리에이터</th>
                  <th className="p-2.5 text-right">영상</th>
                  <th className="p-2.5 text-right">총 조회수</th>
                  <th className="p-2.5 text-right">태그 제품</th>
                  <th className="p-2.5">유도 GMV</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={c.handle} className="group border-t border-slate-100 hover:bg-[var(--accent-light)]/40">
                    <td className="p-2.5 pl-3"><span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-black ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-amber-700 text-white" : "text-slate-400"}`}>{i + 1}</span></td>
                    <td className="p-2.5">
                      <Link href={`/creator/${encodeURIComponent(c.handle)}`} className="font-semibold group-hover:text-[var(--accent)]">@{c.handle}</Link>
                      {c.brands.length > 0 && <div className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{c.brands.slice(0, 3).join(" · ")}</div>}
                    </td>
                    <td className="whitespace-nowrap p-2.5 text-right">{compact(c.videos)}</td>
                    <td className="whitespace-nowrap p-2.5 text-right">{compact(c.totalViews)}</td>
                    <td className="whitespace-nowrap p-2.5 text-right">{c.taggedProducts > 0 ? compact(c.taggedProducts) : "—"}</td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${maxInduced > 0 ? Math.max(2, Math.round((c.inducedGmv / maxInduced) * 100)) : 0}%` }} />
                        </div>
                        <span className="whitespace-nowrap font-bold text-[var(--accent)]">{c.inducedGmv > 0 ? `$${compact(c.inducedGmv)}` : <span className="text-slate-300">—</span>}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">{icon} {label}</div>
      <div className={`mt-1 text-[17px] font-black ${accent ? "text-[var(--accent)]" : ""}`}>{value}</div>
    </div>
  );
}

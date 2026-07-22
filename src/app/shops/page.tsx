"use client";

// 샵(셀러) 랭킹 — 신규(롤백 가능). 메뉴 비노출, /shops 직접 접근 전용.
// 1차: 브랜드 단위 TikTok Shop 집계를 '샵'으로 노출(기존 실데이터). GMV는 추정치.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import { Search, Info, Store, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { COUNTRIES } from "@/data/ktrend/meta";

const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.active);
const compact = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K" : String(n));

interface Shop {
  name: string; products: number; sold: number; gmv: number;
  avgPrice: number; commission: number | null; videos: number; views: number; soldGrowth?: number;
}
interface Summary { count: number; totalGmv: number; totalProducts: number; avgPrice: number }
type Sort = "gmv" | "sold" | "products";
const fmt = (n: number) => n.toLocaleString();

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("gmv");
  const [country, setCountry] = useState<string>(""); // "" = 전체

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams({ sort, limit: "300" });
    if (country) params.set("country", country);
    fetch(`/api/shops?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (!alive) return; setShops(Array.isArray(d.shops) ? d.shops : []); setSummary(d.summary || null); setConfigured(d.configured !== false); })
      .catch(() => { if (alive) setShops([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [sort, country]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? shops.filter((x) => x.name.toLowerCase().includes(s)) : shops;
  }, [shops, q]);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-1 flex items-center gap-2">
          <Store size={20} className="text-[var(--accent)]" />
          <h1 className="text-[22px] font-black tracking-tight">샵 랭킹</h1>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">베타 · 신규</span>
        </div>
        <p className="mb-4 text-[12px] text-[var(--muted)]">TikTok Shop 셀러(브랜드샵)별 매출·객단가 랭킹.</p>

        <div className="mb-4 flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-[var(--muted)]">
          <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <span><b>추정 GMV·객단가</b>는 공개 판매수 기반 <b>추정치</b>입니다. 1차 버전은 브랜드 단위 샵 집계이며, 개별 셀러·셀러타입은 확장 예정입니다.</span>
        </div>

        {summary && (
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ShopKpi label="샵 수" value={fmt(summary.count)} />
            <ShopKpi label="총 추정 GMV" value={`$${fmt(summary.totalGmv)}`} accent />
            <ShopKpi label="총 제품수" value={fmt(summary.totalProducts)} />
            <ShopKpi label="평균 객단가" value={`$${fmt(summary.avgPrice)}`} />
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="샵·브랜드 검색"
              className="w-full rounded-lg border border-[var(--border)] py-2 pl-9 pr-3 text-[13px]" />
          </div>
          <select value={country} onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-[13px]">
            <option value="">전체 국가</option>
            {ACTIVE_COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.flag} {c.nameKo}</option>)}
          </select>
          <div className="flex gap-1">
            {(["gmv", "sold", "products"] as Sort[]).map((s) => (
              <button key={s} onClick={() => setSort(s)}
                className={`rounded-lg border px-3 py-2 text-[12px] font-semibold ${sort === s ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>
                {s === "gmv" ? "추정 GMV순" : s === "sold" ? "판매량순" : "제품수순"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[13px] text-[var(--muted)]">불러오는 중…</div>
        ) : !configured ? (
          <div className="rounded-xl border border-[var(--border)] p-8 text-center text-[13px] text-[var(--muted)]">DB가 아직 설정되지 않았습니다.</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
            <Store size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-[13px] font-semibold">아직 샵 집계 데이터가 없습니다</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">TikTok Shop 제품 수집이 쌓이면 이 랭킹이 채워집니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50 text-[11px] text-[var(--muted)]">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">샵(브랜드)</th>
                  <th className="p-2.5 text-right">제품수</th>
                  <th className="p-2.5 text-right">판매량</th>
                  <th className="p-2.5 text-right">급상승(7일)</th>
                  <th className="p-2.5 text-right">추정 GMV</th>
                  <th className="p-2.5 text-right">객단가</th>
                  <th className="p-2.5 text-right">커미션</th>
                  <th className="p-2.5 text-right">영상</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <tr key={s.name} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="p-2.5 text-slate-400">{i + 1}</td>
                    <td className="p-2.5 font-semibold">
                      <Link href={`/brand/${encodeURIComponent(s.name)}`} className="hover:text-[var(--accent)]">{s.name}</Link>
                    </td>
                    <td className="p-2.5 text-right">{fmt(s.products)}</td>
                    <td className="p-2.5 text-right">{fmt(s.sold)}</td>
                    <td className="whitespace-nowrap p-2.5 text-right">
                      {!s.soldGrowth ? <span className="text-[11px] text-slate-300" title="스냅샷 누적 후 산출">집계중</span>
                        : <span className={`inline-flex items-center gap-0.5 font-semibold ${s.soldGrowth > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                            {s.soldGrowth > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{compact(Math.abs(s.soldGrowth))}
                          </span>}
                    </td>
                    <td className="p-2.5 text-right font-bold text-[var(--accent)]">${fmt(s.gmv)}</td>
                    <td className="p-2.5 text-right">${fmt(s.avgPrice)}</td>
                    <td className="p-2.5 text-right">{s.commission != null ? `${s.commission}%` : "—"}</td>
                    <td className="p-2.5 text-right text-[var(--muted)]">{fmt(s.videos)}</td>
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

function ShopKpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <div className="text-[10px] text-[var(--muted)]">{label}</div>
      <div className={`mt-0.5 text-[17px] font-black ${accent ? "text-[var(--accent)]" : ""}`}>{value}</div>
    </div>
  );
}

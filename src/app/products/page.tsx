"use client";

// 제품(SKU) 랭킹 — 신규(롤백 가능) 기능. 메뉴 비노출, /products 직접 접근 전용.
// 기존 서비스 미변경. 데이터: /api/products (products 테이블). GMV는 추정치(라벨 명시).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import { Search, Info, ExternalLink, Package, TrendingUp, DollarSign, ShoppingCart, Tag, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { PRICE_BANDS } from "@/data/ktrend/product-taxonomy";
import { COUNTRIES } from "@/data/ktrend/meta";
import { CATEGORY_LABEL, CATEGORY_ICON, type CategoryId } from "@/lib/ktrend/classify";

const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.active);
const FLAG: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.id, c.flag]));
const CAT_IDS: CategoryId[] = ["skincare", "makeup", "haircare", "body", "inner"];

interface Product {
  id: string; brand: string; title: string;
  price: number; currency: string; sold: number; gmv: number;
  commission: number | null; url: string; country?: string;
  category?: CategoryId; growth?: number | null; growthPct?: number | null;
}
interface Summary { count: number; totalGmv: number; totalSold: number; avgPrice: number }
type Sort = "gmv" | "sold" | "price" | "growth";

const fmtInt = (n: number) => n.toLocaleString();
const compact = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K" : String(n));
const money = (n: number, cur: string) => `${cur === "USD" ? "$" : ""}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${cur !== "USD" ? " " + cur : ""}`;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("gmv");
  const [band, setBand] = useState<number>(-1); // PRICE_BANDS 인덱스, -1=전체
  const [country, setCountry] = useState<string>(""); // "" = 전체
  const [category, setCategory] = useState<CategoryId | "">(""); // "" = 전체
  const [minCommission, setMinCommission] = useState<number>(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const b = band >= 0 ? PRICE_BANDS[band] : null;
    const params = new URLSearchParams({ sort, limit: "500" });
    if (b) { params.set("minPrice", String(b.min)); if (b.max != null) params.set("maxPrice", String(b.max)); }
    if (country) params.set("country", country);
    if (category) params.set("category", category);
    if (minCommission > 0) params.set("minCommission", String(minCommission));
    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (!alive) return; setProducts(Array.isArray(d.products) ? d.products : []); setSummary(d.summary || null); setConfigured(d.configured !== false); })
      .catch(() => { if (alive) setProducts([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [sort, band, country, category, minCommission]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? products.filter((p) => p.title.toLowerCase().includes(s) || p.brand.toLowerCase().includes(s)) : products;
    return list;
  }, [products, q]);

  const maxGmv = useMemo(() => rows.reduce((m, p) => Math.max(m, p.gmv), 0), [rows]);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-1 flex items-center gap-2">
          <Package size={20} className="text-[var(--accent)]" />
          <h1 className="text-[22px] font-black tracking-tight">제품 랭킹</h1>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">베타 · 신규</span>
        </div>
        <p className="mb-3 text-[12px] text-[var(--muted)]">TikTok Shop 제품(SKU)별 판매·추정 GMV 랭킹. 제품을 누르면 홍보 크리에이터·영상까지 이어집니다.</p>

        {/* 신규 분석 트랙 상호 이동 (메뉴 비노출 페이지) */}
        <div className="mb-4 flex flex-wrap gap-1.5 text-[12px]">
          {[["/category", "🗂 카테고리"], ["/shops", "🏬 샵"], ["/creators", "👤 크리에이터"], ["/videos", "🎬 바이럴 영상"]].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">{label}</Link>
          ))}
        </div>

        {/* 요약 KPI */}
        {summary && (
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Kpi icon={<Package size={14} />} label="제품 수" value={fmtInt(summary.count)} />
            <Kpi icon={<DollarSign size={14} />} label="총 추정 GMV" value={`$${compact(summary.totalGmv)}`} accent />
            <Kpi icon={<ShoppingCart size={14} />} label="총 판매량" value={compact(summary.totalSold)} />
            <Kpi icon={<Tag size={14} />} label="평균 객단가" value={`$${fmtInt(summary.avgPrice)}`} />
          </div>
        )}

        {/* 면책 라벨 */}
        <div className="mb-4 flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-[var(--muted)]">
          <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <span><b>추정 GMV</b>는 공개 판매수(sold) × 가격으로 산출한 <b>추정치</b>이며 실제 매출과 다를 수 있습니다. 재고·투자 등 의사결정의 단독 근거로 사용하지 마세요.</span>
        </div>

        {/* 컨트롤 바 */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제품·브랜드 검색"
              className="w-full rounded-lg border border-[var(--border)] py-2 pl-9 pr-3 text-[13px]" />
          </div>
          <select value={country} onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-[13px]">
            <option value="">🌐 전체 국가</option>
            {ACTIVE_COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.flag} {c.nameKo}</option>)}
          </select>
          <div className="flex gap-1">
            {(["gmv", "sold", "price", "growth"] as Sort[]).map((s) => (
              <button key={s} onClick={() => setSort(s)}
                className={`rounded-lg border px-3 py-2 text-[12px] font-semibold ${sort === s ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>
                {s === "gmv" ? "추정 GMV순" : s === "sold" ? "판매량순" : s === "price" ? "가격순" : "급상승순"}
              </button>
            ))}
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          <button onClick={() => setCategory("")} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${category === "" ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>전체</button>
          {CAT_IDS.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${category === c ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{CATEGORY_ICON[c]} {CATEGORY_LABEL[c]}</button>
          ))}
        </div>

        {/* 가격대 + 커미션 필터 */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button onClick={() => setBand(-1)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${band === -1 ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>전체 가격</button>
          {PRICE_BANDS.map((b, i) => (
            <button key={b.label} onClick={() => setBand(i)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${band === i ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{b.label}</button>
          ))}
          <span className="mx-1 h-4 w-px bg-[var(--border)]" />
          {[0, 10, 20, 30].map((c) => (
            <button key={c} onClick={() => setMinCommission(c)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${minCommission === c ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{c === 0 ? "커미션 전체" : `커미션 ${c}%+`}</button>
          ))}
        </div>

        {!loading && configured && rows.length > 0 && (
          <p className="mb-2 text-[11px] text-[var(--muted)]"><b className="text-[var(--fg)]">{fmtInt(rows.length)}</b>개 제품 · {sort === "gmv" ? "추정 GMV" : sort === "sold" ? "판매량" : "가격"} 높은 순</p>
        )}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : !configured ? (
          <div className="rounded-xl border border-[var(--border)] p-8 text-center text-[13px] text-[var(--muted)]">DB가 아직 설정되지 않았습니다.</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
            <Package size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-[13px] font-semibold">아직 수집된 제품이 없습니다</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">제품 수집(크롤러)이 돌기 시작하면 이 랭킹이 채워집니다.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50 text-[11px] text-[var(--muted)]">
                <tr>
                  <th className="p-2.5 pl-3">#</th>
                  <th className="p-2.5">제품 / 브랜드</th>
                  <th className="p-2.5 text-right">가격</th>
                  <th className="p-2.5 text-right">판매량</th>
                  <th className="p-2.5 text-right">급상승(7일)</th>
                  <th className="p-2.5">추정 GMV</th>
                  <th className="p-2.5 text-right">커미션</th>
                  <th className="p-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id} className="group border-t border-slate-100 hover:bg-[var(--accent-light)]/40">
                    <td className="p-2.5 pl-3">
                      <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-black ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-amber-700 text-white" : "text-slate-400"}`}>{i + 1}</span>
                    </td>
                    <td className="max-w-[300px] p-2.5">
                      <Link href={`/product/${encodeURIComponent(p.id)}`} className="block truncate font-semibold group-hover:text-[var(--accent)]">
                        {p.title || <span className="text-slate-300">(제목 없음)</span>}
                      </Link>
                      <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--muted)]">
                        <span>{FLAG[(p.country || "US").toUpperCase()] || "🌐"}</span>
                        <span className="truncate">{p.brand || "브랜드 미상"}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap p-2.5 text-right">{money(p.price, p.currency)}</td>
                    <td className="whitespace-nowrap p-2.5 text-right">{compact(p.sold)}</td>
                    <td className="whitespace-nowrap p-2.5 text-right">
                      {p.growth == null ? <span className="text-[11px] text-slate-300" title="스냅샷 누적 후 산출">집계중</span>
                        : p.growth === 0 ? <span className="text-slate-400">—</span>
                        : <span className={`inline-flex items-center gap-0.5 font-semibold ${p.growth > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                            {p.growth > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {compact(Math.abs(p.growth))}{p.growthPct != null ? ` (${p.growth > 0 ? "+" : "-"}${Math.abs(p.growthPct)}%)` : ""}
                          </span>}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${maxGmv > 0 ? Math.max(4, Math.round((p.gmv / maxGmv) * 100)) : 0}%` }} />
                        </div>
                        <span className="whitespace-nowrap font-bold text-[var(--accent)]">{money(p.gmv, p.currency)}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap p-2.5 text-right">{p.commission != null ? `${p.commission}%` : "—"}</td>
                    <td className="p-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/product/${encodeURIComponent(p.id)}`} className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-semibold text-[var(--muted)] opacity-0 transition group-hover:opacity-100 hover:text-[var(--accent)]"><TrendingUp size={12} /> 상세</Link>
                        {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-slate-400 hover:text-[var(--accent)]"><ExternalLink size={13} /></a>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-center text-[10px] text-[var(--muted)]">추정 GMV = 가격 × 공개 판매수 · 통화가 섞여 있을 수 있어 절대 비교에 유의</p>
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

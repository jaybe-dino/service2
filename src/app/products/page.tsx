"use client";

// 제품(SKU) 랭킹 — 신규(롤백 가능) 기능. 메뉴 비노출, /products 직접 접근 전용.
// 기존 서비스 미변경. 데이터: /api/products (products 테이블). GMV는 추정치(라벨 명시).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import { Search, Info, ExternalLink, Package } from "lucide-react";
import { PRICE_BANDS } from "@/data/ktrend/product-taxonomy";

interface Product {
  id: string; brand: string; title: string;
  price: number; currency: string; sold: number; gmv: number;
  commission: number | null; url: string;
}
interface Summary { count: number; totalGmv: number; totalSold: number; avgPrice: number }
type Sort = "gmv" | "sold" | "price";

const fmtInt = (n: number) => n.toLocaleString();
const money = (n: number, cur: string) => `${cur === "USD" ? "$" : ""}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}${cur !== "USD" ? " " + cur : ""}`;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("gmv");
  const [band, setBand] = useState<number>(-1); // PRICE_BANDS 인덱스, -1=전체

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const b = band >= 0 ? PRICE_BANDS[band] : null;
    const params = new URLSearchParams({ sort, limit: "300" });
    if (b) { params.set("minPrice", String(b.min)); if (b.max != null) params.set("maxPrice", String(b.max)); }
    fetch(`/api/products?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (!alive) return; setProducts(Array.isArray(d.products) ? d.products : []); setSummary(d.summary || null); setConfigured(d.configured !== false); })
      .catch(() => { if (alive) setProducts([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [sort, band]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? products.filter((p) => p.title.toLowerCase().includes(s) || p.brand.toLowerCase().includes(s)) : products;
    return list;
  }, [products, q]);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-1 flex items-center gap-2">
          <Package size={20} className="text-[var(--accent)]" />
          <h1 className="text-[22px] font-black tracking-tight">제품 랭킹</h1>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">베타 · 신규</span>
        </div>
        <p className="mb-4 text-[12px] text-[var(--muted)]">TikTok Shop 제품(SKU)별 판매·추정 GMV 랭킹.</p>

        {/* 면책 라벨 */}
        <div className="mb-4 flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-[var(--muted)]">
          <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
          <span><b>추정 GMV</b>는 공개 판매수(sold) × 가격으로 산출한 <b>추정치</b>이며 실제 매출과 다를 수 있습니다. 재고·투자 등 의사결정의 단독 근거로 사용하지 마세요.</span>
        </div>

        {/* 요약 KPI (kalodata식 상단 지표) */}
        {summary && (
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi label="제품 수" value={fmtInt(summary.count)} />
            <Kpi label="총 추정 GMV" value={`$${fmtInt(summary.totalGmv)}`} accent />
            <Kpi label="총 판매량" value={fmtInt(summary.totalSold)} />
            <Kpi label="평균 객단가" value={`$${fmtInt(summary.avgPrice)}`} />
          </div>
        )}

        {/* 가격대 필터 */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button onClick={() => setBand(-1)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${band === -1 ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>전체 가격</button>
          {PRICE_BANDS.map((b, i) => (
            <button key={b.label} onClick={() => setBand(i)} className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${band === i ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{b.label}</button>
          ))}
        </div>

        {/* 컨트롤 */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="제품·브랜드 검색"
              className="w-full rounded-lg border border-[var(--border)] py-2 pl-9 pr-3 text-[13px]" />
          </div>
          <div className="flex gap-1">
            {(["gmv", "sold", "price"] as Sort[]).map((s) => (
              <button key={s} onClick={() => setSort(s)}
                className={`rounded-lg border px-3 py-2 text-[12px] font-semibold ${sort === s ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>
                {s === "gmv" ? "추정 GMV순" : s === "sold" ? "판매량순" : "가격순"}
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
            <Package size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-[13px] font-semibold">아직 수집된 제품이 없습니다</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">제품 수집(크롤러)이 돌기 시작하면 이 랭킹이 채워집니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-slate-50 text-[11px] text-[var(--muted)]">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">제품</th>
                  <th className="p-2.5">브랜드</th>
                  <th className="p-2.5 text-right">가격</th>
                  <th className="p-2.5 text-right">판매량</th>
                  <th className="p-2.5 text-right">매출(GMV)</th>
                  <th className="p-2.5 text-right">성장률</th>
                  <th className="p-2.5 text-right">커미션</th>
                  <th className="p-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, i) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="p-2.5 text-slate-400">{i + 1}</td>
                    <td className="max-w-[280px] p-2.5 font-semibold">
                      <Link href={`/product/${encodeURIComponent(p.id)}`} className="hover:text-[var(--accent)]">{p.title || <span className="text-slate-300">(제목 없음)</span>}</Link>
                    </td>
                    <td className="p-2.5 text-[var(--muted)]">{p.brand}</td>
                    <td className="p-2.5 text-right">{money(p.price, p.currency)}</td>
                    <td className="p-2.5 text-right">{fmtInt(p.sold)}</td>
                    <td className="p-2.5 text-right font-bold text-[var(--accent)]">{money(p.gmv, p.currency)}</td>
                    <td className="p-2.5 text-right text-[11px] text-slate-300" title="스냅샷 누적 후 산출">집계중</td>
                    <td className="p-2.5 text-right">{p.commission != null ? `${p.commission}%` : "—"}</td>
                    <td className="p-2.5">
                      {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[var(--accent)]"><ExternalLink size={13} /></a>}
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

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <div className="text-[10px] text-[var(--muted)]">{label}</div>
      <div className={`mt-0.5 text-[17px] font-black ${accent ? "text-[var(--accent)]" : ""}`}>{value}</div>
    </div>
  );
}

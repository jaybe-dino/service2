"use client";

// 카테고리 랭킹 — 신규(롤백 가능). 메뉴 비노출, /category 직접 접근 전용.
// 제품 자동분류(제목 키워드) 기반 카테고리별 실 GMV·판매·브랜드수 랭킹 + 택소노미 탐색.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import { Info, Package, Store, LayoutGrid } from "lucide-react";
import { PRODUCT_TAXONOMY, PRICE_BANDS } from "@/data/ktrend/product-taxonomy";
import { COUNTRIES } from "@/data/ktrend/meta";

const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.active);
interface Cat { id: string; label: string; icon: string; products: number; brands: number; sold: number; gmv: number; avgCommission: number | null }
const compact = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K" : String(n));

export default function CategoryPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [country, setCountry] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    fetch(`/api/categories?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (alive) setCats(Array.isArray(d.categories) ? d.categories : []); })
      .catch(() => { if (alive) setCats([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [country]);

  const maxGmv = useMemo(() => cats.reduce((m, c) => Math.max(m, c.gmv), 0), [cats]);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-1 flex items-center gap-2">
          <LayoutGrid size={20} className="text-[var(--accent)]" />
          <h1 className="text-[22px] font-black tracking-tight">카테고리 랭킹</h1>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">베타 · 신규</span>
        </div>
        <p className="mb-4 text-[12px] text-[var(--muted)]">K-뷰티 카테고리별 추정 GMV·판매·브랜드수 랭킹. 카테고리를 누르면 해당 제품만 필터됩니다.</p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link href="/products" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"><Package size={14} /> 제품 랭킹</Link>
          <Link href="/shops" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"><Store size={14} /> 샵 랭킹</Link>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="ml-auto rounded-lg border border-[var(--border)] px-2.5 py-2 text-[13px]">
            <option value="">🌐 전체 국가</option>
            {ACTIVE_COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.flag} {c.nameKo}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : cats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center text-[13px] text-[var(--muted)]">아직 분류할 제품이 없습니다. 제품 수집이 쌓이면 카테고리 랭킹이 채워집니다.</div>
        ) : (
          <div className="grid gap-2.5">
            {cats.map((c, i) => (
              <Link key={c.id} href={c.id === "other" ? "/products" : `/products?category=${c.id}`}
                className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] p-4 hover:border-[var(--accent)]">
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-black ${i < 3 ? "bg-amber-100 text-amber-700" : "text-slate-400"}`}>{i + 1}</span>
                <span className="text-[22px]">{c.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-black group-hover:text-[var(--accent)]">{c.label}</span>
                    <span className="text-[11px] text-[var(--muted)]">제품 {compact(c.products)} · 브랜드 {compact(c.brands)}{c.avgCommission != null ? ` · 커미션 ${c.avgCommission}%` : ""}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${maxGmv > 0 ? Math.max(3, Math.round((c.gmv / maxGmv) * 100)) : 0}%` }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[16px] font-black text-[var(--accent)]">${compact(c.gmv)}</div>
                  <div className="text-[10px] text-[var(--muted)]">추정 GMV · 판매 {compact(c.sold)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 택소노미 탐색 */}
        <h2 className="mb-2 mt-6 text-[13px] font-black">세부 카테고리 탐색</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRODUCT_TAXONOMY.map((c) => (
            <div key={c.id} className="rounded-2xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2 text-[14px] font-black"><span>{c.icon}</span> {c.nameKo}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.subs.map((s) => (
                  <Link key={s} href={`/products?q=${encodeURIComponent(s)}`}
                    className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">{s}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="mb-2 text-[12px] font-bold text-[var(--muted)]">가격대</div>
          <div className="flex flex-wrap gap-1.5">
            {PRICE_BANDS.map((b) => (
              <span key={b.label} className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{b.label}</span>
            ))}
          </div>
        </div>

        <p className="mt-5 flex items-start gap-1.5 text-[11px] text-[var(--muted)]">
          <Info size={12} className="mt-0.5 shrink-0 text-slate-400" />
          카테고리는 제품 제목 키워드로 자동 분류한 추정치입니다. GMV = 가격 × 공개 판매수(추정).
        </p>
      </div>
    </PageShell>
  );
}

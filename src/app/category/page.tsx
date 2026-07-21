"use client";

// 카테고리 허브 — 신규(롤백 가능). 메뉴 비노출, /category 직접 접근 전용.
// 1차: 확장 택소노미 + 제품/샵 랭킹 진입. 카테고리별 실 GMV 집계는 제품 분류(P1) 후.
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import { Info, Package, Store, LayoutGrid } from "lucide-react";
import { PRODUCT_TAXONOMY, PRICE_BANDS } from "@/data/ktrend/product-taxonomy";

export default function CategoryPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-1 flex items-center gap-2">
          <LayoutGrid size={20} className="text-[var(--accent)]" />
          <h1 className="text-[22px] font-black tracking-tight">카테고리</h1>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">베타 · 신규</span>
        </div>
        <p className="mb-4 text-[12px] text-[var(--muted)]">K-뷰티 카테고리 체계 · 제품/샵 랭킹으로 이동.</p>

        <div className="mb-5 flex gap-2">
          <Link href="/products" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"><Package size={14} /> 제품 랭킹</Link>
          <Link href="/shops" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"><Store size={14} /> 샵 랭킹</Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {PRODUCT_TAXONOMY.map((c) => (
            <div key={c.id} className="rounded-2xl border border-[var(--border)] p-4">
              <div className="flex items-center gap-2 text-[15px] font-black"><span>{c.icon}</span> {c.nameKo}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.subs.map((s) => (
                  <Link key={s} href={`/products?q=${encodeURIComponent(s)}`}
                    className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                    {s}
                  </Link>
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
          카테고리별 GMV·성장률 집계는 제품 자동 분류가 적용된 뒤 채워집니다(로드맵 P1). 현재는 체계 탐색과 제품/샵 랭킹 진입용입니다.
        </p>
      </div>
    </PageShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, TrendingUp } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import CreatorName from "@/components/ktrend/CreatorName";
import { usePlan } from "@/components/ktrend/PlanContext";
import { BRANDS, BRAND_MAP } from "@/data/ktrend/brands";
import { loadContent, fmtCompact, fmtUSD, type Content } from "@/data/ktrend/content";

const palette = ["#1A56DB", "#7C3AED", "#0E9F6E", "#F59E0B", "#EF4444"];

export default function ReportsPage() {
  const { isPro } = usePlan();
  const [content, setContent] = useState<Content[] | null>(null);
  const [brandId, setBrandId] = useState(BRANDS[0].id);
  const brand = BRAND_MAP[brandId];

  useEffect(() => {
    loadContent().then(setContent);
  }, []);

  const stats = useMemo(() => {
    if (!content) return null;
    const items = content.filter((c) => c.brandId === brandId);

    // 월별 조회수 추이 (실제 업로드일 기준)
    const byMonth = new Map<string, number>();
    items.forEach((c) => {
      const m = c.date?.slice(0, 7);
      if (m) byMonth.set(m, (byMonth.get(m) ?? 0) + c.views);
    });
    const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8);

    // 인플루언서 기여도
    const byInf = new Map<string, { views: number; rev: number; count: number }>();
    items.forEach((c) => {
      const cur = byInf.get(c.influencerId) ?? { views: 0, rev: 0, count: 0 };
      cur.views += c.views;
      cur.rev += c.estRevenueUSD;
      cur.count += 1;
      byInf.set(c.influencerId, cur);
    });
    const topInf = [...byInf.entries()].sort((a, b) => b[1].views - a[1].views).slice(0, 5);

    const totalRevenue = items.reduce((s, c) => s + c.estRevenueUSD, 0);
    const avgEng = items.length ? items.reduce((s, c) => s + c.engagementRate, 0) / items.length : 0;

    return { months, topInf, totalRevenue, avgEng: Math.round(avgEng * 10) / 10 };
  }, [content, brandId]);

  // SOV: 같은 카테고리 상위 브랜드 (브랜드 요약 기준 — 항상 표시)
  const sov = useMemo(() => {
    const same = BRANDS.filter((b) => b.category === brand.category)
      .sort((a, b) => b.totalViews - a.totalViews);
    const set = same.slice(0, 4);
    if (!set.find((b) => b.id === brandId)) set[set.length - 1] = brand;
    const total = set.reduce((s, b) => s + b.totalViews, 0) || 1;
    return set.map((b) => ({ id: b.id, name: b.name, pct: Math.round((b.totalViews / total) * 100) }));
  }, [brand, brandId]);

  let acc = 0;
  const conic = sov.map((d, i) => {
    const seg = `${palette[i % palette.length]} ${acc}% ${acc + d.pct}%`;
    acc += d.pct;
    return seg;
  }).join(", ");

  const maxView = Math.max(...(stats?.months.map((m) => m[1]) ?? [1]), 1);

  return (
    <PageShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-black tracking-tight">브랜드 성장 리포트</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">자사·경쟁사 틱톡 샵 성과를 기간별로 비교 분석합니다.</p>
        </div>
        <button className={`kt-btn px-4 py-2 text-[12px] ${isPro ? "kt-btn-primary" : "kt-btn-outline cursor-not-allowed"}`} disabled={!isPro}>
          <Download size={14} /> PDF 리포트 {isPro ? "다운로드" : "(Enterprise)"}
        </button>
      </div>

      <div className="mb-4">
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-[12px] font-semibold outline-none focus:border-[var(--accent)]"
        >
          {BRANDS.map((b) => (
            <option key={b.id} value={b.id}>#{b.rank} {b.name}</option>
          ))}
        </select>
      </div>

      {/* 주요 지표 (브랜드 요약 — 실데이터) */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "영상 수", v: `${brand.videos}` },
          { l: "누적 조회수", v: fmtCompact(brand.totalViews) },
          { l: "평균 조회수", v: fmtCompact(brand.avgViews) },
          { l: "TikTok Shop 비율", v: `${brand.shopRatio}%` },
        ].map((s) => (
          <div key={s.l} className="kt-card p-4">
            <div className="text-[11px] text-[var(--muted)]">{s.l}</div>
            <div className="mt-1 text-[20px] font-black text-[var(--accent)]">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 월별 조회수 추이 */}
        <div className="kt-card p-4 lg:col-span-2">
          <h3 className="mb-3 text-[13px] font-bold">월별 조회수 추이 (실제 업로드일 기준)</h3>
          {!stats ? (
            <div className="flex h-40 items-center justify-center text-[var(--muted)]"><Loader2 className="animate-spin" /></div>
          ) : stats.months.length ? (
            <div className="flex h-40 items-end gap-2">
              {stats.months.map(([m, v]) => (
                <div key={m} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t bg-[var(--accent)] transition-all" style={{ height: `${(v / maxView) * 100}%` }} title={fmtCompact(v)} />
                  <span className="text-[8px] text-[var(--muted)]">{m.slice(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-[11px] text-[var(--muted)]">데이터 없음</p>
          )}
        </div>

        {/* SOV 도넛 */}
        <div className="kt-card p-4">
          <h3 className="mb-3 text-[13px] font-bold">카테고리 점유율 (SOV)</h3>
          <div className="flex items-center gap-4">
            <div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${conic})` }}>
              <div className="absolute inset-[22%] flex items-center justify-center rounded-full bg-white text-[10px] font-bold">SOV</div>
            </div>
            <ul className="flex-1 space-y-1">
              {sov.map((d, i) => (
                <li key={d.id} className="flex items-center gap-1.5 text-[10px]">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: palette[i % palette.length] }} />
                  <span className={`flex-1 truncate ${d.id === brandId ? "font-bold" : ""}`}>{d.name}</span>
                  <span className="font-semibold">{d.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 고성과 인플루언서 */}
      <div className="mt-4 kt-card p-4">
        <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-bold">
          <TrendingUp size={14} className="text-[var(--accent)]" /> 고성과 인플루언서 기여도
        </h3>
        {!stats ? (
          <div className="flex h-24 items-center justify-center text-[var(--muted)]"><Loader2 className="animate-spin" /></div>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase text-[var(--muted)]">
                <th className="py-2">크리에이터</th>
                <th className="py-2 text-right">콘텐츠</th>
                <th className="py-2 text-right">조회수</th>
                <th className="py-2 text-right">추정 매출</th>
              </tr>
            </thead>
            <tbody>
              {stats.topInf.map(([handle, d]) => (
                <tr key={handle} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2">
                    <CreatorName handle={handle} />
                  </td>
                  <td className="py-2 text-right">{d.count}</td>
                  <td className="py-2 text-right">{fmtCompact(d.views)}</td>
                  <td className="py-2 text-right font-bold text-[var(--accent)]">{fmtUSD(d.rev)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}

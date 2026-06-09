"use client";

import { useMemo, useState } from "react";
import { Download, TrendingUp } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import BrandAvatar from "@/components/ktrend/BrandAvatar";
import { usePlan } from "@/components/ktrend/PlanContext";
import { BRANDS, BRAND_MAP } from "@/data/ktrend/brands";
import { INFLUENCER_MAP } from "@/data/ktrend/influencers";
import { CONTENT, fmtCompact, fmtUSD } from "@/data/ktrend/content";

const WEEKS = ["8주 전", "7주 전", "6주 전", "5주 전", "4주 전", "3주 전", "2주 전", "지난주"];

function seededTrend(seed: number, base: number): number[] {
  let s = seed;
  return WEEKS.map((_, i) => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const noise = (s / 0x7fffffff) * 0.4 + 0.8;
    return Math.round(base * (0.6 + i * 0.06) * noise);
  });
}

export default function ReportsPage() {
  const { isPro } = usePlan();
  const [brandId, setBrandId] = useState(BRANDS[0].id);
  const brand = BRAND_MAP[brandId];

  const stats = useMemo(() => {
    const items = CONTENT.filter((c) => c.brandId === brandId);
    const totalViews = items.reduce((s, c) => s + c.views, 0);
    const totalRevenue = items.reduce((s, c) => s + c.estRevenueUSD, 0);
    const avgRoas = items.length ? items.reduce((s, c) => s + c.estRoasX, 0) / items.length : 0;
    const seed = brandId.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);

    // 인플루언서 기여도
    const byInf = new Map<string, { views: number; rev: number; count: number }>();
    items.forEach((c) => {
      const cur = byInf.get(c.influencerId) ?? { views: 0, rev: 0, count: 0 };
      cur.views += c.views;
      cur.rev += c.estRevenueUSD;
      cur.count += 1;
      byInf.set(c.influencerId, cur);
    });
    const topInf = [...byInf.entries()]
      .sort((a, b) => b[1].rev - a[1].rev)
      .slice(0, 5);

    return {
      count: items.length,
      totalViews,
      totalRevenue,
      avgRoas: Math.round(avgRoas * 10) / 10,
      viewTrend: seededTrend(seed, totalViews / 8),
      revTrend: seededTrend(seed + 99, totalRevenue / 8),
      topInf,
    };
  }, [brandId]);

  // SOV: 선택 브랜드 + 동일 카테고리 경쟁사 3곳
  const sov = useMemo(() => {
    const sameCat = BRANDS.filter((b) => b.primaryCategory === brand.primaryCategory).slice(0, 4);
    const set = sameCat.includes(brand) ? sameCat : [brand, ...sameCat.slice(0, 3)];
    const data = set.map((b) => {
      const views = CONTENT.filter((c) => c.brandId === b.id).reduce((s, c) => s + c.views, 0);
      return { id: b.id, name: b.nameEn, views };
    });
    const total = data.reduce((s, d) => s + d.views, 0) || 1;
    return data.map((d) => ({ ...d, pct: Math.round((d.views / total) * 100) }));
  }, [brand]);

  const palette = ["#1A56DB", "#7C3AED", "#0E9F6E", "#F59E0B", "#EF4444"];
  let acc = 0;
  const conic = sov
    .map((d, i) => {
      const seg = `${palette[i % palette.length]} ${acc}% ${acc + d.pct}%`;
      acc += d.pct;
      return seg;
    })
    .join(", ");

  const maxView = Math.max(...stats.viewTrend, 1);
  const maxRev = Math.max(...stats.revTrend, 1);

  return (
    <PageShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-black tracking-tight">브랜드 성장 리포트</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            자사·경쟁사 틱톡 샵 성과를 기간별로 비교 분석합니다.
          </p>
        </div>
        <button
          className={`kt-btn px-4 py-2 text-[12px] ${isPro ? "kt-btn-primary" : "kt-btn-outline cursor-not-allowed"}`}
          disabled={!isPro}
        >
          <Download size={14} /> PDF 리포트 {isPro ? "다운로드" : "(Enterprise)"}
        </button>
      </div>

      {/* 브랜드 선택 */}
      <div className="mb-4">
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-[12px] font-semibold outline-none focus:border-[var(--accent)]"
        >
          {BRANDS.map((b) => (
            <option key={b.id} value={b.id}>{b.nameEn} · {b.nameKo}</option>
          ))}
        </select>
      </div>

      {/* 주요 지표 */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "분석 콘텐츠", v: `${stats.count}개` },
          { l: "누적 조회수", v: fmtCompact(stats.totalViews) },
          { l: "추정 기여 매출", v: fmtUSD(stats.totalRevenue) },
          { l: "평균 추정 ROAS", v: `${stats.avgRoas}x` },
        ].map((s) => (
          <div key={s.l} className="kt-card p-4">
            <div className="text-[11px] text-[var(--muted)]">{s.l}</div>
            <div className="mt-1 text-[20px] font-black text-[var(--accent)]">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* 조회수 추이 */}
        <div className="kt-card p-4 lg:col-span-2">
          <h3 className="mb-3 text-[13px] font-bold">주간 조회수 추이</h3>
          <div className="flex h-40 items-end gap-2">
            {stats.viewTrend.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-[var(--accent)] transition-all"
                  style={{ height: `${(v / maxView) * 100}%` }}
                  title={fmtCompact(v)}
                />
                <span className="text-[8px] text-[var(--muted)]">{WEEKS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SOV 도넛 */}
        <div className="kt-card p-4">
          <h3 className="mb-3 text-[13px] font-bold">경쟁사 점유율 (SOV)</h3>
          <div className="flex items-center gap-4">
            <div
              className="relative h-28 w-28 shrink-0 rounded-full"
              style={{ background: `conic-gradient(${conic})` }}
            >
              <div className="absolute inset-[22%] flex items-center justify-center rounded-full bg-white text-[10px] font-bold">
                점유율
              </div>
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

      {/* 매출 추이 + 고성과 인플루언서 */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="kt-card p-4 lg:col-span-1">
          <h3 className="mb-3 text-[13px] font-bold">어필리에이트 매출 추이</h3>
          <div className="flex h-32 items-end gap-1.5">
            {stats.revTrend.map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-emerald-500"
                  style={{ height: `${(v / maxRev) * 100}%` }}
                  title={fmtUSD(v)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="kt-card p-4 lg:col-span-2">
          <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-bold">
            <TrendingUp size={14} className="text-[var(--accent)]" /> 고성과 인플루언서 기여도
          </h3>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase text-[var(--muted)]">
                <th className="py-2">크리에이터</th>
                <th className="py-2 text-right">콘텐츠</th>
                <th className="py-2 text-right">조회수</th>
                <th className="py-2 text-right">기여 매출</th>
              </tr>
            </thead>
            <tbody>
              {stats.topInf.map(([id, d]) => {
                const inf = INFLUENCER_MAP[id];
                return (
                  <tr key={id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <BrandAvatar name={inf.name} size={22} />
                        <span className="font-semibold">@{inf.handle}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right">{d.count}</td>
                    <td className="py-2 text-right">{fmtCompact(d.views)}</td>
                    <td className="py-2 text-right font-bold text-[var(--accent)]">{fmtUSD(d.rev)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}

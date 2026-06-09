"use client";

import { useMemo, useState } from "react";
import { Eye, DollarSign, Users, Activity } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import BrandAvatar from "@/components/ktrend/BrandAvatar";
import { BRANDS } from "@/data/ktrend/brands";
import { CONTENT, formatCount, formatUsd } from "@/data/ktrend/content";

interface BrandStat {
  brandId: string;
  name: string;
  nameKo: string;
  index: number;
  views: number;
  revenue: number;
  collabs: number;
  avgRoas: number;
}

function buildStats(): BrandStat[] {
  const map = new Map<string, BrandStat>();
  BRANDS.forEach((b, index) => {
    map.set(b.id, { brandId: b.id, name: b.name, nameKo: b.nameKo, index, views: 0, revenue: 0, collabs: 0, avgRoas: 0 });
  });
  const roasAcc = new Map<string, number[]>();
  for (const c of CONTENT) {
    const s = map.get(c.brandId);
    if (!s) continue;
    s.views += c.views;
    s.revenue += c.estRevenue;
    s.collabs += 1;
    const arr = roasAcc.get(c.brandId) || [];
    arr.push(c.estRoas);
    roasAcc.set(c.brandId, arr);
  }
  for (const s of map.values()) {
    const arr = roasAcc.get(s.brandId) || [];
    s.avgRoas = arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
  }
  return [...map.values()].filter((s) => s.collabs > 0).sort((a, b) => b.views - a.views);
}

export default function ReportsPage() {
  const stats = useMemo(buildStats, []);
  const totalViews = useMemo(() => stats.reduce((a, b) => a + b.views, 0), [stats]);
  const [selected, setSelected] = useState(stats[0].brandId);

  const sel = stats.find((s) => s.brandId === selected)!;
  // SOV: 상위 6개 브랜드 + 선택 브랜드 비교
  const sov = useMemo(() => {
    const top = stats.slice(0, 6);
    if (!top.find((s) => s.brandId === selected)) top.push(sel);
    return top.sort((a, b) => b.views - a.views);
  }, [stats, selected, sel]);
  const maxSov = sov[0].views;

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">브랜드 성장 리포트</h1>
        <p className="mt-2 text-sm text-slate-500">
          2026년 6월 · 브랜드별 실시간 조회수, 어필리에이트 매출, 인플루언서 협업 수, 경쟁사 SOV를 비교 분석합니다.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* 좌: 브랜드 랭킹 */}
          <div className="lg:col-span-1">
            <h2 className="mb-3 text-sm font-bold text-slate-900">조회수 랭킹</h2>
            <div className="max-h-[70vh] space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2">
              {stats.map((s, rank) => (
                <button
                  key={s.brandId}
                  onClick={() => setSelected(s.brandId)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    selected === s.brandId ? "bg-rose-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="w-5 text-sm font-bold text-slate-400">{rank + 1}</span>
                  <BrandAvatar name={s.name} index={s.index} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{s.name}</span>
                    <span className="block truncate text-[11px] text-slate-400">{formatCount(s.views)} 조회</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 우: 선택 브랜드 상세 */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <BrandAvatar name={sel.name} index={sel.index} size={52} />
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{sel.name}</h2>
                  <p className="text-sm text-slate-400">{sel.nameKo}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <KpiCard icon={<Eye className="h-4 w-4" />} label="총 조회수" value={formatCount(sel.views)} />
                <KpiCard icon={<DollarSign className="h-4 w-4" />} label="추정 매출" value={formatUsd(sel.revenue)} accent />
                <KpiCard icon={<Users className="h-4 w-4" />} label="협업 콘텐츠" value={`${sel.collabs}건`} />
                <KpiCard icon={<Activity className="h-4 w-4" />} label="평균 ROAS" value={`${sel.avgRoas}x`} accent />
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">경쟁사 SOV (Share of Voice)</h3>
                  <span className="text-xs text-slate-400">조회수 점유율 기준</span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {sov.map((s) => {
                    const pct = ((s.views / totalViews) * 100).toFixed(1);
                    const isSel = s.brandId === selected;
                    return (
                      <div key={s.brandId} className="flex items-center gap-3">
                        <span className={`w-28 shrink-0 truncate text-xs ${isSel ? "font-bold text-rose-600" : "text-slate-500"}`}>
                          {s.name}
                        </span>
                        <div className="h-5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${isSel ? "bg-rose-500" : "bg-slate-300"}`}
                            style={{ width: `${(s.views / maxSov) * 100}%` }}
                          />
                        </div>
                        <span className="w-12 shrink-0 text-right text-xs font-medium text-slate-600">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                💡 본 리포트는 매주 월·목 오전 09:00 자동 갱신됩니다. Enterprise 플랜에서는 경쟁사 대비 자사 성과
                비교 리포트를 원클릭으로 추출할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
      <div className={`flex items-center gap-1.5 ${accent ? "text-rose-500" : "text-slate-400"}`}>
        {icon}
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
      </div>
      <p className={`mt-1.5 text-lg font-bold ${accent ? "text-rose-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, TrendingUp, TrendingDown, Megaphone, ShoppingBag, Sparkles } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import CreatorName from "@/components/ktrend/CreatorName";
import { usePlan } from "@/components/ktrend/PlanContext";
import { BRANDS, BRAND_MAP } from "@/data/ktrend/brands";
import { TIERS, type InfluencerTier } from "@/data/ktrend/meta";
import { loadContent, fmtCompact, fmtUSD, type Content } from "@/data/ktrend/content";

const palette = ["#1A56DB", "#7C3AED", "#0E9F6E", "#F59E0B", "#EF4444"];
const TIER_ORDER: InfluencerTier[] = ["mega", "macro", "micro"];

interface MonthRow { m: string; views: number; uploads: number; revenue: number; eng: number; }

export default function ReportsPage() {
  const { isPro } = usePlan();
  const [content, setContent] = useState<Content[] | null>(null);
  const [brandId, setBrandId] = useState(BRANDS[0].id);
  const [range, setRange] = useState<6 | 12>(12);
  const brand = BRAND_MAP[brandId];

  useEffect(() => { loadContent().then(setContent); }, []);

  const stats = useMemo(() => {
    if (!content) return null;
    const items = content.filter((c) => c.brandId === brandId);

    // 월별 집계
    const mMap = new Map<string, { views: number; uploads: number; revenue: number; eng: number }>();
    items.forEach((c) => {
      const m = c.date?.slice(0, 7);
      if (!m) return;
      const cur = mMap.get(m) ?? { views: 0, uploads: 0, revenue: 0, eng: 0 };
      cur.views += c.views; cur.uploads += 1; cur.revenue += c.estRevenueUSD; cur.eng += c.engagementRate;
      mMap.set(m, cur);
    });
    const allMonths: MonthRow[] = [...mMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([m, v]) => ({ m, views: v.views, uploads: v.uploads, revenue: v.revenue, eng: v.uploads ? v.eng / v.uploads : 0 }));
    const months = allMonths.slice(-range);

    // MoM 성장률 (마지막 2개월)
    const n = allMonths.length;
    const mom = n >= 2 && allMonths[n - 2].views > 0
      ? Math.round(((allMonths[n - 1].views - allMonths[n - 2].views) / allMonths[n - 2].views) * 100)
      : 0;

    // 티어 기여도
    const tierAgg: Record<InfluencerTier, { views: number; revenue: number; count: number }> = {
      mega: { views: 0, revenue: 0, count: 0 }, macro: { views: 0, revenue: 0, count: 0 }, micro: { views: 0, revenue: 0, count: 0 },
    };
    items.forEach((c) => { tierAgg[c.tier].views += c.views; tierAgg[c.tier].revenue += c.estRevenueUSD; tierAgg[c.tier].count += 1; });

    // 콘텐츠 유형 믹스
    const shop = items.filter((c) => c.isShop);
    const ad = items.filter((c) => c.isAd);
    const shopViews = shop.reduce((s, c) => s + c.views, 0);
    const adViews = ad.reduce((s, c) => s + c.views, 0);

    // 인플루언서 기여 Top
    const byInf = new Map<string, { views: number; rev: number; count: number }>();
    items.forEach((c) => {
      const cur = byInf.get(c.influencerId) ?? { views: 0, rev: 0, count: 0 };
      cur.views += c.views; cur.rev += c.estRevenueUSD; cur.count += 1;
      byInf.set(c.influencerId, cur);
    });
    const topInf = [...byInf.entries()].sort((a, b) => b[1].views - a[1].views).slice(0, 6);

    const totalViews = items.reduce((s, c) => s + c.views, 0);
    const totalRevenue = items.reduce((s, c) => s + c.estRevenueUSD, 0);
    const avgEng = items.length ? items.reduce((s, c) => s + c.engagementRate, 0) / items.length : 0;
    const avgRoas = items.length ? items.reduce((s, c) => s + c.estRoasX, 0) / items.length : 0;
    const bestMonth = allMonths.reduce<MonthRow | null>((mx, r) => (!mx || r.views > mx.views ? r : mx), null);
    const topTier = TIER_ORDER.reduce((a, b) => (tierAgg[b].views > tierAgg[a].views ? b : a), "micro" as InfluencerTier);

    return {
      items, months, mom, tierAgg, shopCount: shop.length, adCount: ad.length, shopViews, adViews,
      topInf, totalViews, totalRevenue, avgEng: Math.round(avgEng * 10) / 10, avgRoas: Math.round(avgRoas * 10) / 10,
      bestMonth, topTier,
    };
  }, [content, brandId, range]);

  // 카테고리 SOV
  const sov = useMemo(() => {
    const same = BRANDS.filter((b) => b.category === brand.category).sort((a, b) => b.totalViews - a.totalViews);
    const set = same.slice(0, 4);
    if (!set.find((b) => b.id === brandId)) set[set.length - 1] = brand;
    const total = set.reduce((s, b) => s + b.totalViews, 0) || 1;
    return set.map((b) => ({ id: b.id, name: b.name, pct: Math.round((b.totalViews / total) * 100) }));
  }, [brand, brandId]);

  const maxMonthViews = Math.max(...(stats?.months.map((m) => m.views) ?? [1]), 1);
  const tierTotalViews = stats ? TIER_ORDER.reduce((s, t) => s + stats.tierAgg[t].views, 0) || 1 : 1;

  const downloadReport = () => {
    if (!stats) return;
    const esc = (s: string) => s.replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[m] as string));
    const today = new Date().toISOString().slice(0, 10);
    const monthsRows = stats.months
      .map((r) => `<tr><td>${r.m}</td><td style="text-align:right">${r.views.toLocaleString()}</td><td style="text-align:right">${r.uploads}</td><td style="text-align:right">${Math.round(r.views / Math.max(1, r.uploads)).toLocaleString()}</td></tr>`)
      .join("");
    const tierRows = TIER_ORDER
      .map((t) => `<tr><td>${TIERS[t].label}</td><td style="text-align:right">${stats.tierAgg[t].count}</td><td style="text-align:right">${stats.tierAgg[t].views.toLocaleString()}</td><td style="text-align:right">${fmtUSD(stats.tierAgg[t].revenue)}</td></tr>`)
      .join("");
    const infRows = stats.topInf
      .map(([h, d]) => `<tr><td>@${esc(h)}</td><td style="text-align:right">${d.count}</td><td style="text-align:right">${d.views.toLocaleString()}</td><td style="text-align:right">${fmtUSD(d.rev)}</td></tr>`)
      .join("");
    const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(brand.name)} 리포트</title>
<style>
  *{font-family:'Malgun Gothic',Inter,system-ui,sans-serif;color:#2d3748}
  body{margin:28px;font-size:12px}
  h1{font-size:22px;margin:0 0 2px} h2{font-size:14px;margin:20px 0 6px;color:#1A56DB}
  .muted{color:#64748b;font-size:11px}
  .kpi{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
  .kpi div{border:1px solid #E2E8F0;border-radius:8px;padding:10px 14px;min-width:120px}
  .kpi b{display:block;font-size:18px;color:#1A56DB}
  table{width:100%;border-collapse:collapse;margin-top:6px;font-size:11px}
  th,td{border-bottom:1px solid #E2E8F0;padding:6px 8px;text-align:left}
  th{color:#64748b;font-size:10px;text-transform:uppercase}
  .foot{margin-top:24px;color:#94a3b8;font-size:10px}
  @media print{button{display:none}}
</style></head><body>
<h1>K-Trend Analytics — 브랜드 성장 리포트</h1>
<div class="muted">${esc(brand.name)} · 생성일 ${today} · 최근 ${range}개월 · 수익화 지표는 추정치</div>
<div class="kpi">
  <div><span class="muted">누적 조회수</span><b>${brand.totalViews.toLocaleString()}</b></div>
  <div><span class="muted">추정 기여 매출</span><b>${fmtUSD(stats.totalRevenue)}</b></div>
  <div><span class="muted">평균 참여율</span><b>${stats.avgEng}%</b></div>
  <div><span class="muted">평균 추정 ROAS</span><b>${stats.avgRoas}x</b></div>
  <div><span class="muted">영상 수</span><b>${brand.videos}</b></div>
  <div><span class="muted">전월 대비</span><b>${stats.mom > 0 ? "+" : ""}${stats.mom}%</b></div>
</div>
<h2>월별 조회수 · 업로드 추이</h2>
<table><thead><tr><th>월</th><th style="text-align:right">조회수</th><th style="text-align:right">업로드</th><th style="text-align:right">평균 조회</th></tr></thead><tbody>${monthsRows}</tbody></table>
<h2>인플루언서 규모별 기여도</h2>
<table><thead><tr><th>규모</th><th style="text-align:right">콘텐츠</th><th style="text-align:right">조회수</th><th style="text-align:right">추정 매출</th></tr></thead><tbody>${tierRows}</tbody></table>
<h2>콘텐츠 유형 믹스</h2>
<table><tbody>
  <tr><td>TikTok Shop</td><td style="text-align:right">${stats.shopCount}건</td><td style="text-align:right">조회 ${Math.round((stats.shopViews / (stats.totalViews || 1)) * 100)}%</td></tr>
  <tr><td>광고(#ad)</td><td style="text-align:right">${stats.adCount}건</td><td style="text-align:right">조회 ${Math.round((stats.adViews / (stats.totalViews || 1)) * 100)}%</td></tr>
</tbody></table>
<h2>고성과 인플루언서</h2>
<table><thead><tr><th>크리에이터</th><th style="text-align:right">콘텐츠</th><th style="text-align:right">조회수</th><th style="text-align:right">추정 매출</th></tr></thead><tbody>${infRows}</tbody></table>
<div class="foot">© ${new Date().getFullYear()} K-Trend Analytics · 본 리포트의 수수료율·ROAS·매출은 조회·참여·Shop 기반 추정치입니다.</div>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요."); return; }
    w.document.write(html);
    w.document.close();
  };

  return (
    <PageShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-black tracking-tight">브랜드 성장 리포트</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">자사·경쟁사 틱톡 성과를 기간·티어·콘텐츠 유형별로 심층 분석합니다.</p>
        </div>
        <button
          onClick={isPro ? downloadReport : undefined}
          disabled={!isPro || !stats}
          className={`kt-btn px-4 py-2 text-[12px] ${isPro ? "kt-btn-primary" : "kt-btn-outline cursor-not-allowed"} disabled:opacity-50`}
        >
          <Download size={14} /> PDF 리포트 {isPro ? "다운로드" : "(Pro 전용)"}
        </button>
      </div>

      {/* 컨트롤 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="rounded-md border border-[var(--border)] px-3 py-2 text-[12px] font-semibold outline-none focus:border-[var(--accent)]"
        >
          {BRANDS.map((b) => (<option key={b.id} value={b.id}>#{b.rank} {b.name}</option>))}
        </select>
        <a href={`/brand/${brandId}`} className="kt-btn kt-btn-outline px-3 py-2 text-[12px]">브랜드 상세 →</a>
        <div className="ml-auto inline-flex rounded-md border border-[var(--border)] p-0.5 text-[11px] font-semibold">
          {[6, 12].map((r) => (
            <button key={r} onClick={() => setRange(r as 6 | 12)} className={`rounded px-2.5 py-1 ${range === r ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}>최근 {r}개월</button>
          ))}
        </div>
      </div>

      {/* 핵심 지표 (확장) */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "누적 조회수", v: fmtCompact(brand.totalViews) },
          { l: "추정 기여 매출", v: stats ? fmtUSD(stats.totalRevenue) : "…" },
          { l: "평균 참여율", v: stats ? `${stats.avgEng}%` : "…" },
          { l: "평균 추정 ROAS", v: stats ? `${stats.avgRoas}x` : "…" },
          { l: "영상 수", v: `${brand.videos}` },
          { l: "평균 조회수", v: fmtCompact(brand.avgViews) },
          { l: "Shop 비율", v: `${brand.shopRatio}%` },
          {
            l: "전월 대비(MoM)",
            v: stats ? `${stats.mom > 0 ? "+" : ""}${stats.mom}%` : "…",
            up: stats ? stats.mom >= 0 : true,
            mom: true,
          },
        ].map((s) => (
          <div key={s.l} className="kt-card p-4">
            <div className="text-[11px] text-[var(--muted)]">{s.l}</div>
            <div className={`mt-1 flex items-center gap-1 text-[20px] font-black ${s.mom ? (s.up ? "text-emerald-600" : "text-rose-600") : "text-[var(--accent)]"}`}>
              {s.mom && (s.up ? <TrendingUp size={16} /> : <TrendingDown size={16} />)}
              {s.v}
            </div>
          </div>
        ))}
      </div>

      {/* 자동 인사이트 */}
      {stats && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-light)] px-4 py-3 text-[12px]">
          <Sparkles size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
          <p>
            <b>{brand.name}</b>는 최근 월 조회수가 전월 대비 <b className={stats.mom >= 0 ? "text-emerald-600" : "text-rose-600"}>{stats.mom > 0 ? "+" : ""}{stats.mom}%</b>
            {stats.mom >= 0 ? " 성장세" : " 둔화"}입니다. 최고 성과 월은 <b>{stats.bestMonth?.m ?? "—"}</b>,
            조회수 기여가 가장 큰 인플루언서 규모는 <b>{TIERS[stats.topTier].label}</b>이며,
            TikTok Shop 콘텐츠가 조회수의 <b>{Math.round((stats.shopViews / (stats.totalViews || 1)) * 100)}%</b>를 차지합니다.
          </p>
        </div>
      )}

      {!stats ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[var(--muted)]"><Loader2 className="animate-spin" size={16} /> 분석 로딩…</div>
      ) : (
        <>
          {/* 월별 추이 (조회수 + 업로드) */}
          <div className="mb-4 kt-card p-4">
            <h3 className="mb-3 text-[13px] font-bold">월별 조회수 · 업로드 추이</h3>
            <div className="flex h-44 items-end gap-2">
              {stats.months.map((r) => (
                <div key={r.m} className="group flex flex-1 flex-col items-center gap-1">
                  <span className="text-[8px] text-[var(--muted)]">{r.uploads}건</span>
                  <div className="relative w-full">
                    <div className="w-full rounded-t bg-[var(--accent)] transition-all hover:bg-[#1646b8]" style={{ height: `${(r.views / maxMonthViews) * 130}px` }} title={`${fmtCompact(r.views)} · 평균 ${fmtCompact(Math.round(r.views / Math.max(1, r.uploads)))}`} />
                  </div>
                  <span className="text-[8px] text-[var(--muted)]">{r.m.slice(2)}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-[var(--muted)]">막대=월 조회수, 상단 숫자=업로드 수. 마우스를 올리면 평균 조회수를 확인할 수 있습니다.</p>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            {/* 인플루언서 티어 기여도 */}
            <div className="kt-card p-4">
              <h3 className="mb-3 text-[13px] font-bold">인플루언서 규모별 기여도</h3>
              <div className="space-y-2.5">
                {TIER_ORDER.map((t) => {
                  const pct = Math.round((stats.tierAgg[t].views / tierTotalViews) * 100);
                  return (
                    <div key={t}>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-semibold" style={{ color: TIERS[t].color }}>{TIERS[t].label}</span>
                        <span className="text-[var(--muted)]">{pct}% · {fmtUSD(stats.tierAgg[t].revenue)}</span>
                      </div>
                      <div className="mt-0.5 h-2 w-full overflow-hidden rounded bg-slate-100">
                        <div className="h-full" style={{ width: `${pct}%`, background: TIERS[t].color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 콘텐츠 유형 믹스 */}
            <div className="kt-card p-4">
              <h3 className="mb-3 text-[13px] font-bold">콘텐츠 유형 믹스</h3>
              <div className="space-y-2 text-[11px]">
                <MixRow icon={<ShoppingBag size={13} />} label="TikTok Shop" count={stats.shopCount} pct={Math.round((stats.shopViews / (stats.totalViews || 1)) * 100)} color="#0E9F6E" />
                <MixRow icon={<Megaphone size={13} />} label="광고(#ad)" count={stats.adCount} pct={Math.round((stats.adViews / (stats.totalViews || 1)) * 100)} color="#F59E0B" />
                <MixRow icon={<Sparkles size={13} />} label="오가닉" count={Math.max(0, stats.items.length - stats.adCount)} pct={Math.max(0, 100 - Math.round((stats.adViews / (stats.totalViews || 1)) * 100))} color="#1A56DB" />
              </div>
            </div>

            {/* SOV */}
            <div className="kt-card p-4">
              <h3 className="mb-3 text-[13px] font-bold">카테고리 점유율 (SOV)</h3>
              <ul className="space-y-1.5">
                {sov.map((d, i) => (
                  <li key={d.id} className="text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className={`flex-1 truncate ${d.id === brandId ? "font-bold" : ""}`}>{d.name}</span>
                      <span className="font-semibold">{d.pct}%</span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded bg-slate-100">
                      <div className="h-full" style={{ width: `${d.pct}%`, background: palette[i % palette.length] }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 고성과 인플루언서 */}
          <div className="kt-card p-4">
            <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-bold"><TrendingUp size={14} className="text-[var(--accent)]" /> 고성과 인플루언서 기여도</h3>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase text-[var(--muted)]">
                  <th className="py-2">크리에이터</th><th className="py-2 text-right">콘텐츠</th>
                  <th className="py-2 text-right">조회수</th><th className="py-2 text-right">추정 매출</th>
                </tr>
              </thead>
              <tbody>
                {stats.topInf.map(([handle, d]) => (
                  <tr key={handle} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2"><CreatorName handle={handle} /></td>
                    <td className="py-2 text-right">{d.count}</td>
                    <td className="py-2 text-right">{fmtCompact(d.views)}</td>
                    <td className="py-2 text-right font-bold text-[var(--accent)]">{fmtUSD(d.rev)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageShell>
  );
}

function MixRow({ icon, label, count, pct, color }: { icon: React.ReactNode; label: string; count: number; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-semibold" style={{ color }}>{icon} {label}</span>
        <span className="text-[var(--muted)]">{count}건 · 조회 {pct}%</span>
      </div>
      <div className="mt-0.5 h-2 w-full overflow-hidden rounded bg-slate-100">
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Lock, Megaphone, ShoppingBag, Activity, CalendarClock, RefreshCw } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import ProGate from "@/components/ktrend/ProGate";
import BookmarkButton from "@/components/ktrend/BookmarkButton";
import ContentCard from "@/components/ktrend/ContentCard";
import { usePlan } from "@/components/ktrend/PlanContext";
import { BRAND_MAP } from "@/data/ktrend/brands";
import { CATEGORY_MAP } from "@/data/ktrend/meta";
import { loadContent, sortContent, fmtCompact, fmtUSD, type Content } from "@/data/ktrend/content";
import { brandHealthScore } from "@/data/ktrend/analysis";

export default function BrandDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isPro } = usePlan();
  const brand = BRAND_MAP[id];
  const [content, setContent] = useState<Content[] | null>(null);

  useEffect(() => {
    loadContent().then(setContent);
  }, []);

  const data = useMemo(() => {
    if (!content || !brand) return null;
    const items = content.filter((c) => c.brandId === brand.id);

    // 월별 추이 (조회수 + 업로드 수)
    const byMonth = new Map<string, { views: number; count: number }>();
    items.forEach((c) => {
      const m = c.date?.slice(0, 7);
      if (!m) return;
      const cur = byMonth.get(m) ?? { views: 0, count: 0 };
      cur.views += c.views;
      cur.count += 1;
      byMonth.set(m, cur);
    });
    const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-10);

    // 누적 성장(런칭) 곡선
    const sorted = [...items].filter((c) => c.date).sort((a, b) => a.date.localeCompare(b.date));
    let acc = 0;
    const cum = sorted.map((c) => { acc += c.views; return acc; });
    const step = Math.max(1, Math.floor(cum.length / 24));
    const curve = cum.filter((_, i) => i % step === 0);

    const topVideos = sortContent(items, "views").slice(0, 8);

    // 최근 1주 이슈 스냅샷
    const maxDate = items.reduce((mx, c) => (c.date > mx ? c.date : mx), "");
    const weekAgo = maxDate ? new Date(Date.parse(maxDate) - 7 * 86_400_000).toISOString().slice(0, 10) : "";
    const weekItems = items.filter((c) => c.date && c.date > weekAgo);
    const issues = sortContent(weekItems, "viral").slice(0, 5);

    return { items, months, curve, topVideos, weekItems, issues, weekAgo, maxDate };
  }, [content, brand]);

  if (!brand) {
    return (
      <PageShell>
        <div className="py-20 text-center">
          <p className="text-[14px] font-semibold">브랜드를 찾을 수 없습니다.</p>
          <Link href="/explorer" className="kt-btn kt-btn-primary mt-3 px-4 py-2 text-[12px]">탐색기로</Link>
        </div>
      </PageShell>
    );
  }

  const cat = CATEGORY_MAP[brand.category];
  const health = brandHealthScore(brand);
  const maxMonthViews = Math.max(...(data?.months.map((m) => m[1].views) ?? [1]), 1);
  const maxCurve = Math.max(...(data?.curve ?? [1]), 1);

  return (
    <PageShell>
      <ProGate label="브랜드 상세">
      <Link href="/explorer" className="mb-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--accent)]">
        <ArrowLeft size={13} /> 콘텐츠 탐색기
      </Link>

      {/* 헤더 */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-[14px] font-black text-white">#{brand.rank}</span>
        <div>
          <h1 className="text-[22px] font-black tracking-tight">{brand.name}</h1>
          <p className="text-[11px] text-[var(--muted)]">{cat?.icon} {cat?.nameKo} · 영상 {brand.videos} · 인플루언서 {brand.influencers}</p>
        </div>
        <BookmarkButton type="brand" id={brand.id} label size={14} className="ml-auto" />
      </div>

      {/* 수집/학습 상태 */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="kt-card flex items-center gap-3 p-3 text-[11px]">
          <RefreshCw size={16} className="text-emerald-500" />
          <div>
            <div className="font-bold">지속 콘텐츠 수집: 정상</div>
            <div className="text-[var(--muted)]">마지막 업데이트 {data?.maxDate ?? "—"} · 매일 자동 수집</div>
          </div>
        </div>
        <div className="kt-card flex items-center gap-3 p-3 text-[11px]">
          <CalendarClock size={16} className="text-[var(--accent)]" />
          <div>
            <div className="font-bold">주간 학습 업데이트</div>
            <div className="text-[var(--muted)]">매주 월·목 09:00 재학습 · 추정 지표 보정</div>
          </div>
        </div>
      </div>

      {/* 주요 지표 + 헬스스코어 */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="kt-card p-4 lg:col-span-2">
          <h3 className="mb-3 text-[13px] font-bold">주요 지표</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: "누적 조회수", v: fmtCompact(brand.totalViews) },
              { l: "평균 조회수", v: fmtCompact(brand.avgViews) },
              { l: "최고 조회수", v: fmtCompact(brand.maxViews) },
              { l: "Shop 비율", v: `${brand.shopRatio}%` },
            ].map((s) => (
              <div key={s.l} className="rounded-md bg-[var(--accent-light)]/60 p-3 text-center">
                <div className="text-[18px] font-black text-[var(--accent)]">{s.v}</div>
                <div className="text-[9px] text-[var(--muted)]">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="kt-card p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-bold"><Activity size={14} className="text-[var(--accent)]" /> 브랜드 헬스 스코어</h3>
          <div className="mb-2 flex items-end gap-1">
            <span className="text-[30px] font-black text-[var(--accent)]">{health.score}</span>
            <span className="mb-1.5 text-[11px] text-[var(--muted)]">/ 100</span>
          </div>
          <div className="space-y-1.5">
            {health.parts.map((p) => (
              <div key={p.label} className="text-[10px]">
                <div className="flex justify-between"><span className="text-[var(--muted)]">{p.label}</span><span className="font-semibold">{p.v}</span></div>
                <div className="mt-0.5 h-1 w-full overflow-hidden rounded bg-slate-100">
                  <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.min(100, p.v / (p.label === "조회력" ? 40 : p.label === "크리에이터 다양성" ? 25 : p.label === "Shop 전환" ? 20 : 15) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[var(--muted)]"><Loader2 className="animate-spin" size={16} /> 콘텐츠 분석 로딩…</div>
      ) : (
        <>
          {/* 추이 + 런칭 곡선 */}
          <div className="mb-4 grid gap-4 lg:grid-cols-2">
            <div className="kt-card p-4">
              <h3 className="mb-3 text-[13px] font-bold">월별 조회수 · 업로드 추이</h3>
              <div className="flex h-36 items-end gap-2">
                {data.months.map(([m, v]) => (
                  <div key={m} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[7px] text-[var(--muted)]">{v.count}건</span>
                    <div className="w-full rounded-t bg-[var(--accent)]" style={{ height: `${Math.max(2, (v.views / maxMonthViews) * 110)}px` }} title={fmtCompact(v.views)} />
                    <span className="text-[8px] text-[var(--muted)]">{m.slice(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="kt-card p-4">
              <h3 className="mb-3 text-[13px] font-bold">누적 성장(바이럴) 곡선</h3>
              <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-36 w-full">
                <polyline
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="1.5"
                  points={data.curve.map((v, i) => `${(i / Math.max(1, data.curve.length - 1)) * 100},${40 - (v / maxCurve) * 38}`).join(" ")}
                />
              </svg>
              <p className="text-[9px] text-[var(--muted)]">누적 조회수 {fmtCompact(data.curve[data.curve.length - 1] ?? 0)}</p>
            </div>
          </div>

          {/* 캠페인 분석 */}
          <div className="mb-4 kt-card p-4">
            <h3 className="mb-3 text-[13px] font-bold">캠페인 구성 분석</h3>
            <div className="flex flex-wrap gap-3 text-[11px]">
              <span className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700"><ShoppingBag size={13} /> TikTok Shop {brand.shopCount}건 ({brand.shopRatio}%)</span>
              <span className="flex items-center gap-1.5 rounded-md bg-amber-50 px-3 py-1.5 font-semibold text-amber-700"><Megaphone size={13} /> 광고(#ad) {brand.adCount}건</span>
              <span className="flex items-center gap-1.5 rounded-md bg-slate-50 px-3 py-1.5 font-semibold text-slate-600">오가닉 {Math.max(0, brand.videos - brand.adCount)}건</span>
            </div>
          </div>

          {/* 주간 이슈 스냅샷 (유료) */}
          <div className="mb-4 kt-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[13px] font-bold">최근 1주 이슈 스냅샷 <span className="text-[10px] font-normal text-[var(--muted)]">({data.weekAgo} ~ {data.maxDate})</span></h3>
              {!isPro && <span className="flex items-center gap-1 text-[9px] font-bold text-[var(--accent)]"><Lock size={10} /> 유료</span>}
            </div>
            <div className="relative">
              <div className={isPro ? "" : "kt-locked"}>
                {data.issues.length ? (
                  <ul className="space-y-1.5">
                    {data.issues.map((c) => (
                      <li key={c.id} className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-[11px]">
                        <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white">바이럴 {c.viralScore}</span>
                        <span className="flex-1 truncate">@{c.influencerId} · {CATEGORY_MAP[c.category]?.nameKo}</span>
                        <span className="font-semibold">{fmtCompact(c.views)} 조회</span>
                        <span className="text-[var(--muted)]">추정 {fmtUSD(c.estRevenueUSD)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-3 text-center text-[11px] text-[var(--muted)]">최근 1주 신규 이슈 콘텐츠 없음</p>
                )}
              </div>
              {!isPro && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Link href="/plans" className="kt-btn kt-btn-primary px-4 py-1.5 text-[11px]"><Lock size={12} /> Pro로 주간 스냅샷 보기</Link>
                </div>
              )}
            </div>
          </div>

          {/* 상위 콘텐츠 */}
          <h3 className="mb-2 text-[13px] font-bold">조회수 상위 콘텐츠</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {data.topVideos.map((c) => (
              <ContentCard key={c.id} content={c} />
            ))}
          </div>
        </>
      )}
      </ProGate>
    </PageShell>
  );
}

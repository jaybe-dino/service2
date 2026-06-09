"use client";

import { Zap, TrendingUp, Clock, ArrowUpRight, Bell } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import BrandAvatar from "@/components/ktrend/BrandAvatar";
import { BRAND_BY_ID, BRANDS } from "@/data/ktrend/brands";
import { COUNTRIES } from "@/data/ktrend/meta";
import { TRENDING_CONTENT, CONTENT, formatCount, formatUsd } from "@/data/ktrend/content";

const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
const BRAND_INDEX = Object.fromEntries(BRANDS.map((b, i) => [b.id, i]));

// CTA 제안 (콘텐츠 스타일 기반)
const CTA: Record<string, string> = {
  GRWM: "동일 포맷 GRWM 협업 3건 즉시 부킹 권장",
  Review: "리뷰 훅(Hook) 클립을 광고 소재로 부스팅",
  ASMR: "ASMR 컷을 숏폼 광고 A/B 테스트 소재로 활용",
  Skit: "스킷 바이럴 댓글 트렌드를 신규 캠페인 카피로 전환",
};

export default function ViralPage() {
  const alerts = (TRENDING_CONTENT.length ? TRENDING_CONTENT : CONTENT.slice(0, 8))
    .slice(0, 12)
    .sort((a, b) => a.daysAgo - b.daysAgo);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-white">
            <Zap className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">실시간 바이럴 감지</h1>
            <p className="mt-1 text-sm text-slate-500">
              매주 월·목 오전 09:00 정기 스캔 · 틱톡 내 이상 급증 트래픽과 신규 바이럴 영상을 자동 감지합니다.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Bell className="h-4 w-4 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">
            {alerts.length}건의 신규 바이럴 신호가 감지되었습니다.
          </p>
          <span className="ml-auto flex items-center gap-1 text-xs text-amber-600">
            <Clock className="h-3.5 w-3.5" /> 다음 스캔: 목요일 09:00 KST
          </span>
        </div>

        <div className="mt-6 space-y-3">
          {alerts.map((c, i) => {
            const brand = BRAND_BY_ID[c.brandId];
            const country = COUNTRY_BY_CODE[c.country];
            const spike = 120 + ((c.views % 700));
            return (
              <div
                key={c.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <BrandAvatar name={brand.name} index={BRAND_INDEX[c.brandId] ?? i} size={48} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{brand.name}</span>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">
                      <TrendingUp className="mr-0.5 inline h-3 w-3" /> +{spike}% 급증
                    </span>
                    <span className="text-xs text-slate-400">{country?.flag} {country?.nameKo} · {c.style}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-600">@{c.creator} · {c.caption}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>조회 {formatCount(c.views)}</span>
                    <span>추정매출 {formatUsd(c.estRevenue)}</span>
                    <span>ROAS {c.estRoas}x</span>
                    <span>{c.daysAgo === 0 ? "오늘 감지" : `${c.daysAgo}일 전 감지`}</span>
                  </div>
                </div>

                <div className="shrink-0 rounded-xl bg-slate-50 p-3 sm:w-64">
                  <p className="text-[11px] font-semibold text-slate-400">대응 전략 (CTA)</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">{CTA[c.style]}</p>
                  <button className="mt-2 flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700">
                    전략 실행 <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}

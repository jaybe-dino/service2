"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Lock, ShieldCheck, TrendingUp, Mail, Star } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import BrandAvatar from "@/components/ktrend/BrandAvatar";
import { INFLUENCERS } from "@/data/ktrend/influencers";
import { COUNTRIES, TIERS, CATEGORIES, type InfluencerTier } from "@/data/ktrend/meta";
import { formatCount } from "@/data/ktrend/content";

const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));
const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.labelKo]));

export default function InfluencersPage() {
  // 데모: 미구독(Basic) 상태로 가정 — 단가/컨택 잠금
  const isPro = false;
  const [tier, setTier] = useState<InfluencerTier | "all">("all");

  const list = useMemo(
    () => INFLUENCERS.filter((i) => tier === "all" || i.tier === tier),
    [tier],
  );

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">인플루언서 DB</h1>
            <p className="mt-2 text-sm text-slate-500">
              검증된 틱톡 샵 어필리에이트 크리에이터 {INFLUENCERS.length}명 · 진정성 지수·평균 성과·컨택 라인 관리.
            </p>
          </div>
          {!isPro && (
            <Link href="/plans" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Pro로 컨택 라인 잠금 해제
            </Link>
          )}
        </div>

        {/* 규모 필터 */}
        <div className="mt-6 flex flex-wrap gap-1.5">
          {(["all", ...TIERS.map((t) => t.key)] as (InfluencerTier | "all")[]).map((t) => (
            <button
              key={t}
              onClick={() => setTier(t)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                tier === t ? "border-rose-500 bg-rose-500 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t === "all" ? "전체" : TIERS.find((x) => x.key === t)?.labelKo}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((inf, i) => {
            const country = COUNTRY_BY_CODE[inf.country];
            return (
              <div key={inf.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <BrandAvatar name={inf.displayName} index={i + 1} size={48} rounded="rounded-full" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">@{inf.handle}</p>
                    <p className="truncate text-xs text-slate-400">
                      {country?.flag} {inf.displayName} · {inf.tier}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Stat label="팔로워" value={formatCount(inf.followers)} />
                  <Stat label="평균 조회" value={formatCount(inf.avgViews)} />
                  <Stat label="참여율" value={`${inf.engagement}%`} />
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">진정성 지수</span>
                  <span className="ml-auto flex items-center gap-1 text-sm font-bold text-emerald-700">
                    <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" /> {inf.authenticity}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {inf.categories.map((c) => (
                    <span key={c} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-500">
                      {CAT_LABEL[c]}
                    </span>
                  ))}
                  <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-600">
                    <TrendingUp className="mr-0.5 inline h-3 w-3" /> 수수료 {inf.avgCommission}%
                  </span>
                </div>

                {/* 단가 / 컨택 — Pro 잠금 (블러) */}
                <div className="relative mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className={isPro ? "" : "select-none blur-sm"}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">예상 단가/건</span>
                      <span className="font-bold text-slate-900">${inf.estRatePerPost.toLocaleString()}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-600">
                      <Mail className="h-3.5 w-3.5" /> {inf.email}
                    </div>
                  </div>
                  {!isPro && (
                    <Link
                      href="/plans"
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl bg-white/40 backdrop-blur-[1px]"
                    >
                      <span className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow">
                        <Lock className="h-3.5 w-3.5" /> Pro 잠금 해제
                      </span>
                      <span className="text-[11px] text-slate-500">또는 Add-on $19/명</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <p className="text-sm font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-400">{label}</p>
    </div>
  );
}

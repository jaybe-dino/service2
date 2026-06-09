"use client";

import { useMemo, useState } from "react";
import { Lock, Mail, Phone } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import BrandAvatar from "@/components/ktrend/BrandAvatar";
import { usePlan } from "@/components/ktrend/PlanContext";
import { INFLUENCERS } from "@/data/ktrend/influencers";
import { COUNTRIES, COUNTRY_MAP, TIERS, type CountryCode, type InfluencerTier } from "@/data/ktrend/meta";
import { fmtCompact, fmtUSD } from "@/data/ktrend/content";

const TIER_KEYS = Object.keys(TIERS) as InfluencerTier[];

export default function InfluencersPage() {
  const { isPro } = usePlan();
  const [country, setCountry] = useState<CountryCode | "ALL">("ALL");
  const [tier, setTier] = useState<InfluencerTier | "ALL">("ALL");

  const rows = useMemo(() => {
    return INFLUENCERS.filter(
      (i) => (country === "ALL" || i.country === country) && (tier === "ALL" || i.tier === tier),
    ).sort((a, b) => b.contributedRevenueUSD - a.contributedRevenueUSD);
  }, [country, tier]);

  return (
    <PageShell>
      <div className="mb-4">
        <h1 className="text-[20px] font-black tracking-tight">인플루언서 DB</h1>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          실제 매출을 발생시킨 검증된 틱톡 어필리에이트 크리에이터. 컨택 라인·평균 단가는 Add-on/Pro에서 해금됩니다.
        </p>
      </div>

      {/* 필터 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPills
          label="국가"
          options={[{ k: "ALL", v: "전체" }, ...COUNTRIES.map((c) => ({ k: c.code, v: `${c.flag} ${c.nameKo}` }))]}
          value={country}
          onChange={(k) => setCountry(k as CountryCode | "ALL")}
        />
        <FilterPills
          label="규모"
          options={[{ k: "ALL", v: "전체" }, ...TIER_KEYS.map((t) => ({ k: t, v: TIERS[t].label }))]}
          value={tier}
          onChange={(k) => setTier(k as InfluencerTier | "ALL")}
        />
      </div>

      {/* 테이블 */}
      <div className="kt-card overflow-x-auto">
        <table className="w-full min-w-[760px] text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase text-[var(--muted)]">
              <th className="p-3">크리에이터</th>
              <th className="p-3">규모</th>
              <th className="p-3">국가</th>
              <th className="p-3 text-right">팔로워</th>
              <th className="p-3 text-right">평균 조회수</th>
              <th className="p-3 text-right">기여 매출</th>
              <th className="p-3 text-right">진정성</th>
              <th className="p-3">시청자</th>
              <th className="p-3">컨택</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inf) => (
              <tr key={inf.id} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <BrandAvatar name={inf.name} size={26} />
                    <div>
                      <div className="font-bold">@{inf.handle}</div>
                      <div className="text-[10px] text-[var(--muted)]">{inf.name}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: TIERS[inf.tier].color }}>
                    {TIERS[inf.tier].label}
                  </span>
                </td>
                <td className="p-3">{COUNTRY_MAP[inf.country].flag} {inf.country}</td>
                <td className="p-3 text-right font-semibold">{fmtCompact(inf.followers)}</td>
                <td className="p-3 text-right">{fmtCompact(inf.avgViews)}</td>
                <td className="p-3 text-right font-bold text-[var(--accent)]">{fmtUSD(inf.contributedRevenueUSD)}</td>
                <td className="p-3 text-right">{inf.authenticity}</td>
                <td className="p-3 text-[10px] text-[var(--muted)]">여성 {inf.demographics.female}% · {inf.demographics.ageCore}</td>
                <td className="p-3">
                  {isPro ? (
                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex items-center gap-1"><Mail size={10} /> {inf.contact.email}</div>
                      <div className="flex items-center gap-1"><Phone size={10} /> {inf.contact.whatsapp}</div>
                      <div className="font-semibold text-[var(--accent)]">평균 {fmtUSD(inf.contact.avgRateUSD)}</div>
                    </div>
                  ) : (
                    <button className="flex items-center gap-1 rounded-md bg-[var(--fg)]/85 px-2 py-1 text-[9px] font-bold text-white">
                      <Lock size={10} /> 컨택 해금 ($19)
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}

function FilterPills({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { k: string; v: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-semibold text-[var(--muted)]">{label}</span>
      <div className="kt-noscrollbar flex gap-1 overflow-x-auto">
        {options.map((o) => (
          <button
            key={o.k}
            onClick={() => onChange(o.k)}
            className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors ${
              value === o.k
                ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
            }`}
          >
            {o.v}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Lock, Mail, Phone, Search } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import BrandAvatar from "@/components/ktrend/BrandAvatar";
import { usePlan } from "@/components/ktrend/PlanContext";
import { INFLUENCERS, contactFor } from "@/data/ktrend/influencers";
import { TIERS, type InfluencerTier } from "@/data/ktrend/meta";
import { fmtCompact, fmtUSD } from "@/data/ktrend/content";

const TIER_KEYS = Object.keys(TIERS) as InfluencerTier[];
const PAGE = 50;

export default function InfluencersPage() {
  const { isPro } = usePlan();
  const [tier, setTier] = useState<InfluencerTier | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [visible, setVisible] = useState(PAGE);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return INFLUENCERS.filter(
      (i) =>
        (tier === "ALL" || i.tier === tier) &&
        (!query ||
          i.handle.toLowerCase().includes(query) ||
          i.brands.some((b) => b.toLowerCase().includes(query))),
    );
  }, [tier, q]);

  return (
    <PageShell>
      <div className="mb-4">
        <h1 className="text-[20px] font-black tracking-tight">인플루언서 DB</h1>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          실제 매출을 발생시킨 검증된 틱톡 어필리에이트 크리에이터 상위 {INFLUENCERS.length}명. 컨택 라인은 Add-on/Pro에서 해금됩니다.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterPills
          label="규모"
          options={[{ k: "ALL", v: "전체" }, ...TIER_KEYS.map((t) => ({ k: t, v: TIERS[t].label }))]}
          value={tier}
          onChange={(k) => { setTier(k as InfluencerTier | "ALL"); setVisible(PAGE); }}
        />
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setVisible(PAGE); }}
            placeholder="핸들·브랜드 검색"
            className="rounded-md border border-[var(--border)] py-1.5 pl-7 pr-2 text-[11px] outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div className="kt-card overflow-x-auto">
        <table className="w-full min-w-[760px] text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase text-[var(--muted)]">
              <th className="p-3">#</th>
              <th className="p-3">크리에이터</th>
              <th className="p-3">규모</th>
              <th className="p-3 text-right">영상 수</th>
              <th className="p-3 text-right">평균 조회수</th>
              <th className="p-3 text-right">누적 조회수</th>
              <th className="p-3">협업 브랜드</th>
              <th className="p-3">컨택</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, visible).map((inf, i) => {
              const c = contactFor(inf.handle);
              return (
                <tr key={inf.handle} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50">
                  <td className="p-3 text-[var(--muted)]">{i + 1}</td>
                  <td className="p-3">
                    <a
                      href={`https://www.tiktok.com/@${inf.handle}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="flex items-center gap-2 hover:text-[var(--accent)]"
                    >
                      <BrandAvatar name={inf.handle} size={26} />
                      <span className="font-bold">@{inf.handle}</span>
                    </a>
                  </td>
                  <td className="p-3">
                    <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: TIERS[inf.tier].color }}>
                      {TIERS[inf.tier].label}
                    </span>
                  </td>
                  <td className="p-3 text-right">{inf.videos}</td>
                  <td className="p-3 text-right">{fmtCompact(inf.avgViews)}</td>
                  <td className="p-3 text-right font-bold text-[var(--accent)]">{fmtCompact(inf.totalViews)}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {inf.brands.slice(0, 3).map((b) => (
                        <span key={b} className="kt-badge-brand">{b}</span>
                      ))}
                      {inf.brands.length > 3 && <span className="text-[9px] text-[var(--muted)]">+{inf.brands.length - 3}</span>}
                    </div>
                  </td>
                  <td className="p-3">
                    {isPro ? (
                      <div className="space-y-0.5 text-[10px]">
                        <div className="flex items-center gap-1"><Mail size={10} /> {c.email}</div>
                        <div className="flex items-center gap-1"><Phone size={10} /> {c.whatsapp}</div>
                        <div className="font-semibold text-[var(--accent)]">평균 {fmtUSD(c.avgRateUSD)}</div>
                      </div>
                    ) : (
                      <button className="flex items-center gap-1 rounded-md bg-[var(--fg)]/85 px-2 py-1 text-[9px] font-bold text-white">
                        <Lock size={10} /> 컨택 해금 ($19)
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visible < rows.length && (
        <div className="mt-4 text-center">
          <button onClick={() => setVisible((v) => v + PAGE)} className="kt-btn kt-btn-outline px-6 py-2.5 text-[12px]">
            더 보기 ({(rows.length - visible).toLocaleString()}명 남음)
          </button>
        </div>
      )}
    </PageShell>
  );
}

function FilterPills({
  label, options, value, onChange,
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

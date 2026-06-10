"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Send } from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import CreatorName from "@/components/ktrend/CreatorName";
import BookmarkButton from "@/components/ktrend/BookmarkButton";
import InquiryModal from "@/components/ktrend/InquiryModal";
import ProGate from "@/components/ktrend/ProGate";
import { INFLUENCER_MAP } from "@/data/ktrend/influencers";
import { BRAND_MAP } from "@/data/ktrend/brands";
import { TIERS, tierOf, type InfluencerTier } from "@/data/ktrend/meta";
import { fmtCompact, loadContent, type Content } from "@/data/ktrend/content";

const TIER_KEYS = Object.keys(TIERS) as InfluencerTier[];
const PAGE = 50;

interface Inf { handle: string; tier: InfluencerTier; videos: number; totalViews: number; avgViews: number; brands: string[] }

export default function InfluencersPage() {
  const [tier, setTier] = useState<InfluencerTier | "ALL">("ALL");
  const [q, setQ] = useState("");
  const [propose, setPropose] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [content, setContent] = useState<Content[] | null>(null);

  useEffect(() => { loadContent().then(setContent); }, []);

  // 병합된 콘텐츠(정적+수집)에서 인플루언서 집계 → 콘텐츠 수와 매칭
  const influencers = useMemo<Inf[]>(() => {
    if (!content) return [];
    const map = new Map<string, { handle: string; videos: number; totalViews: number; brands: Set<string> }>();
    for (const c of content) {
      const e = map.get(c.influencerId) ?? { handle: c.influencerId, videos: 0, totalViews: 0, brands: new Set<string>() };
      e.videos += 1;
      e.totalViews += c.views;
      const bn = BRAND_MAP[c.brandId]?.name;
      if (bn) e.brands.add(bn);
      map.set(c.influencerId, e);
    }
    return [...map.values()]
      .map((e) => {
        const avgViews = Math.round(e.totalViews / e.videos);
        return { handle: e.handle, videos: e.videos, totalViews: e.totalViews, avgViews, tier: INFLUENCER_MAP[e.handle]?.tier ?? tierOf(avgViews), brands: [...e.brands] };
      })
      .sort((a, b) => b.totalViews - a.totalViews);
  }, [content]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return influencers.filter(
      (i) =>
        (tier === "ALL" || i.tier === tier) &&
        (!query ||
          i.handle.toLowerCase().includes(query) ||
          i.brands.some((b) => b.toLowerCase().includes(query))),
    );
  }, [influencers, tier, q]);

  return (
    <PageShell>
      <ProGate label="인플루언서 DB">
      <div className="mb-4">
        <h1 className="text-[20px] font-black tracking-tight">인플루언서 DB</h1>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          실제 매출을 발생시킨 검증된 틱톡 어필리에이트 크리에이터 {content ? influencers.length.toLocaleString() : "…"}명 (수집 콘텐츠 기준 자동 집계). 협업을 원하면 제안하기로 문의하세요.
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
              <th className="p-3">제안</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, visible).map((inf, i) => {
              return (
                <tr key={inf.handle} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50">
                  <td className="p-3 text-[var(--muted)]">{i + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <CreatorName handle={inf.handle} avatarSize={26} />
                      <BookmarkButton type="influencer" id={inf.handle} size={12} className="!px-1 !py-0.5" />
                      <Link href={`/influencer/${inf.handle}`} className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[9px] font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">상세</Link>
                    </div>
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
                    <button
                      onClick={() => setPropose(inf.handle)}
                      className="kt-btn kt-btn-primary px-2.5 py-1 text-[10px]"
                    >
                      <Send size={11} /> 제안하기
                    </button>
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

      {propose && (
        <InquiryModal kind="proposal" context={`@${propose}`} onClose={() => setPropose(null)} />
      )}
      </ProGate>
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

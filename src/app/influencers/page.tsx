"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Send, Users, X } from "lucide-react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import CreatorName from "@/components/ktrend/CreatorName";
import BookmarkButton from "@/components/ktrend/BookmarkButton";
import InquiryModal from "@/components/ktrend/InquiryModal";
import ProGate from "@/components/ktrend/ProGate";
import { usePlan } from "@/components/ktrend/PlanContext";
import { apiInquiry } from "@/lib/client-api";
import { INFLUENCER_MAP } from "@/data/ktrend/influencers";
import { BRAND_MAP } from "@/data/ktrend/brands";
import { TIERS, tierOf, type InfluencerTier } from "@/data/ktrend/meta";
import { fmtCompact, fmtUSD, loadContent, type Content } from "@/data/ktrend/content";

const TIER_KEYS = Object.keys(TIERS) as InfluencerTier[];
const PAGE = 50;

type SortKey = "reviews" | "revenue" | "views" | "roas";
const SORTS: { key: SortKey; label: string }[] = [
  { key: "reviews", label: "리뷰 많은 순" },
  { key: "revenue", label: "매출 잘나오는 순" },
  { key: "views", label: "조회수 높은 순" },
  { key: "roas", label: "비용대비 성과 순" },
];

interface Inf { handle: string; tier: InfluencerTier; videos: number; totalViews: number; avgViews: number; revenue: number; avgRoas: number; brands: string[] }

export default function InfluencersPage() {
  const { plan, isAdmin } = usePlan();
  const isAdvance = plan === "enterprise" || isAdmin; // 다중 제안은 Advance 전용
  const [tier, setTier] = useState<InfluencerTier | "ALL">("ALL");
  const [sort, setSort] = useState<SortKey>("reviews");
  const [q, setQ] = useState("");
  const [propose, setPropose] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [content, setContent] = useState<Content[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);

  const toggleSel = (handle: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(handle)) n.delete(handle); else n.add(handle);
      return n;
    });

  useEffect(() => { loadContent().then(setContent); }, []);

  // 병합된 콘텐츠(정적+수집)에서 인플루언서 집계 → 콘텐츠 수와 매칭
  const influencers = useMemo<Inf[]>(() => {
    if (!content) return [];
    const map = new Map<string, { handle: string; videos: number; totalViews: number; revenue: number; roasSum: number; brands: Set<string> }>();
    for (const c of content) {
      const e = map.get(c.influencerId) ?? { handle: c.influencerId, videos: 0, totalViews: 0, revenue: 0, roasSum: 0, brands: new Set<string>() };
      e.videos += 1;
      e.totalViews += c.views;
      e.revenue += c.estRevenueUSD;
      e.roasSum += c.estRoasX;
      const bn = BRAND_MAP[c.brandId]?.name;
      if (bn) e.brands.add(bn);
      map.set(c.influencerId, e);
    }
    return [...map.values()].map((e) => {
      const avgViews = Math.round(e.totalViews / e.videos);
      return {
        handle: e.handle, videos: e.videos, totalViews: e.totalViews, avgViews,
        revenue: e.revenue, avgRoas: Math.round((e.roasSum / e.videos) * 10) / 10,
        tier: INFLUENCER_MAP[e.handle]?.tier ?? tierOf(avgViews), brands: [...e.brands],
      };
    });
  }, [content]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = influencers.filter(
      (i) =>
        (tier === "ALL" || i.tier === tier) &&
        (!query ||
          i.handle.toLowerCase().includes(query) ||
          i.brands.some((b) => b.toLowerCase().includes(query))),
    );
    const cmp: Record<SortKey, (a: Inf, b: Inf) => number> = {
      reviews: (a, b) => b.videos - a.videos,
      revenue: (a, b) => b.revenue - a.revenue,
      views: (a, b) => b.totalViews - a.totalViews,
      roas: (a, b) => b.avgRoas - a.avgRoas,
    };
    return [...filtered].sort(cmp[sort]);
  }, [influencers, tier, q, sort]);

  return (
    <PageShell>
      <ProGate
        label="인플루언서"
        features={[
          "검증된 어필리에이트 크리에이터 전체 DB",
          "리뷰 많은 순·매출·조회수·비용대비 성과 정렬",
          "인플루언서별 성과 케이스·협업 브랜드 확인",
          "제안하기로 직접 협업 컨택",
        ]}
      >
      <div className="mb-4">
        <h1 className="text-[20px] font-black tracking-tight">인플루언서</h1>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          실제 매출을 발생시킨 검증된 틱톡 어필리에이트 크리에이터 {content ? influencers.length.toLocaleString() : "…"}명 (수집 콘텐츠 기준 자동 집계). 협업을 원하면 제안하기로 문의하세요.
        </p>
      </div>

      {/* 상위 정렬 버튼 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => { setSort(s.key); setVisible(PAGE); }}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
              sort === s.key
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            }`}
          >
            {s.label}
          </button>
        ))}
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
              <th className="p-3" title={isAdvance ? "함께 제안할 인플루언서 선택" : "다중 제안은 Advance 전용"}>{isAdvance ? "선택" : "—"}</th>
              <th className="p-3">#</th>
              <th className="p-3">크리에이터</th>
              <th className="p-3">규모</th>
              <th className="p-3 text-right">영상 수</th>
              <th className="p-3 text-right">평균 조회수</th>
              <th className="p-3 text-right">누적 조회수</th>
              <th className="p-3 text-right">기여 매출</th>
              <th className="p-3 text-right">ROAS</th>
              <th className="p-3">협업 브랜드</th>
              <th className="p-3">제안</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, visible).map((inf, i) => {
              return (
                <tr key={inf.handle} className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(inf.handle)}
                      disabled={!isAdvance}
                      onChange={() => toggleSel(inf.handle)}
                      title={isAdvance ? "함께 제안 선택" : "다중 제안은 Advance 전용"}
                      className="h-3.5 w-3.5 accent-[var(--accent)] disabled:opacity-40"
                    />
                  </td>
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
                  <td className="p-3 text-right font-semibold">{fmtUSD(inf.revenue)}</td>
                  <td className="p-3 text-right">{inf.avgRoas}x</td>
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

      {/* 다중 선택 → 함께 제안 (Advance 전용) */}
      {selected.size > 0 && (
        <div className="sticky bottom-3 z-30 mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--accent)] bg-white px-4 py-2.5 shadow-xl">
          <Users size={15} className="text-[var(--accent)]" />
          <span className="text-[12px] font-bold">{selected.size}명 선택됨</span>
          <button onClick={() => setSelected(new Set())} className="text-[11px] text-[var(--muted)] hover:underline">선택 해제</button>
          <div className="ml-auto flex items-center gap-2">
            {isAdvance ? (
              <button onClick={() => setBatchOpen(true)} className="kt-btn kt-btn-primary px-4 py-1.5 text-[12px]">
                <Send size={13} /> {selected.size}명에게 함께 제안
              </button>
            ) : (
              <>
                <span className="text-[11px] font-semibold text-[var(--muted)]">다중 제안은 Advance 전용</span>
                <Link href="/plans" className="kt-btn kt-btn-primary px-4 py-1.5 text-[12px]">Advance로 업그레이드</Link>
              </>
            )}
          </div>
        </div>
      )}

      {batchOpen && (
        <BatchProposeModal
          handles={[...selected]}
          onClose={() => setBatchOpen(false)}
          onDone={() => { setBatchOpen(false); setSelected(new Set()); }}
        />
      )}
      </ProGate>
    </PageShell>
  );
}

// 다중 제안 모달 (Advance) — 선택한 인플루언서 전원에게 동일 제안 발송
function BatchProposeModal({ handles, onClose, onDone }: { handles: string[]; onClose: () => void; onDone: () => void }) {
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!message.trim()) { setErr("제안 내용을 입력하세요."); return; }
    setBusy(true);
    try {
      await Promise.all(
        handles.map((h) => apiInquiry({ kind: "proposal", context: `@${h}`, message, budget, batch: true })),
      );
      setDone(true);
    } catch {
      setErr("일부 전송에 실패했습니다. 다시 시도해 주세요.");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 text-[var(--fg)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold">{handles.length}명에게 함께 제안</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)]"><X size={18} /></button>
        </div>
        {done ? (
          <div className="py-8 text-center">
            <Send className="mx-auto text-emerald-500" />
            <p className="mt-2 text-[13px] font-bold">{handles.length}명에게 제안이 접수되었습니다</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">진행 상황은 마이페이지 &gt; 제안한 인플루언서에서 확인할 수 있어요.</p>
            <button onClick={onDone} className="kt-btn kt-btn-primary mt-4 px-5 py-2 text-[12px]">닫기</button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-1 rounded-md bg-[var(--accent-light)] p-2">
              {handles.slice(0, 12).map((h) => <span key={h} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">@{h}</span>)}
              {handles.length > 12 && <span className="text-[10px] text-[var(--muted)]">+{handles.length - 12}명</span>}
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold">제안 내용 *</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="협업 제안 내용을 적어주세요. 선택한 전원에게 동일하게 전달됩니다." className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold">예산/단가 (선택)</span>
              <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="예: $500 / 영상" className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </label>
            {err && <p className="text-[11px] font-semibold text-rose-600">{err}</p>}
            <button onClick={submit} disabled={busy} className="kt-btn kt-btn-primary w-full py-2.5 text-[12px] disabled:opacity-50">
              <Send size={14} /> {busy ? "전송 중…" : `${handles.length}명에게 제안 보내기`}
            </button>
          </div>
        )}
      </div>
    </div>
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

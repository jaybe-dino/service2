"use client";

// 크리에이터 상세 — 신규(롤백 가능). 메뉴 비노출, /creator/[handle] 직접 접근.
// 영상 집계 + 유도 GMV(태그 제품) + 태그 제품 목록 + 영상 리스팅. 데이터: /api/creators/[handle].
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageShell from "@/components/ktrend/PageShell";
import { ArrowLeft, ExternalLink, Play, Eye, Heart, Megaphone, ShoppingBag, Package, Users, Film, TrendingUp, DollarSign, Target, Handshake, Clock, Plus, Check } from "lucide-react";
import { COUNTRIES } from "@/data/ktrend/meta";

const FLAG: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.id, c.flag]));
const compact = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K" : String(n));
const fmt = (n: number) => n.toLocaleString();
const TIER: Record<string, { label: string; cls: string }> = {
  mega: { label: "메가", cls: "bg-fuchsia-100 text-fuchsia-700" },
  macro: { label: "매크로", cls: "bg-indigo-100 text-indigo-700" },
  micro: { label: "마이크로", cls: "bg-slate-100 text-slate-600" },
};

interface Prod { id: string; title: string; brand: string; price: number; sold: number; gmv: number; country: string }
interface Vid { id: string; brand: string; views: number; likes: number; url: string; country: string; isAd: boolean; isShop: boolean; postedAt: string; hasProduct: boolean }
interface Creator {
  handle: string; videos: number; totalViews: number; avgViews: number; maxViews: number; brands: string[]; countries: string[];
  shopVideos: number; adVideos: number; shopRatio: number; adRatio: number; engage: number; lastPosted: string; daysSince: number;
  tier: string; estRateUsd: number; fit: number; reasons: string[]; inducedGmv: number; taggedProducts: number;
}
interface Data { creator: Creator; products: Prod[]; videos: Vid[] }

export default function CreatorDetailPage() {
  const params = useParams();
  const handle = decodeURIComponent(String(params?.handle || ""));
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [added, setAdded] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    fetch(`/api/creators/${encodeURIComponent(handle)}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`); return j; })
      .then((j) => { if (alive) setD(j as Data); })
      .catch((e) => { if (alive) setErr(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    fetch("/api/admin/session").then((r) => r.json()).then((j) => { if (alive) setIsAdmin(!!j?.authed); }).catch(() => {});
    return () => { alive = false; };
  }, [handle]);

  async function addToOutreach() {
    if (!d) return;
    setAddMsg(null);
    try {
      const r = await fetch("/api/admin/outreach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addTarget", handle, score: d.creator.fit }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setAdded(true); setAddMsg(j.added > 0 ? "아웃리치에 추가됨" : "이미 아웃리치에 있음");
    } catch (e) { setAddMsg(String((e as Error).message || e)); }
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <Link href="/creators" className="mb-3 inline-flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--accent)]"><ArrowLeft size={13} /> 크리에이터 랭킹</Link>

        {loading ? (
          <div className="py-16 text-center text-[13px] text-[var(--muted)]">불러오는 중…</div>
        ) : err ? (
          <div className="rounded-xl border border-[var(--border)] p-8 text-center text-[13px] text-rose-600">{err}</div>
        ) : d ? (
          <>
            {/* 헤더 */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <div className="bg-gradient-to-br from-[var(--accent)]/8 to-transparent p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-[18px] font-black text-[var(--accent)] ring-1 ring-black/5">{(handle || "?").slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0">
                    <h1 className="flex items-center gap-1.5 text-[21px] font-black leading-tight">
                      <Users size={17} className="text-[var(--accent)]" /> @{handle}
                      <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${(TIER[d.creator.tier] || TIER.micro).cls}`}>{(TIER[d.creator.tier] || TIER.micro).label}</span>
                    </h1>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--muted)]">
                      {d.creator.countries.length > 0 && <span>{d.creator.countries.map((c) => FLAG[c.toLowerCase()] || "🌐").join(" ")}</span>}
                      {d.creator.brands.length > 0 && <span className="truncate">{d.creator.brands.slice(0, 6).join(" · ")}</span>}
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {isAdmin && (
                      <button onClick={addToOutreach} disabled={added}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold transition ${added ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-[var(--accent)] text-white hover:opacity-90"}`}>
                        {added ? <Check size={14} /> : <Plus size={14} />} {added ? "추가됨" : "아웃리치 추가"}
                      </button>
                    )}
                    <a href={`https://www.tiktok.com/@${handle}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[12px] font-bold text-[var(--muted)] hover:text-[var(--accent)]">
                      <ExternalLink size={14} /> 틱톡
                    </a>
                  </div>
                </div>
                {addMsg && <p className="mt-2 text-[11px] font-semibold text-emerald-700">{addMsg}</p>}

                {/* 아웃리치 판단 지표 */}
                <div className="mt-4 flex flex-wrap items-stretch gap-2.5">
                  <div className="flex min-w-[168px] flex-1 items-center gap-3 rounded-xl bg-white/70 p-3 ring-1 ring-black/5">
                    <FitGauge score={d.creator.fit} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]"><Target size={11} /> 적합도</div>
                      <div className="text-[20px] font-black leading-none">{d.creator.fit}<span className="text-[11px] font-semibold text-[var(--muted)]">/100</span></div>
                    </div>
                  </div>
                  <Stat icon={<Handshake size={13} />} label="협업성향 (샵/광고)" value={`${d.creator.shopRatio}% / ${d.creator.adRatio}%`} />
                  <Stat icon={<Heart size={13} />} label="평균 참여율" value={`${d.creator.engage}%`} />
                  <Stat icon={<DollarSign size={13} />} label="추정 협업단가" value={d.creator.estRateUsd > 0 ? `~$${compact(d.creator.estRateUsd)}` : "—"} accent />
                  <Stat icon={<Clock size={13} />} label="최근 활동" value={d.creator.lastPosted ? `${d.creator.daysSince}일 전` : "—"} />
                </div>
                {d.creator.reasons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.creator.reasons.map((r, i) => (
                      <span key={i} className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">✓ {r}</span>
                    ))}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <Stat icon={<Film size={13} />} label="영상" value={fmt(d.creator.videos)} />
                  <Stat icon={<Eye size={13} />} label="누적 조회수" value={compact(d.creator.totalViews)} />
                  <Stat icon={<TrendingUp size={13} />} label="평균 조회수" value={compact(d.creator.avgViews)} />
                  <Stat icon={<DollarSign size={13} />} label="유도 GMV" value={d.creator.inducedGmv > 0 ? `$${compact(d.creator.inducedGmv)}` : "—"} accent />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">최고 조회 {compact(d.creator.maxViews)}</span>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700">샵 영상 {fmt(d.creator.shopVideos)}</span>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700">광고 {fmt(d.creator.adVideos)}</span>
                  {d.creator.taggedProducts > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-700">태그 제품 {fmt(d.creator.taggedProducts)}</span>}
                </div>
              </div>
            </div>

            {/* 태그한 제품 (유도 GMV) */}
            <div className="mt-5">
              <h2 className="mb-2 text-[14px] font-black">태그한 제품 <span className="text-[11px] font-normal text-[var(--muted)]">· 이 크리에이터가 영상에 태그한 제품(유도 GMV 순)</span></h2>
              {d.products.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-[12px] text-[var(--muted)]">태그된 제품 정보가 아직 없습니다. (영상에 상품 태그가 있을 때 채워집니다)</p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {d.products.map((p) => (
                    <Link key={p.id} href={`/product/${encodeURIComponent(p.id)}`}
                      className="group rounded-xl border border-[var(--border)] bg-white p-3.5 hover:border-[var(--accent)] hover:shadow-md">
                      <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]"><span>{FLAG[p.country] || "🌐"}</span><Package size={11} /> {p.brand || "브랜드 미상"}</div>
                      <div className="mt-1 line-clamp-2 text-[12px] font-bold group-hover:text-[var(--accent)]">{p.title || "(제목 없음)"}</div>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <div className="text-[10px] text-[var(--muted)]">추정 GMV</div>
                          <div className="text-[15px] font-black text-[var(--accent)]">${compact(p.gmv)}</div>
                        </div>
                        <div className="text-right text-[10px] text-[var(--muted)]">판매 {compact(p.sold)}<br />${fmt(p.price)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* 영상 리스팅 */}
            <div className="mt-5">
              <h2 className="mb-2 text-[14px] font-black">영상 <span className="text-[11px] font-normal text-[var(--muted)]">· 조회수 상위 {d.videos.length}개</span></h2>
              {d.videos.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-[12px] text-[var(--muted)]">수집된 영상이 없습니다.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {d.videos.map((v) => {
                    const eng = v.views > 0 ? Math.round((v.likes / v.views) * 1000) / 10 : 0;
                    return (
                      <a key={v.id} href={v.url || undefined} target="_blank" rel="noopener noreferrer"
                        className="group flex flex-col rounded-xl border border-[var(--border)] bg-white p-3.5 transition hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <span className="truncate text-[11px] font-semibold text-[var(--muted)]">{v.brand || "—"}</span>
                          <span className="text-[13px]">{FLAG[v.country] || "🌐"}</span>
                        </div>
                        <div className="mt-2.5 flex items-end gap-3">
                          <div>
                            <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]"><Eye size={11} /> 조회수</div>
                            <div className="text-[17px] font-black leading-none">{compact(v.views)}</div>
                          </div>
                          <div>
                            <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]"><Heart size={11} /> 좋아요</div>
                            <div className="text-[13px] font-bold leading-none text-rose-500">{compact(v.likes)}</div>
                          </div>
                          <div className="ml-auto text-right">
                            <div className="text-[10px] text-[var(--muted)]">참여율</div>
                            <div className={`text-[13px] font-bold leading-none ${eng >= 8 ? "text-emerald-600" : "text-slate-600"}`}>{eng}%</div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-1">
                          {v.hasProduct && <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700"><Package size={9} /> 제품태그</span>}
                          {v.isAd && <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700"><Megaphone size={9} /> 광고</span>}
                          {v.isShop && <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700"><ShoppingBag size={9} /> 샵</span>}
                          {v.postedAt && <span className="text-[9px] text-slate-400">{v.postedAt}</span>}
                          <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--muted)] group-hover:text-[var(--accent)]"><Play size={10} /> 보기</span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-[120px] flex-1 rounded-xl bg-white/70 p-3 ring-1 ring-black/5">
      <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">{icon} {label}</div>
      <div className={`mt-0.5 text-[16px] font-black ${accent ? "text-[var(--accent)]" : ""}`}>{value}</div>
    </div>
  );
}

// 적합도 게이지(SVG 링) — 외부 의존 0. 색상: 70+ 초록, 40+ 앰버, 그 외 슬레이트.
function FitGauge({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, score));
  const R = 16, C = 2 * Math.PI * R;
  const color = s >= 70 ? "#059669" : s >= 40 ? "#d97706" : "#64748b";
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="shrink-0">
      <circle cx="22" cy="22" r={R} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      <circle cx="22" cy="22" r={R} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={C * (1 - s / 100)} transform="rotate(-90 22 22)" />
      <text x="22" y="26" textAnchor="middle" className="fill-current text-[12px] font-black" style={{ fill: color }}>{s}</text>
    </svg>
  );
}

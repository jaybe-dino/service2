"use client";

// 제품 상세 — 신규(롤백 가능). 메뉴 비노출, /product/[id] 직접 접근.
// 제품 지표 + 이 제품/브랜드를 홍보한 크리에이터 + 크리에이터 영상 리스팅 + 리메이크 CTA(Glovek 차별점).
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageShell from "@/components/ktrend/PageShell";
import { Info, ExternalLink, Wand2, ArrowLeft, Package, Play, Heart, Eye, Megaphone, ShoppingBag, Users, Film, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { COUNTRIES } from "@/data/ktrend/meta";

interface VideoRow { id: string; handle: string; views: number; likes: number; url: string; country: string; isAd: boolean; isShop: boolean; postedAt?: string; direct?: boolean }
interface CreatorRow { handle: string; videos: number; totalViews: number; maxViews: number; direct?: boolean }
interface TrendPoint { date: string; sold: number; gmv: number }
interface Trend { series: TrendPoint[]; soldGrowth: number; soldGrowthPct: number | null; days: number }
interface Detail {
  matchMode?: "direct" | "brand";
  trend?: Trend | null;
  product: { id: string; brand: string; title: string; price: number; currency: string; sold: number; gmv: number; commission: number | null; url: string };
  relatedVideos: VideoRow[];
  relatedCreators: CreatorRow[];
}

const FLAG: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.id, c.flag]));
const fmt = (n: number) => n.toLocaleString();
const compact = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K" : String(n));
const engage = (v: VideoRow) => (v.views > 0 ? Math.round((v.likes / v.views) * 1000) / 10 : 0);

const DirectBadge = () => (
  <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">직접 태그</span>
);

export default function ProductDetailPage() {
  const params = useParams();
  const id = decodeURIComponent(String(params?.id || ""));
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [vSort, setVSort] = useState<"views" | "engage" | "recent">("views");

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    fetch(`/api/products/${encodeURIComponent(id)}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`); return j; })
      .then((j) => { if (alive) setD(j as Detail); })
      .catch((e) => { if (alive) setErr(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  const money = (n: number, cur: string) => `${cur === "USD" ? "$" : ""}${fmt(n)}${cur !== "USD" ? " " + cur : ""}`;

  const videos = useMemo(() => {
    const list = d?.relatedVideos ? [...d.relatedVideos] : [];
    // 직접 태그는 항상 우선, 그 안에서 선택 정렬.
    list.sort((a, b) => {
      if (!!a.direct !== !!b.direct) return a.direct ? -1 : 1;
      if (vSort === "engage") return engage(b) - engage(a);
      if (vSort === "recent") return (b.postedAt || "").localeCompare(a.postedAt || "");
      return b.views - a.views;
    });
    return list;
  }, [d, vSort]);

  const totalReach = useMemo(() => (d?.relatedVideos || []).reduce((s, v) => s + v.views, 0), [d]);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <Link href="/products" className="mb-3 inline-flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--accent)]"><ArrowLeft size={13} /> 제품 랭킹</Link>

        {loading ? (
          <div className="py-16 text-center text-[13px] text-[var(--muted)]">불러오는 중…</div>
        ) : err ? (
          <div className="rounded-xl border border-[var(--border)] p-8 text-center text-[13px] text-rose-600">{err}</div>
        ) : d ? (
          <>
            {/* ── 제품 헤더 ── */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <div className="bg-gradient-to-br from-[var(--accent)]/8 to-transparent p-5">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--accent)]"><Package size={13} /> {d.product.brand || "브랜드 미상"}</div>
                <h1 className="mt-1 text-[21px] font-black leading-tight">{d.product.title || "(제목 없음)"}</h1>

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <Stat label="가격" value={money(d.product.price, d.product.currency)} />
                  <Stat label="판매량" value={fmt(d.product.sold)} />
                  <Stat label="추정 GMV" value={money(d.product.gmv, d.product.currency)} accent />
                  <Stat label="커미션" value={d.product.commission != null ? `${d.product.commission}%` : "—"} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/remake/studio?product=${encodeURIComponent(d.product.id)}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-[13px] font-bold text-white shadow-sm hover:opacity-95">
                    <Wand2 size={15} /> 이 상품형 광고 리메이크
                  </Link>
                  {d.product.url && (
                    <a href={d.product.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-[13px] font-bold text-[var(--muted)] hover:text-[var(--accent)]">
                      <ExternalLink size={14} /> TikTok Shop에서 보기
                    </a>
                  )}
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-[11px] text-[var(--muted)]">
                  <Info size={12} className="mt-0.5 shrink-0 text-slate-400" /> 추정 GMV = 가격 × 공개 판매수. 실제 매출과 다를 수 있습니다.
                </p>
              </div>
            </div>

            {/* ── 판매 추이 (kalodata식) ── */}
            <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-black">판매 추이 <span className="text-[11px] font-normal text-[var(--muted)]">· 최근 {d.trend?.days ?? 0}일 스냅샷</span></h2>
                {d.trend && d.trend.soldGrowth !== 0 && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${d.trend.soldGrowth > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
                    {d.trend.soldGrowth > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {d.trend.soldGrowth > 0 ? "+" : "-"}{fmt(Math.abs(d.trend.soldGrowth))} 판매{d.trend.soldGrowthPct != null ? ` (${d.trend.soldGrowth > 0 ? "+" : "-"}${Math.abs(d.trend.soldGrowthPct)}%)` : ""}
                  </span>
                )}
              </div>
              {d.trend && d.trend.series.length >= 2 ? (
                <Sparkline series={d.trend.series} />
              ) : (
                <div className="mt-2 flex h-20 items-center justify-center rounded-lg bg-slate-50 text-[11px] text-[var(--muted)]">
                  일별 스냅샷이 2일 이상 누적되면 판매·GMV 추이와 성장률이 표시됩니다.
                </div>
              )}
            </div>

            {/* ── 콘텐츠 성과 요약 ── */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <MiniStat icon={<Users size={14} />} label="크리에이터" value={fmt(d.relatedCreators?.length || 0)} />
              <MiniStat icon={<Film size={14} />} label="관련 영상" value={fmt(d.relatedVideos?.length || 0)} />
              <MiniStat icon={<TrendingUp size={14} />} label="누적 조회수" value={compact(totalReach)} accent />
            </div>

            {/* ── 관련 크리에이터 ── */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-black">관련 크리에이터 <span className="text-[11px] font-normal text-[var(--muted)]">· {d.matchMode === "direct" ? "이 제품을 직접 태그한 인플루언서" : "이 브랜드를 홍보한 인플루언서"}</span></h2>
              </div>
              {(!d.relatedCreators || d.relatedCreators.length === 0) ? (
                <Empty text="매칭된 크리에이터가 아직 없습니다." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-50 text-[11px] text-[var(--muted)]"><tr><th className="p-2.5">#</th><th className="p-2.5">크리에이터</th><th className="p-2.5 text-right">영상수</th><th className="p-2.5 text-right">총 조회수</th><th className="p-2.5 text-right">최고 조회수</th></tr></thead>
                    <tbody>
                      {d.relatedCreators.map((c, i) => (
                        <tr key={c.handle} className="border-t border-slate-100 hover:bg-slate-50/60">
                          <td className="p-2.5"><span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${i < 3 ? "bg-amber-100 text-amber-700" : "text-slate-400"}`}>{i + 1}</span></td>
                          <td className="p-2.5 font-semibold"><span className="inline-flex items-center gap-1.5"><Link href={`/creator/${encodeURIComponent(c.handle)}`} className="hover:text-[var(--accent)]">@{c.handle}</Link>{c.direct && <DirectBadge />}</span></td>
                          <td className="p-2.5 text-right">{fmt(c.videos)}</td>
                          <td className="p-2.5 text-right font-bold text-[var(--accent)]">{compact(c.totalViews)}</td>
                          <td className="p-2.5 text-right text-[var(--muted)]">{compact(c.maxViews)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── 크리에이터 영상 리스팅 (카드) ── */}
            <div className="mt-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[14px] font-black">크리에이터 영상 <span className="text-[11px] font-normal text-[var(--muted)]">· {d.matchMode === "direct" ? "제품 직접 태그 우선" : "같은 브랜드"} · {videos.length}개</span></h2>
                {videos.length > 1 && (
                  <div className="flex gap-1">
                    {([["views", "조회수순"], ["engage", "참여율순"], ["recent", "최신순"]] as const).map(([k, l]) => (
                      <button key={k} onClick={() => setVSort(k)} className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${vSort === k ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{l}</button>
                    ))}
                  </div>
                )}
              </div>
              {videos.length === 0 ? (
                <Empty text="관련 영상이 아직 없습니다. 수집이 진행되면 채워집니다." />
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {videos.map((v) => (
                    <VideoCard key={v.id} v={v} />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}

function Sparkline({ series }: { series: TrendPoint[] }) {
  const W = 600, H = 64, pad = 4;
  const vals = series.map((s) => s.sold);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const n = series.length;
  const x = (i: number) => pad + (i / Math.max(1, n - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);
  const line = series.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.sold).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${H - pad} L${x(0).toFixed(1)},${H - pad} Z`;
  const up = vals[n - 1] >= vals[0];
  const stroke = up ? "#059669" : "#e11d48";
  return (
    <div className="mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-16 w-full">
        <path d={area} fill={stroke} opacity={0.08} />
        <path d={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-[var(--muted)]">
        <span>{series[0].date}</span>
        <span>판매 누적 {series[0].sold.toLocaleString()} → {series[n - 1].sold.toLocaleString()}</span>
        <span>{series[n - 1].date}</span>
      </div>
    </div>
  );
}

function VideoCard({ v }: { v: VideoRow }) {
  const eng = engage(v);
  return (
    <a href={v.url || undefined} target="_blank" rel="noopener noreferrer"
      className={`group relative flex flex-col rounded-xl border p-3.5 transition hover:shadow-md ${v.direct ? "border-emerald-200 bg-emerald-50/30" : "border-[var(--border)] bg-white"}`}>
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-black text-slate-500">{(v.handle || "?").slice(0, 1).toUpperCase()}</span>
          <span className="truncate text-[12px] font-bold group-hover:text-[var(--accent)]">@{v.handle || "unknown"}</span>
        </div>
        <span className="text-[13px]">{FLAG[v.country] || "🌐"}</span>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]"><Eye size={11} /> 조회수</div>
          <div className="text-[17px] font-black leading-none">{compact(v.views)}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]"><Heart size={11} /> 좋아요</div>
          <div className="text-[14px] font-bold leading-none text-rose-500">{compact(v.likes)}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] text-[var(--muted)]">참여율</div>
          <div className={`text-[14px] font-bold leading-none ${eng >= 8 ? "text-emerald-600" : "text-slate-600"}`}>{eng}%</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {v.direct && <DirectBadge />}
        {v.isAd && <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700"><Megaphone size={9} /> 광고</span>}
        {v.isShop && <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700"><ShoppingBag size={9} /> 샵</span>}
        {v.postedAt && <span className="text-[9px] text-slate-400">{v.postedAt}</span>}
        <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--muted)] group-hover:text-[var(--accent)]"><Play size={10} /> 영상 보기</span>
      </div>
    </a>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-white/70 p-3 ring-1 ring-black/5">
      <div className="text-[10px] text-[var(--muted)]">{label}</div>
      <div className={`mt-0.5 text-[16px] font-black ${accent ? "text-[var(--accent)]" : ""}`}>{value}</div>
    </div>
  );
}

function MiniStat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted)]">{icon} {label}</div>
      <div className={`mt-1 text-[18px] font-black ${accent ? "text-[var(--accent)]" : ""}`}>{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-[12px] text-[var(--muted)]">{text}</p>;
}

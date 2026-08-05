"use client";

// 제품 상세 (kalodata product/detail형) — 신규(롤백 가능). 메뉴 비노출, /product/[id] 직접 접근.
// 제품 지표 + 판매/GMV 이중축 추이(기간) + 연결 크리에이터(유도 GMV·적합도·아웃리치) + 영상 리스팅 + 동일 카테고리 + 리메이크 CTA.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageShell from "@/components/ktrend/PageShell";
import { Info, ExternalLink, Wand2, ArrowLeft, Package, Play, Heart, Eye, Megaphone, ShoppingBag, Users, Film, TrendingUp, ArrowUpRight, ArrowDownRight, Plus, Check, Trophy } from "lucide-react";
import { COUNTRIES } from "@/data/ktrend/meta";

interface VideoRow { id: string; handle: string; views: number; likes: number; url: string; country: string; isAd: boolean; isShop: boolean; postedAt?: string; direct?: boolean }
interface ConnectedCreator { handle: string; videos: number; totalViews: number; maxViews: number; avgViews: number; engage: number; inducedGmv: number; fit: number; direct: boolean }
interface TrendPoint { date: string; sold: number; gmv: number; price: number | null }
interface Trend { series: TrendPoint[]; soldGrowth: number; soldGrowthPct: number | null; gmvGrowth: number; days: number; period: number }
interface Similar { id: string; title: string; brand: string; gmv: number; sold: number; country: string; image?: string }
interface Detail {
  matchMode?: "direct" | "brand";
  trend?: Trend | null;
  priceSeries?: { date: string; price: number }[];
  category?: string;
  categoryLabel?: string;
  subLabel?: string | null;
  rankInCategory?: { rank: number; total: number; capped: boolean } | null;
  product: { id: string; brand: string; title: string; price: number; currency: string; sold: number; gmv: number; commission: number | null; url: string; country?: string; image?: string };
  relatedVideos: VideoRow[];
  connectedCreators?: ConnectedCreator[];
  similar?: Similar[];
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
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [isAdmin, setIsAdmin] = useState(false);
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [outMsg, setOutMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    fetch(`/api/products/${encodeURIComponent(id)}?period=${period}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`); return j; })
      .then((j) => { if (alive) setD(j as Detail); })
      .catch((e) => { if (alive) setErr(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, period]);

  useEffect(() => {
    let alive = true;
    fetch("/api/admin/session").then((r) => r.json()).then((j) => { if (alive) setIsAdmin(!!j?.authed); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  async function addToOutreach(handle: string, score: number) {
    setOutMsg(null);
    try {
      const r = await fetch("/api/admin/outreach", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addTarget", handle, score }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setAdded((m) => ({ ...m, [handle]: true }));
      setOutMsg(`@${handle} · ${j.added > 0 ? "아웃리치에 추가됨" : "이미 아웃리치에 있음"}`);
    } catch (e) { setOutMsg(String((e as Error).message || e)); }
  }

  const money = (n: number, cur: string) => `${cur === "USD" ? "$" : ""}${fmt(n)}${cur !== "USD" ? " " + cur : ""}`;

  const videos = useMemo(() => {
    const list = d?.relatedVideos ? [...d.relatedVideos] : [];
    list.sort((a, b) => {
      if (!!a.direct !== !!b.direct) return a.direct ? -1 : 1;
      if (vSort === "engage") return engage(b) - engage(a);
      if (vSort === "recent") return (b.postedAt || "").localeCompare(a.postedAt || "");
      return b.views - a.views;
    });
    return list;
  }, [d, vSort]);

  const creators = d?.connectedCreators || [];
  const totalReach = useMemo(() => (d?.relatedVideos || []).reduce((s, v) => s + v.views, 0), [d]);
  const cur = d?.product.currency || "USD";

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <Link href="/products" className="mb-3 inline-flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--accent)]"><ArrowLeft size={13} /> 제품 랭킹</Link>

        {loading && !d ? (
          <div className="py-16 text-center text-[13px] text-[var(--muted)]">불러오는 중…</div>
        ) : err ? (
          <div className="rounded-xl border border-[var(--border)] p-8 text-center text-[13px] text-rose-600">{err}</div>
        ) : d ? (
          <>
            {/* ── 제품 헤더 ── */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <div className="bg-gradient-to-br from-[var(--accent)]/8 to-transparent p-5">
                <div className="flex items-start gap-3.5">
                  <Thumb src={d.product.image} brand={d.product.brand} size={64} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[var(--accent)]">
                      {d.product.country && <span className="text-[13px]">{FLAG[d.product.country.toLowerCase()] || "🌐"}</span>}
                      <Package size={13} /> {d.product.brand || "브랜드 미상"}
                      {d.categoryLabel && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{d.categoryLabel}</span>}
                      {d.subLabel && <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)]">{d.subLabel}</span>}
                    </div>
                    <h1 className="mt-1 text-[21px] font-black leading-tight">{d.product.title || "(제목 없음)"}</h1>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <Stat label="가격" value={money(d.product.price, cur)} />
                  <Stat label="판매량" value={fmt(d.product.sold)} />
                  <Stat label="추정 GMV" value={money(d.product.gmv, cur)} accent />
                  {d.rankInCategory ? (
                    <Stat label={`${d.categoryLabel || "카테고리"} 순위`} value={`#${d.rankInCategory.rank}${d.rankInCategory.capped ? "" : ` / ${d.rankInCategory.total}`}`} />
                  ) : (
                    <Stat label="커미션" value={d.product.commission != null ? `${d.product.commission}%` : "—"} />
                  )}
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
                  <Info size={12} className="mt-0.5 shrink-0 text-slate-400" /> 추정 GMV = 가격 × 공개 판매수. 유도 GMV·단가는 추정치이며 실제와 다를 수 있습니다.
                </p>
              </div>
            </div>

            {/* ── 판매/GMV 추이 (이중축, 기간 토글) ── */}
            <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[14px] font-black">판매·GMV 추이 <span className="text-[11px] font-normal text-[var(--muted)]">· 최근 {d.trend?.days ?? 0}일 일별 스냅샷</span></h2>
                <div className="flex items-center gap-2">
                  {d.trend && d.trend.soldGrowth !== 0 && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${d.trend.soldGrowth > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
                      {d.trend.soldGrowth > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                      {d.trend.soldGrowth > 0 ? "+" : "-"}{fmt(Math.abs(d.trend.soldGrowth))} 판매{d.trend.soldGrowthPct != null ? ` (${d.trend.soldGrowth > 0 ? "+" : "-"}${Math.abs(d.trend.soldGrowthPct)}%)` : ""}
                    </span>
                  )}
                  <div className="flex gap-1">
                    {([7, 30, 90] as const).map((pv) => (
                      <button key={pv} onClick={() => setPeriod(pv)} className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${period === pv ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{pv}일</button>
                    ))}
                  </div>
                </div>
              </div>
              {d.trend && d.trend.series.length >= 2 ? (
                <DualAxisChart series={d.trend.series} cur={cur} />
              ) : (
                <div className="mt-2 flex h-24 items-center justify-center rounded-lg bg-slate-50 text-[11px] text-[var(--muted)]">
                  일별 스냅샷이 2일 이상 누적되면 판매량·GMV 이중축 추이가 표시됩니다.
                </div>
              )}
            </div>

            {/* ── 가격 추이 (할인 감지) ── */}
            {d.priceSeries && d.priceSeries.length >= 2 && (
              <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
                <PriceTrend series={d.priceSeries} cur={cur} />
              </div>
            )}

            {/* ── 콘텐츠 성과 요약 ── */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <MiniStat icon={<Users size={14} />} label="연결 크리에이터" value={fmt(creators.length)} />
              <MiniStat icon={<Film size={14} />} label="관련 영상" value={fmt(d.relatedVideos?.length || 0)} />
              <MiniStat icon={<TrendingUp size={14} />} label="누적 조회수" value={compact(totalReach)} accent />
            </div>

            {/* ── 연결 크리에이터 (유도 GMV·적합도) ── */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-black">연결 크리에이터 <span className="text-[11px] font-normal text-[var(--muted)]">· {d.matchMode === "direct" ? "이 제품 태그 · 유도 GMV(추정)순" : "이 브랜드 홍보"}</span></h2>
              </div>
              {outMsg && <p className="mb-2 text-[11px] font-semibold text-emerald-700">{outMsg}</p>}
              {creators.length === 0 ? (
                <Empty text="매칭된 크리에이터가 아직 없습니다." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-50 text-[11px] text-[var(--muted)]"><tr>
                      <th className="p-2.5">#</th><th className="p-2.5">크리에이터</th>
                      <th className="p-2.5 text-right">영상</th><th className="p-2.5 text-right">총 조회</th>
                      <th className="p-2.5 text-right">유도 GMV</th><th className="p-2.5 text-center">적합도</th>
                      {isAdmin && <th className="p-2.5 text-right">아웃리치</th>}
                    </tr></thead>
                    <tbody>
                      {creators.map((c, i) => (
                        <tr key={c.handle} className="border-t border-slate-100 hover:bg-slate-50/60">
                          <td className="p-2.5"><span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${i < 3 ? "bg-amber-100 text-amber-700" : "text-slate-400"}`}>{i + 1}</span></td>
                          <td className="p-2.5 font-semibold"><span className="inline-flex items-center gap-1.5"><Link href={`/creator/${encodeURIComponent(c.handle)}`} className="hover:text-[var(--accent)]">@{c.handle}</Link>{c.direct && <DirectBadge />}</span></td>
                          <td className="p-2.5 text-right">{fmt(c.videos)}</td>
                          <td className="p-2.5 text-right font-bold text-[var(--accent)]">{compact(c.totalViews)}</td>
                          <td className="p-2.5 text-right font-semibold">{c.inducedGmv > 0 ? `${cur === "USD" ? "$" : ""}${compact(c.inducedGmv)}` : "—"}</td>
                          <td className="p-2.5">
                            <div className="mx-auto flex w-[68px] items-center gap-1.5">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${c.fit >= 70 ? "bg-emerald-500" : c.fit >= 40 ? "bg-amber-500" : "bg-slate-400"}`} style={{ width: `${c.fit}%` }} /></div>
                              <span className="w-6 text-right text-[11px] font-bold">{c.fit}</span>
                            </div>
                          </td>
                          {isAdmin && (
                            <td className="p-2.5 text-right">
                              <button onClick={() => addToOutreach(c.handle, c.fit)} disabled={added[c.handle]}
                                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition ${added[c.handle] ? "bg-emerald-50 text-emerald-700" : "bg-[var(--accent)] text-white hover:opacity-90"}`}>
                                {added[c.handle] ? <Check size={11} /> : <Plus size={11} />} {added[c.handle] ? "추가됨" : "추가"}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── 영상 성과 랭킹 (카드) ── */}
            <div className="mt-5">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[14px] font-black">영상 성과 <span className="text-[11px] font-normal text-[var(--muted)]">· {d.matchMode === "direct" ? "제품 직접 태그 우선" : "같은 브랜드"} · {videos.length}개</span></h2>
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

            {/* ── 동일 카테고리 제품 ── */}
            {d.similar && d.similar.length > 0 && (
              <div className="mt-5">
                <h2 className="mb-2 text-[14px] font-black"><Trophy size={14} className="mr-1 inline text-amber-500" />동일 카테고리 상위 <span className="text-[11px] font-normal text-[var(--muted)]">· {d.categoryLabel} 경쟁 제품</span></h2>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {d.similar.map((s) => (
                    <Link key={s.id} href={`/product/${encodeURIComponent(s.id)}`}
                      className="group rounded-xl border border-[var(--border)] bg-white p-3.5 hover:border-[var(--accent)] hover:shadow-md">
                      <div className="flex gap-2.5">
                        <Thumb src={s.image} brand={s.brand} size={44} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]"><span>{FLAG[s.country.toLowerCase()] || "🌐"}</span><Package size={11} /> {s.brand || "브랜드 미상"}</div>
                          <div className="mt-1 line-clamp-2 text-[12px] font-bold group-hover:text-[var(--accent)]">{s.title || "(제목 없음)"}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-end justify-between">
                        <div>
                          <div className="text-[10px] text-[var(--muted)]">추정 GMV</div>
                          <div className="text-[15px] font-black text-[var(--accent)]">${compact(s.gmv)}</div>
                        </div>
                        <div className="text-right text-[10px] text-[var(--muted)]">판매 {compact(s.sold)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </PageShell>
  );
}

// 이중축 차트 — GMV 막대 + 판매 누적 선. 외부 라이브러리 의존 0(SVG 자체 구현).
function DualAxisChart({ series, cur }: { series: TrendPoint[]; cur: string }) {
  const W = 640, H = 150, padL = 8, padR = 8, padT = 10, padB = 20;
  const n = series.length;
  const gmvMax = Math.max(1, ...series.map((s) => s.gmv));
  const soldVals = series.map((s) => s.sold);
  const soldMin = Math.min(...soldVals), soldMax = Math.max(...soldVals);
  const soldSpan = soldMax - soldMin || 1;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const bw = (innerW / n) * 0.6;
  const cx = (i: number) => padL + (i + 0.5) * (innerW / n);
  const barH = (v: number) => (v / gmvMax) * innerH;
  const sy = (v: number) => padT + innerH - ((v - soldMin) / soldSpan) * innerH;
  const line = series.map((s, i) => `${i === 0 ? "M" : "L"}${cx(i).toFixed(1)},${sy(s.sold).toFixed(1)}`).join(" ");
  const money = (v: number) => `${cur === "USD" ? "$" : ""}${v >= 1000 ? (v / 1000).toFixed(v >= 1e6 ? 0 : 1) + (v >= 1e6 ? "M" : "K") : v}`;
  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 150 }}>
        {series.map((s, i) => (
          <rect key={i} x={cx(i) - bw / 2} y={padT + innerH - barH(s.gmv)} width={bw} height={barH(s.gmv)} rx={1.5} fill="var(--accent)" opacity={0.22} />
        ))}
        <path d={line} fill="none" stroke="#059669" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {series.map((s, i) => (i === 0 || i === n - 1 ? <circle key={i} cx={cx(i)} cy={sy(s.sold)} r={2.5} fill="#059669" /> : null))}
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--muted)]">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--accent)", opacity: 0.4 }} /> GMV(막대) {money(gmvMax)} 최대</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-600" /> 판매 누적(선) {fmt(soldMin)}→{fmt(soldMax)}</span>
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-slate-400">
        <span>{series[0].date}</span><span>{series[n - 1].date}</span>
      </div>
    </div>
  );
}

// 썸네일 — 있으면 이미지, 없으면 브랜드 이니셜 플레이스홀더. next/image 대신 img(정적 export·외부 도메인 자유).
function Thumb({ src, brand, size }: { src?: string; brand?: string; size: number }) {
  const [ok, setOk] = useState(true);
  const s = { width: size, height: size };
  if (src && ok) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={brand || "product"} style={s} onError={() => setOk(false)} className="shrink-0 rounded-xl object-cover ring-1 ring-black/5" />;
  }
  return (
    <div style={s} className="grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--accent)]/15 to-slate-100 text-[15px] font-black text-[var(--accent)] ring-1 ring-black/5">
      {(brand || "?").slice(0, 1).toUpperCase()}
    </div>
  );
}

// 가격 추이 — 스냅샷 price 라인. 최저가 대비 변동/할인 감지.
function PriceTrend({ series, cur }: { series: { date: string; price: number }[]; cur: string }) {
  const W = 640, H = 70, pad = 6;
  const vals = series.map((s) => s.price);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const n = series.length;
  const x = (i: number) => pad + (i / Math.max(1, n - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);
  const line = series.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.price).toFixed(1)}`).join(" ");
  const cur0 = series[0].price, curN = series[n - 1].price;
  const changed = curN !== cur0;
  const down = curN < cur0;
  const money = (v: number) => `${cur === "USD" ? "$" : ""}${v.toLocaleString()}${cur !== "USD" ? " " + cur : ""}`;
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-black">가격 추이 <span className="text-[11px] font-normal text-[var(--muted)]">· 스냅샷 {n}일</span></h2>
        {changed ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${down ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
            {down ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />} {down ? "할인" : "인상"} {money(cur0)} → {money(curN)}
          </span>
        ) : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">가격 변동 없음 · {money(curN)}</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-2 h-16 w-full">
        <path d={line} fill="none" stroke={down ? "#059669" : changed ? "#e11d48" : "#94a3b8"} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-slate-400"><span>{series[0].date}</span><span>최저 {money(min)} · 최고 {money(max)}</span><span>{series[n - 1].date}</span></div>
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

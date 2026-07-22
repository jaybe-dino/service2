"use client";

// 샵(브랜드) 상세 — 신규(롤백 가능). 메뉴 비노출, /shop/[name] 직접 접근.
// 제품·크리에이터·카테고리·국가 종합 대시보드. 데이터: /api/shops/[name].
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageShell from "@/components/ktrend/PageShell";
import { ArrowLeft, Store, Package, Users, DollarSign, ShoppingCart, Film, Eye, ExternalLink, LayoutGrid, Wand2 } from "lucide-react";
import { COUNTRIES } from "@/data/ktrend/meta";

const FLAG: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.id, c.flag]));
const CNAME: Record<string, string> = Object.fromEntries(COUNTRIES.map((c) => [c.id, c.nameKo]));
const compact = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K" : String(n));
const fmt = (n: number) => n.toLocaleString();

interface Prod { id: string; title: string; price: number; sold: number; gmv: number; commission: number | null; url: string; country: string; category: string }
interface Cat { id: string; label: string; icon: string; products: number; gmv: number }
interface Ctry { country: string; products: number; gmv: number }
interface Creator { handle: string; videos: number; totalViews: number; maxViews: number }
interface Data {
  shop: { name: string; products: number; totalSold: number; totalGmv: number; avgCommission: number | null; videos: number; totalViews: number; influencers: number };
  categories: Cat[]; countries: Ctry[]; topProducts: Prod[]; creators: Creator[];
}

export default function ShopDetailPage() {
  const params = useParams();
  const name = decodeURIComponent(String(params?.name || ""));
  const [d, setD] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    fetch(`/api/shops/${encodeURIComponent(name)}`)
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`); return j; })
      .then((j) => { if (alive) setD(j as Data); })
      .catch((e) => { if (alive) setErr(String(e.message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [name]);

  const maxCatGmv = useMemo(() => (d?.categories || []).reduce((m, c) => Math.max(m, c.gmv), 0), [d]);
  const maxProdGmv = useMemo(() => (d?.topProducts || []).reduce((m, p) => Math.max(m, p.gmv), 0), [d]);

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <Link href="/shops" className="mb-3 inline-flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--accent)]"><ArrowLeft size={13} /> 샵 랭킹</Link>

        {loading ? (
          <div className="py-16 text-center text-[13px] text-[var(--muted)]">불러오는 중…</div>
        ) : err ? (
          <div className="rounded-xl border border-[var(--border)] p-8 text-center text-[13px] text-rose-600">{err}</div>
        ) : d ? (
          <>
            {/* 헤더 */}
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <div className="bg-gradient-to-br from-[var(--accent)]/8 to-transparent p-5">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--accent)]"><Store size={13} /> TikTok Shop</div>
                <h1 className="mt-1 text-[22px] font-black leading-tight">{d.shop.name}</h1>
                {d.countries.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {d.countries.map((c) => <span key={c.country} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{FLAG[c.country] || "🌐"} {CNAME[c.country] || c.country} {c.products}</span>)}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <Stat icon={<Package size={13} />} label="제품 수" value={fmt(d.shop.products)} />
                  <Stat icon={<ShoppingCart size={13} />} label="총 판매량" value={compact(d.shop.totalSold)} />
                  <Stat icon={<DollarSign size={13} />} label="추정 GMV" value={`$${compact(d.shop.totalGmv)}`} accent />
                  <Stat icon={<Users size={13} />} label="커미션(평균)" value={d.shop.avgCommission != null ? `${d.shop.avgCommission}%` : "—"} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600"><Film size={9} className="mb-0.5 inline" /> 영상 {compact(d.shop.videos)}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600"><Eye size={9} className="mb-0.5 inline" /> 조회수 {compact(d.shop.totalViews)}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600"><Users size={9} className="mb-0.5 inline" /> 크리에이터 {compact(d.shop.influencers)}</span>
                </div>
              </div>
            </div>

            {/* 카테고리 분해 */}
            {d.categories.length > 0 && (
              <div className="mt-5">
                <h2 className="mb-2 flex items-center gap-1.5 text-[14px] font-black"><LayoutGrid size={15} className="text-[var(--accent)]" /> 카테고리 구성</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {d.categories.map((c) => (
                    <Link key={c.id} href={c.id === "other" ? "/products" : `/products?category=${c.id}`} className="group flex items-center gap-3 rounded-xl border border-[var(--border)] p-3 hover:border-[var(--accent)]">
                      <span className="text-[18px]">{c.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-bold group-hover:text-[var(--accent)]">{c.label}</span>
                          <span className="text-[11px] text-[var(--muted)]">제품 {c.products}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${maxCatGmv > 0 ? Math.max(3, Math.round((c.gmv / maxCatGmv) * 100)) : 0}%` }} /></div>
                      </div>
                      <span className="shrink-0 text-[12px] font-black text-[var(--accent)]">${compact(c.gmv)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 상위 제품 */}
            <div className="mt-5">
              <h2 className="mb-2 flex items-center gap-1.5 text-[14px] font-black"><Package size={15} className="text-[var(--accent)]" /> 상위 제품 <span className="text-[11px] font-normal text-[var(--muted)]">· 추정 GMV 순</span></h2>
              {d.topProducts.length === 0 ? (
                <Empty text="수집된 제품이 아직 없습니다." />
              ) : (
                <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-50 text-[11px] text-[var(--muted)]"><tr><th className="p-2.5 pl-3">#</th><th className="p-2.5">제품</th><th className="p-2.5 text-right">가격</th><th className="p-2.5 text-right">판매</th><th className="p-2.5">추정 GMV</th><th className="p-2.5"></th></tr></thead>
                    <tbody>
                      {d.topProducts.map((p, i) => (
                        <tr key={p.id} className="group border-t border-slate-100 hover:bg-[var(--accent-light)]/40">
                          <td className="p-2.5 pl-3 text-slate-400">{i + 1}</td>
                          <td className="max-w-[260px] p-2.5"><Link href={`/product/${encodeURIComponent(p.id)}`} className="block truncate font-semibold group-hover:text-[var(--accent)]">{p.title || "(제목 없음)"}</Link><span className="text-[10px] text-[var(--muted)]">{FLAG[p.country] || "🌐"}</span></td>
                          <td className="whitespace-nowrap p-2.5 text-right">${fmt(p.price)}</td>
                          <td className="whitespace-nowrap p-2.5 text-right">{compact(p.sold)}</td>
                          <td className="p-2.5"><div className="flex items-center gap-2"><div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${maxProdGmv > 0 ? Math.max(4, Math.round((p.gmv / maxProdGmv) * 100)) : 0}%` }} /></div><span className="whitespace-nowrap font-bold text-[var(--accent)]">${compact(p.gmv)}</span></div></td>
                          <td className="p-2.5"><div className="flex items-center gap-1.5"><Link href={`/remake/studio?product=${encodeURIComponent(p.id)}`} title="이 상품형 광고 리메이크" className="text-slate-400 opacity-0 transition group-hover:opacity-100 hover:text-[var(--accent)]"><Wand2 size={13} /></Link>{p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[var(--accent)]"><ExternalLink size={13} /></a>}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 상위 크리에이터 */}
            <div className="mt-5">
              <h2 className="mb-2 flex items-center gap-1.5 text-[14px] font-black"><Users size={15} className="text-[var(--accent)]" /> 홍보 크리에이터 <span className="text-[11px] font-normal text-[var(--muted)]">· 조회수 순</span></h2>
              {d.creators.length === 0 ? (
                <Empty text="이 브랜드를 홍보한 크리에이터 정보가 아직 없습니다." />
              ) : (
                <div className="overflow-hidden rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-50 text-[11px] text-[var(--muted)]"><tr><th className="p-2.5 pl-3">#</th><th className="p-2.5">크리에이터</th><th className="p-2.5 text-right">영상</th><th className="p-2.5 text-right">총 조회수</th><th className="p-2.5 text-right">최고 조회</th></tr></thead>
                    <tbody>
                      {d.creators.map((c, i) => (
                        <tr key={c.handle} className="group border-t border-slate-100 hover:bg-[var(--accent-light)]/40">
                          <td className="p-2.5 pl-3"><span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${i < 3 ? "bg-amber-100 text-amber-700" : "text-slate-400"}`}>{i + 1}</span></td>
                          <td className="p-2.5"><Link href={`/creator/${encodeURIComponent(c.handle)}`} className="font-semibold group-hover:text-[var(--accent)]">@{c.handle}</Link></td>
                          <td className="whitespace-nowrap p-2.5 text-right">{fmt(c.videos)}</td>
                          <td className="whitespace-nowrap p-2.5 text-right font-bold text-[var(--accent)]">{compact(c.totalViews)}</td>
                          <td className="whitespace-nowrap p-2.5 text-right text-[var(--muted)]">{compact(c.maxViews)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
    <div className="rounded-xl bg-white/70 p-3 ring-1 ring-black/5">
      <div className="flex items-center gap-1 text-[10px] text-[var(--muted)]">{icon} {label}</div>
      <div className={`mt-0.5 text-[16px] font-black ${accent ? "text-[var(--accent)]" : ""}`}>{value}</div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-[12px] text-[var(--muted)]">{text}</p>;
}

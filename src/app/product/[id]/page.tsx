"use client";

// 제품 상세 — 신규(롤백 가능). 메뉴 비노출, /product/[id] 직접 접근.
// 제품 지표 + 같은 브랜드 관련 영상 + '이 상품형 광고 리메이크' CTA(Glovek 차별점).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageShell from "@/components/ktrend/PageShell";
import { Info, ExternalLink, Wand2, ArrowLeft, Package } from "lucide-react";

interface Detail {
  matchMode?: "direct" | "brand";
  product: { id: string; brand: string; title: string; price: number; currency: string; sold: number; gmv: number; commission: number | null; url: string };
  relatedVideos: { id: string; handle: string; views: number; likes: number; url: string; country: string; isAd: boolean; isShop: boolean; direct?: boolean }[];
  relatedCreators: { handle: string; videos: number; totalViews: number; maxViews: number; direct?: boolean }[];
}
const DirectBadge = () => (
  <span className="ml-1.5 inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">직접 태그</span>
);
const fmt = (n: number) => n.toLocaleString();

export default function ProductDetailPage() {
  const params = useParams();
  const id = decodeURIComponent(String(params?.id || ""));
  const [d, setD] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <Link href="/products" className="mb-3 inline-flex items-center gap-1 text-[12px] text-[var(--muted)] hover:text-[var(--accent)]"><ArrowLeft size={13} /> 제품 랭킹</Link>

        {loading ? (
          <div className="py-16 text-center text-[13px] text-[var(--muted)]">불러오는 중…</div>
        ) : err ? (
          <div className="rounded-xl border border-[var(--border)] p-8 text-center text-[13px] text-rose-600">{err}</div>
        ) : d ? (
          <>
            <div className="rounded-2xl border border-[var(--border)] p-5">
              <div className="flex items-center gap-2 text-[11px] text-[var(--muted)]"><Package size={13} /> {d.product.brand}</div>
              <h1 className="mt-1 text-[20px] font-black leading-tight">{d.product.title || "(제목 없음)"}</h1>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="가격" value={money(d.product.price, d.product.currency)} />
                <Stat label="판매량" value={fmt(d.product.sold)} />
                <Stat label="추정 GMV" value={money(d.product.gmv, d.product.currency)} accent />
                <Stat label="커미션" value={d.product.commission != null ? `${d.product.commission}%` : "—"} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/remake/studio?product=${encodeURIComponent(d.product.id)}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-[13px] font-bold text-white hover:opacity-95">
                  <Wand2 size={15} /> 이 상품형 광고 리메이크
                </Link>
                {d.product.url && (
                  <a href={d.product.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-2 text-[13px] font-bold text-[var(--muted)] hover:text-[var(--accent)]">
                    <ExternalLink size={14} /> TikTok Shop에서 보기
                  </a>
                )}
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-[11px] text-[var(--muted)]">
                <Info size={12} className="mt-0.5 shrink-0 text-slate-400" /> 추정 GMV = 가격 × 공개 판매수. 실제 매출과 다를 수 있습니다.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
              <h2 className="text-[14px] font-black">매출·판매 추이</h2>
              <div className="mt-2 flex h-24 items-center justify-center rounded-lg bg-slate-50 text-[11px] text-[var(--muted)]">
                일별 판매수 스냅샷이 누적되면 매출·판매량 추이와 성장률이 표시됩니다.
              </div>
            </div>

            <div className="mt-5">
              <h2 className="mb-2 text-[14px] font-black">관련 크리에이터 <span className="text-[11px] font-normal text-[var(--muted)]">· {d.matchMode === "direct" ? "이 제품을 직접 태그한 인플루언서" : "이 브랜드를 홍보한 인플루언서"}</span></h2>
              {(!d.relatedCreators || d.relatedCreators.length === 0) ? (
                <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-[12px] text-[var(--muted)]">매칭된 크리에이터가 아직 없습니다.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-50 text-[11px] text-[var(--muted)]"><tr><th className="p-2.5">#</th><th className="p-2.5">크리에이터</th><th className="p-2.5 text-right">영상수</th><th className="p-2.5 text-right">총 조회수</th><th className="p-2.5 text-right">최고 조회수</th></tr></thead>
                    <tbody>
                      {d.relatedCreators.map((c, i) => (
                        <tr key={c.handle} className="border-t border-slate-100">
                          <td className="p-2.5 text-slate-400">{i + 1}</td>
                          <td className="p-2.5 font-semibold"><Link href={`/influencer/${encodeURIComponent(c.handle)}`} className="hover:text-[var(--accent)]">@{c.handle}</Link>{c.direct && <DirectBadge />}</td>
                          <td className="p-2.5 text-right">{fmt(c.videos)}</td>
                          <td className="p-2.5 text-right font-bold text-[var(--accent)]">{fmt(c.totalViews)}</td>
                          <td className="p-2.5 text-right text-[var(--muted)]">{fmt(c.maxViews)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-5">
              <h2 className="mb-2 text-[14px] font-black">관련 영상 <span className="text-[11px] font-normal text-[var(--muted)]">· {d.matchMode === "direct" ? "제품 직접 태그 우선 + 브랜드" : "같은 브랜드"}</span></h2>
              {d.relatedVideos.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center text-[12px] text-[var(--muted)]">관련 영상이 아직 없습니다.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-slate-50 text-[11px] text-[var(--muted)]"><tr><th className="p-2.5">크리에이터</th><th className="p-2.5 text-right">조회수</th><th className="p-2.5">국가</th><th className="p-2.5"></th></tr></thead>
                    <tbody>
                      {d.relatedVideos.map((v) => (
                        <tr key={v.id} className="border-t border-slate-100">
                          <td className="p-2.5 font-semibold">{v.handle ? <Link href={`/influencer/${encodeURIComponent(v.handle)}`} className="hover:text-[var(--accent)]">@{v.handle}</Link> : "—"}{v.direct && <DirectBadge />}</td>
                          <td className="p-2.5 text-right">{fmt(v.views)}</td>
                          <td className="p-2.5 text-[var(--muted)]">{v.country}</td>
                          <td className="p-2.5">{v.url && <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-[var(--accent)]"><ExternalLink size={13} /></a>}</td>
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

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-[10px] text-[var(--muted)]">{label}</div>
      <div className={`mt-0.5 text-[16px] font-black ${accent ? "text-[var(--accent)]" : ""}`}>{value}</div>
    </div>
  );
}

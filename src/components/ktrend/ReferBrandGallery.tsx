"use client";

// 국가별 TikTok Shop 실제 예시(/referbrand) — 브랜드/국가 검색·필터, 모바일 세로 화면 확대,
// 실제 상품/매장 사이트 이동. 실제 구매 화면 예시이며 매출 성과·입점 승인 보장이 아닙니다.
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ExternalLink, Store, ShieldAlert, X, Smartphone } from "lucide-react";
import { REFERBRAND_ITEMS, REFERBRAND_COUNTRIES, type ReferBrandItem } from "@/data/referbrand";

const STATUS = {
  mobile_pending: { label: "모바일 화면 확인 중", cls: "bg-amber-100 text-amber-800" },
  address_pending: { label: "판매 주소 확인 대기", cls: "bg-slate-200 text-slate-700" },
} as const;

export default function ReferBrandGallery() {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState<string>("");
  const [zoom, setZoom] = useState<ReferBrandItem | null>(null);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return REFERBRAND_ITEMS.filter((it) => {
      if (country && it.country !== country) return false;
      if (kw && !(it.name.toLowerCase().includes(kw) || it.id.includes(kw))) return false;
      return true;
    });
  }, [q, country]);

  return (
    <div className="bg-[var(--bg)] text-[var(--fg)]">
      {/* 히어로 */}
      <header className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[var(--accent)] opacity-[0.08] blur-3xl" />
        <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8 sm:py-20">
          <div className="text-[12px] font-extrabold tracking-[4px] text-[var(--accent)]">GLOVEK · TIKTOK SHOP</div>
          <h1 className="mt-3 max-w-[760px] break-keep text-[30px] font-black leading-[1.16] tracking-tight sm:text-[46px]">
            국가별 TikTok Shop <span className="text-[var(--accent)]">실제 예시</span>
          </h1>
          <p className="mt-4 max-w-[680px] break-keep text-[14.5px] leading-relaxed text-[var(--muted)] sm:text-[16px]">
            디노스튜디오가 함께한 브랜드의 국가별 TikTok Shop 상품·매장 페이지를 모았습니다. 브랜드를 검색하거나 국가로 필터해 실제 판매 화면으로 이동할 수 있습니다.
          </p>
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--accent-light)] px-3.5 py-2.5 text-[12.5px] font-semibold leading-relaxed text-[var(--accent-deep)] break-keep sm:inline-flex">
            <ShieldAlert size={15} className="mt-0.5 shrink-0" />
            <span>실제 <b>구매 화면 예시</b>이며, 매출 성과나 입점 승인을 보장하지 않습니다. 가격·재고 등은 실제 접속 시점과 다를 수 있습니다.</span>
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 sm:py-12">
        {/* 검색 + 국가 필터 */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-3.5 py-2.5 sm:max-w-[340px]">
            <Search size={16} className="shrink-0 text-[var(--muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="브랜드 검색 (예: 로아띠, FAU)"
              autoComplete="off"
              aria-label="브랜드 검색"
              className="w-full bg-transparent text-[14px] outline-none placeholder:text-[var(--muted)]"
            />
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="국가 필터">
            <FilterBtn active={country === ""} onClick={() => setCountry("")}>전체</FilterBtn>
            {REFERBRAND_COUNTRIES.map((c) => (
              <FilterBtn key={c} active={country === c} onClick={() => setCountry(country === c ? "" : c)}>{c}</FilterBtn>
            ))}
          </div>
        </div>

        <p className="mt-3 text-[12px] font-semibold text-[var(--muted)]">{filtered.length}개 브랜드</p>

        {/* 목록 */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[var(--border)] py-16 text-center">
            <p className="text-[14px] font-bold text-[var(--muted)]">검색 결과가 없습니다.</p>
            <button onClick={() => { setQ(""); setCountry(""); }} className="mt-3 text-[13px] font-bold text-[var(--accent)] underline">필터 초기화</button>
          </div>
        ) : (
          <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((it) => <Card key={it.id} item={it} onZoom={() => setZoom(it)} />)}
          </ul>
        )}
      </main>

      {zoom && <ZoomDialog item={zoom} onClose={() => setZoom(null)} />}
    </div>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-4 py-2 text-[13px] font-bold transition ${active ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] bg-white text-[var(--muted)] hover:border-[var(--accent)]"}`}
    >
      {children}
    </button>
  );
}

// 링크 근처 VPN 안내(국가 명시) — VPN만으로 항상 열린다고 보장하지 않음.
function VpnNote({ country }: { country: string }) {
  return (
    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-[var(--muted)]">
      <p className="font-bold text-[var(--fg)]">실제 사이트를 보려면 {country} VPN을 켜고 모바일에서 접속해 주세요.</p>
      <p className="mt-1">VPN 사용 후에도 TikTok 로그인·앱·보안 확인이 필요할 수 있습니다.</p>
    </div>
  );
}

function Card({ item, onZoom }: { item: ReferBrandItem; onZoom: () => void }) {
  const st = STATUS[item.status];
  const hasImage = Boolean(item.mobileImage);
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-white transition hover:shadow-md">
      {/* 모바일 세로 화면 영역 — 캡처 전까지 '확인 중' 상태로 정직하게 표시 */}
      <button
        type="button"
        onClick={hasImage ? onZoom : undefined}
        aria-label={hasImage ? `${item.name} 모바일 화면 확대` : `${item.name} 모바일 화면 확인 중`}
        className={`relative flex aspect-[4/5] items-center justify-center overflow-hidden border-b border-[var(--border)] bg-slate-50 ${hasImage ? "cursor-zoom-in" : "cursor-default"}`}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.mobileImage!} alt={`${item.name} TikTok Shop 모바일 화면`} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="px-4 text-center">
            <Smartphone size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 text-[12.5px] font-bold text-slate-500">
              {item.status === "address_pending" ? "판매 주소 확인 대기" : "모바일 화면 확인 중"}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">현지 모바일 캡처 확보 후 표시됩니다</p>
          </div>
        )}
        <span className={`absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${st.cls}`}>{st.label}</span>
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[16px] font-black tracking-tight">{item.name}</h2>
          <span className="shrink-0 rounded-md border border-[var(--border)] px-2 py-0.5 text-[11px] font-bold text-[var(--muted)]">{item.country}</span>
        </div>

        {item.productUrl ? (
          <>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href={item.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3.5 py-2.5 text-[13px] font-black text-white transition hover:bg-[var(--accent-deep)]"
              >
                <ExternalLink size={14} /> 상품 페이지 열기
              </a>
              {item.storeUrl && (
                <a
                  href={item.storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3.5 py-2.5 text-[13px] font-bold text-[var(--fg)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <Store size={14} /> 매장 페이지 열기
                </a>
              )}
            </div>
            <VpnNote country={item.country} />
          </>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-[var(--border)] px-3 py-3 text-[12.5px] font-semibold text-[var(--muted)]">
            판매 주소 확인 대기 — 주소가 확인되면 링크를 추가합니다.
          </div>
        )}
      </div>
    </li>
  );
}

function ZoomDialog({ item, onClose }: { item: ReferBrandItem; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.name} 모바일 화면`}
      onClick={onClose}
    >
      <div ref={ref} tabIndex={-1} className="relative max-h-[92vh] w-full max-w-[380px] outline-none" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="닫기" className="absolute -top-11 right-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
          <X size={18} />
        </button>
        {item.mobileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.mobileImage} alt={`${item.name} TikTok Shop 모바일 화면`} className="max-h-[92vh] w-full rounded-2xl object-contain" />
        ) : (
          <div className="rounded-2xl bg-white p-8 text-center">
            <Smartphone size={34} className="mx-auto text-slate-300" />
            <p className="mt-3 text-[15px] font-black">모바일 화면 확인 중</p>
            <p className="mt-1.5 text-[12.5px] text-[var(--muted)]">현지 모바일 캡처를 확보하는 대로 여기에 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

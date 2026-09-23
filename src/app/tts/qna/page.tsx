"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, ShoppingBag, ArrowRight, Star, Flag } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { QNA_SECTIONS, QNA_NOTE, QNA_UPDATED, QNA_POPULAR, JP_NOTICE } from "@/data/ktrend/qna";

const ALL_ITEMS = QNA_SECTIONS.flatMap((s) => s.items.map((i) => ({ ...i, cat: s.title, catKey: s.key })));

// SEO/AEO: FAQ 구조화 데이터 — 공개 원고와 동일
const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: ALL_ITEMS.map((i) => ({
    "@type": "Question",
    name: i.q,
    acceptedAnswer: { "@type": "Answer", text: i.a },
  })),
};

export default function TtsQnaPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState<number | null>(null);

  const query = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    return ALL_ITEMS.filter((i) => {
      if (cat !== "all" && i.catKey !== cat) return false;
      if (!query) return true;
      return (
        i.q.toLowerCase().includes(query) ||
        i.a.toLowerCase().includes(query) ||
        (i.tags || []).some((t) => t.toLowerCase().includes(query))
      );
    });
  }, [query, cat]);

  // 카테고리별 그룹핑(표시용)
  const grouped = useMemo(() => {
    return QNA_SECTIONS
      .map((s) => ({ ...s, items: filtered.filter((i) => i.catKey === s.key) }))
      .filter((s) => s.items.length);
  }, [filtered]);

  const total = ALL_ITEMS.length;
  const reset = () => { setQ(""); setCat("all"); setOpen(null); };
  const jump = (n: number) => {
    setCat("all"); setQ(""); setOpen(n);
    setTimeout(() => document.getElementById(`q${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#1A56DB] p-7 text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
            <ShoppingBag size={12} /> TikTok Shop
          </div>
          <h1 className="mt-3 text-[26px] font-black leading-tight">TikTok Shop 입점·운영·마케팅 FAQ</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-white/85">
            입점 준비(온보딩)부터 샵 운영, 크리에이터 어필리에이트·콘텐츠 마케팅까지 — 자주 묻는 내용을 정리했습니다.
          </p>
          <p className="mt-2 text-[11px] text-white/60">최종 업데이트 {QNA_UPDATED}</p>
        </div>

        {/* 자주 찾는 질문 */}
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-[var(--muted)]"><Star size={13} className="text-amber-400" /> 자주 찾는 질문</div>
          <div className="flex flex-wrap gap-2">
            {QNA_POPULAR.map((n) => {
              const it = ALL_ITEMS.find((i) => i.n === n);
              if (!it) return null;
              return (
                <button key={n} onClick={() => jump(n)}
                  className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-left text-[11.5px] font-semibold text-[var(--fg)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  {it.q}
                </button>
              );
            })}
          </div>
        </div>

        {/* 검색 */}
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5">
          <Search size={16} className="text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(null); }}
            placeholder="질문 검색 (예: 비용, 온보딩, 일본, 샘플, 정산, 성과)"
            aria-label="FAQ 검색"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--muted)]"
          />
          {q && <button onClick={() => setQ("")} className="text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">지우기</button>}
        </div>

        {/* 카테고리 탭 (동적 문항수) */}
        <div className="kt-noscrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
          <CatBtn active={cat === "all"} onClick={() => { setCat("all"); setOpen(null); }} label={`전체 ${query ? filtered.length : total}`} />
          {QNA_SECTIONS.map((s) => {
            const n = query ? filtered.filter((i) => i.catKey === s.key).length : s.items.length;
            return <CatBtn key={s.key} active={cat === s.key} onClick={() => { setCat(s.key); setOpen(null); }} label={`${s.title} ${n}`} />;
          })}
        </div>

        {/* 결과 요약 */}
        <div className="mt-3 text-[11px] text-[var(--muted)]">{filtered.length}개 문항</div>

        {/* 목록 */}
        <div className="mt-2 space-y-7">
          {grouped.map((s) => (
            <section key={s.key}>
              <h2 className="mb-2 text-[14px] font-black text-[var(--accent)]">{s.title}</h2>
              <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
                {s.items.map((it) => {
                  const isOpen = open === it.n;
                  return (
                    <div key={it.n} id={`q${it.n}`}>
                      <h3 className="m-0">
                        <button
                          onClick={() => setOpen(isOpen ? null : it.n)}
                          aria-expanded={isOpen}
                          aria-controls={`a${it.n}`}
                          className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
                        >
                          <span className="mt-0.5 shrink-0 rounded-md bg-[var(--accent-light)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">Q{it.n}</span>
                          <span className="flex-1 text-[13px] font-semibold leading-snug">{it.q}</span>
                          <ChevronDown size={16} className={`mt-0.5 shrink-0 text-[var(--muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                        </button>
                      </h3>
                      <div id={`a${it.n}`} role="region" hidden={!isOpen} className="px-4 pb-4 pl-12">
                        <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-[var(--muted)]">{it.a}</p>
                        {(it.tags || []).some((t) => /일본|jp/i.test(t)) && (
                          <a href={JP_NOTICE.applyUrl} target="_blank" rel="noreferrer noopener"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-700">
                            <Flag size={12} /> 일본 사전 신청
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {!grouped.length && (
            <div className="py-12 text-center">
              <p className="text-[13px] text-[var(--muted)]">{query ? `“${q}” 검색 결과가 없습니다.` : "해당 항목이 없습니다."}</p>
              <button onClick={reset} className="mt-3 rounded-lg border border-[var(--border)] px-4 py-2 text-[12px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">검색 초기화</button>
            </div>
          )}
        </div>

        {/* 안내 문구 */}
        <p className="mt-8 rounded-lg bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-[var(--muted)]">{QNA_NOTE}</p>

        {/* CTA */}
        <div className="mt-4 rounded-2xl bg-[#0b0b0c] px-6 py-7 text-center text-white">
          <div className="text-[16px] font-black">브랜드 상황에 맞게 상담해 드립니다</div>
          <p className="mx-auto mt-1.5 max-w-[520px] text-[12px] text-white/70">진출 국가·제품 상태에 따라 필요한 범위를 설계해 드립니다. 아래에서 시작하세요.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/consult1" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[12px] font-bold hover:bg-[var(--accent-deep)]">1:1 상담 신청 <ArrowRight size={14} /></Link>
            <Link href="/onboarding" className="inline-flex items-center rounded-lg border border-white/30 px-5 py-2.5 text-[12px] font-bold hover:bg-white/10">틱톡샵 입점 신청</Link>
            <Link href="/refer" className="inline-flex items-center rounded-lg border border-white/30 px-5 py-2.5 text-[12px] font-bold hover:bg-white/10">협업 레퍼런스</Link>
            <a href={JP_NOTICE.applyUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 px-5 py-2.5 text-[12px] font-bold hover:bg-white/10"><Flag size={13} /> 일본 사전 신청</a>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function CatBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
        active ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]"
      }`}
    >
      {label}
    </button>
  );
}

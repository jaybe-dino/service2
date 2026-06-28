"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, ShoppingBag, ArrowRight } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { ONBOARDING } from "@/data/ktrend/meta";
import { QNA_SECTIONS, QNA_NOTE } from "@/data/ktrend/qna";

// SEO/AEO: FAQ 구조화 데이터
const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: QNA_SECTIONS.flatMap((s) =>
    s.items.filter((i) => i.a).map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  ),
};

export default function TtsQnaPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState<number | null>(null);

  const query = q.trim().toLowerCase();
  const sections = useMemo(() => {
    return QNA_SECTIONS
      .filter((s) => cat === "all" || s.title === cat)
      .map((s) => ({
        ...s,
        items: s.items.filter((i) => !query || i.q.toLowerCase().includes(query) || i.a.toLowerCase().includes(query)),
      }))
      .filter((s) => s.items.length);
  }, [query, cat]);

  const total = QNA_SECTIONS.reduce((n, s) => n + s.items.length, 0);

  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
      <div className="mx-auto max-w-4xl">
        {/* 헤더 */}
        <div className="rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#1A56DB] p-7 text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
            <ShoppingBag size={12} /> TikTok Shop 멀티몰
          </div>
          <h1 className="mt-3 text-[26px] font-black leading-tight">자주 묻는 질문 (QnA 100선)</h1>
          <p className="mt-2 text-[13px] text-white/85">
            Glovek 틱톡샵 멀티몰 입점 서비스에 대해 가장 많이 궁금해하시는 100가지를 정리했습니다.
          </p>
        </div>

        {/* 검색 */}
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5">
          <Search size={16} className="text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(null); }}
            placeholder="질문 검색 (예: 수수료, 정산, 할랄, 등급)"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--muted)]"
          />
          {q && <button onClick={() => setQ("")} className="text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">지우기</button>}
        </div>

        {/* 카테고리 탭 */}
        <div className="kt-noscrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
          <CatBtn active={cat === "all"} onClick={() => setCat("all")} label={`전체 ${total}`} />
          {QNA_SECTIONS.map((s) => (
            <CatBtn key={s.title} active={cat === s.title} onClick={() => setCat(s.title)} label={s.title} />
          ))}
        </div>

        {/* 목록 */}
        <div className="mt-5 space-y-7">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="mb-2 text-[14px] font-black text-[var(--accent)]">{s.title}</h2>
              <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
                {s.items.map((it) => {
                  const isOpen = open === it.n;
                  return (
                    <div key={it.n}>
                      <button
                        onClick={() => setOpen(isOpen ? null : it.n)}
                        className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50"
                      >
                        <span className="mt-0.5 shrink-0 rounded-md bg-[var(--accent-light)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">Q{it.n}</span>
                        <span className="flex-1 text-[13px] font-semibold leading-snug">{it.q}</span>
                        <ChevronDown size={16} className={`mt-0.5 shrink-0 text-[var(--muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pl-12">
                          {it.a ? (
                            <p className="whitespace-pre-line text-[12px] leading-relaxed text-[var(--muted)]">{it.a}</p>
                          ) : (
                            <p className="text-[12px] leading-relaxed text-[var(--muted)]">
                              자세한 내용은 1:1 온보딩 미팅 또는 <a href="mailto:partners@glovek.space" className="font-semibold text-[var(--accent)]">partners@glovek.space</a> 문의 시 안내드립니다.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {!sections.length && (
            <div className="py-12 text-center text-[13px] text-[var(--muted)]">
              “{q}” 검색 결과가 없습니다. 다른 키워드로 검색해 보세요.
            </div>
          )}
        </div>

        {/* 안내 + CTA */}
        <p className="mt-8 rounded-lg bg-slate-50 px-4 py-3 text-[11px] leading-relaxed text-[var(--muted)]">{QNA_NOTE}</p>
        {ONBOARDING.enabled && (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-[#0b0b0c] px-6 py-6 text-center text-white">
            <div className="text-[15px] font-black">더 궁금한 점이 있으신가요?</div>
            <p className="text-[12px] text-white/75">자가체크부터 입점까지 한 번에 시작하거나, partners@glovek.space로 문의하세요.</p>
            <div className="mt-2 flex gap-2">
              <Link href={ONBOARDING.path} className="kt-btn kt-btn-primary px-5 py-2.5 text-[12px]">
                입점 신청 시작 <ArrowRight size={14} />
              </Link>
              <a href="mailto:partners@glovek.space" className="inline-flex items-center rounded-lg border border-white/30 px-5 py-2.5 text-[12px] font-bold text-white hover:bg-white/10">
                이메일 문의
              </a>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function CatBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ${
        active ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]"
      }`}
    >
      {label}
    </button>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ChevronDown, Star } from "lucide-react";
import type { FaqEntry } from "@/data/ktrend/qna";
import { QNA_COMMON_NOTICE, QNA_CONSULT_HREF } from "@/data/ktrend/qna";

interface Item extends FaqEntry { id: number; cat: string }

function NoticeBar() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-light)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[12.5px] font-semibold leading-relaxed text-[var(--fg)]">{QNA_COMMON_NOTICE}</p>
      <Link href={QNA_CONSULT_HREF} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-bold text-white hover:bg-[var(--accent-deep)]">
        1:1 상담 신청
      </Link>
    </div>
  );
}

export default function QnaClient({ entries, updatedAt }: { entries: Item[]; updatedAt: string | null }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState<number | null>(null);

  // 카테고리(관리자 데이터 등장 순 보존) + 문항수
  const cats = useMemo(() => {
    const seen: string[] = [];
    for (const e of entries) if (!seen.includes(e.cat)) seen.push(e.cat);
    return seen;
  }, [entries]);

  // 자주 찾는 질문: 관리자 usage_count 상위 5
  const popular = useMemo(
    () => [...entries].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)).slice(0, 5),
    [entries],
  );

  const query = q.trim().toLowerCase();
  const filtered = useMemo(
    () => entries.filter((e) => {
      if (cat !== "all" && e.cat !== cat) return false;
      if (!query) return true;
      return e.question.toLowerCase().includes(query) || e.answer.toLowerCase().includes(query);
    }),
    [entries, cat, query],
  );
  const grouped = useMemo(
    () => cats.map((c) => ({ cat: c, items: filtered.filter((e) => e.cat === c) })).filter((g) => g.items.length),
    [cats, filtered],
  );

  const reset = () => { setQ(""); setCat("all"); setOpen(null); };
  const jump = (id: number) => { setCat("all"); setQ(""); setOpen(id); setTimeout(() => document.getElementById(`q${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60); };

  return (
    <div className="mx-auto max-w-4xl">
      {/* 헤더 */}
      <div className="rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#1A56DB] p-7 text-white">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">TikTok Shop</div>
        <h1 className="mt-3 text-[26px] font-black leading-tight">TikTok Shop 입점·운영·마케팅 FAQ</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-white/85">입점 준비(온보딩)부터 샵 운영, 크리에이터 어필리에이트·콘텐츠 마케팅까지 자주 묻는 내용을 모았습니다.</p>
        {updatedAt && <p className="mt-2 text-[11px] text-white/60">최종 업데이트 {updatedAt}</p>}
      </div>

      {/* 상단 공통 안내 + 상담 버튼 (제목 바로 아래, 검색/목록 위) */}
      <div className="mt-5"><NoticeBar /></div>

      {/* 자주 찾는 질문 */}
      {popular.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold text-[var(--muted)]"><Star size={13} className="text-amber-400" /> 자주 찾는 질문</div>
          <div className="flex flex-wrap gap-2">
            {popular.map((it) => (
              <button key={it.id} onClick={() => jump(it.id)}
                className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-left text-[11.5px] font-semibold text-[var(--fg)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                {it.question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 검색 */}
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2.5">
        <Search size={16} className="text-[var(--muted)]" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(null); }} placeholder="질문 검색"
          aria-label="FAQ 검색" className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--muted)]" />
        {q && <button onClick={() => setQ("")} className="text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">지우기</button>}
      </div>

      {/* 카테고리 탭 (동적 문항수) */}
      <div className="kt-noscrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
        <CatBtn active={cat === "all"} onClick={() => { setCat("all"); setOpen(null); }} label={`전체 ${query ? filtered.length : entries.length}`} />
        {cats.map((c) => {
          const n = query ? filtered.filter((e) => e.cat === c).length : entries.filter((e) => e.cat === c).length;
          return <CatBtn key={c} active={cat === c} onClick={() => { setCat(c); setOpen(null); }} label={`${c} ${n}`} />;
        })}
      </div>

      <div className="mt-3 text-[11px] text-[var(--muted)]">{filtered.length}개 문항</div>

      {/* 목록 */}
      <div className="mt-2 space-y-7">
        {grouped.map((s) => (
          <section key={s.cat}>
            <h2 className="mb-2 text-[14px] font-black text-[var(--accent)]">{s.cat}</h2>
            <div className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
              {s.items.map((it) => {
                const isOpen = open === it.id;
                return (
                  <div key={it.id} id={`q${it.id}`}>
                    <h3 className="m-0">
                      <button onClick={() => setOpen(isOpen ? null : it.id)} aria-expanded={isOpen} aria-controls={`a${it.id}`}
                        className="flex w-full items-start gap-3 px-4 py-3.5 text-left hover:bg-slate-50">
                        <span className="mt-0.5 shrink-0 rounded-md bg-[var(--accent-light)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">Q</span>
                        <span className="flex-1 text-[13px] font-semibold leading-snug">{it.question}</span>
                        <ChevronDown size={16} className={`mt-0.5 shrink-0 text-[var(--muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                      </button>
                    </h3>
                    <div id={`a${it.id}`} role="region" hidden={!isOpen} className="px-4 pb-4 pl-12">
                      <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-[var(--muted)]">{it.answer}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
        {!grouped.length && (
          <div className="py-12 text-center">
            <p className="text-[13px] text-[var(--muted)]">{query ? `“${q}” 검색 결과가 없습니다.` : "표시할 문항이 없습니다."}</p>
            {(query || cat !== "all") && <button onClick={reset} className="mt-3 rounded-lg border border-[var(--border)] px-4 py-2 text-[12px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">검색 초기화</button>}
          </div>
        )}
      </div>

      {/* 하단 공통 안내 + 상담 버튼 (긴 목록 끝에서도 신청 가능) */}
      <div className="mt-8"><NoticeBar /></div>
    </div>
  );
}

function CatBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ${active ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]"}`}>
      {label}
    </button>
  );
}

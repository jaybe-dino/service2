import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, Lightbulb, AlertTriangle, Info, Check, ShoppingBag, ListChecks } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { GUIDES, GUIDE_MAP, type GuideCallout } from "@/data/ktrend/guides";
import { ONBOARDING } from "@/data/ktrend/meta";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const g = GUIDE_MAP[slug];
  if (!g) return { title: "가이드 — Glovek" };
  return {
    title: `${g.title} — Glovek 입점 가이드`,
    description: g.summary,
    alternates: { canonical: `/guide/${g.slug}` },
  };
}

const CALLOUT: Record<GuideCallout["kind"], { icon: typeof Info; cls: string; label: string }> = {
  tip: { icon: Lightbulb, cls: "border-emerald-200 bg-emerald-50 text-emerald-800", label: "TIP" },
  warn: { icon: AlertTriangle, cls: "border-amber-200 bg-amber-50 text-amber-800", label: "주의" },
  info: { icon: Info, cls: "border-sky-200 bg-sky-50 text-sky-800", label: "참고" },
};

export default async function GuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = GUIDE_MAP[slug];
  if (!g) notFound();

  const related = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 3);

  return (
    <PageShell>
      <article className="mx-auto max-w-3xl">
        <Link href="/guide" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">
          <ArrowLeft size={14} /> 가이드 목록
        </Link>

        <header className="mt-4 border-b border-[var(--border)] pb-5">
          <div className="flex items-center gap-2">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--accent-light)] text-[22px]">{g.emoji}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">{g.category}</span>
          </div>
          <h1 className="mt-3 text-[24px] font-black leading-tight tracking-tight">{g.title}</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{g.summary}</p>
          <div className="mt-3 flex items-center gap-1 text-[11px] text-[var(--muted)]">
            <Clock size={11} /> {g.readMin}분 분량 · {g.updated} 업데이트
          </div>
        </header>

        <div className="mt-6 space-y-7">
          {g.sections.map((s, i) => {
            const C = s.callout ? CALLOUT[s.callout.kind] : null;
            return (
              <section key={i}>
                <h2 className="text-[16px] font-black">{s.h}</h2>
                {s.body?.map((p, k) => (
                  <p key={k} className="mt-2 text-[13px] leading-relaxed text-[var(--fg)]/85">{p}</p>
                ))}
                {s.bullets && (
                  <ul className="mt-3 space-y-1.5">
                    {s.bullets.map((b, k) => (
                      <li key={k} className="flex items-start gap-2 text-[13px] leading-relaxed">
                        <Check size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.steps && (
                  <ol className="mt-3 space-y-2">
                    {s.steps.map((st, k) => (
                      <li key={k} className="flex gap-3 rounded-xl border border-[var(--border)] bg-white p-3">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[11px] font-black text-white">{k + 1}</span>
                        <div>
                          <div className="text-[13px] font-bold">{st.t}</div>
                          <div className="mt-0.5 text-[12px] leading-relaxed text-[var(--muted)]">{st.d}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                {s.callout && C && (
                  <div className={`mt-3 flex items-start gap-2 rounded-xl border p-3 text-[12px] leading-relaxed ${C.cls}`}>
                    <C.icon size={15} className="mt-0.5 shrink-0" />
                    <span><b>{C.label}</b> · {s.callout.text}</span>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* 직접 vs GloveK 비교 */}
        {g.compare && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)]">
            <div className="bg-slate-50 px-4 py-3 text-[13px] font-black">직접 진출 vs GloveK</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[12px]">
                <thead>
                  <tr className="border-y border-[var(--border)] text-left text-[10px] uppercase text-[var(--muted)]">
                    <th className="p-3">항목</th>
                    <th className="p-3">직접 진출</th>
                    <th className="p-3 text-[var(--accent)]">GloveK</th>
                  </tr>
                </thead>
                <tbody>
                  {g.compare.map((r, i) => (
                    <tr key={i} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3 font-bold">{r.row}</td>
                      <td className="p-3 text-[var(--muted)]">{r.direct}</td>
                      <td className="p-3 font-semibold text-[var(--fg)]">{r.glovek}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 하단 CTA */}
        <div className="mt-8 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#1A56DB] p-6 text-white sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="text-[15px] font-black">이제 우리 브랜드 차례입니다</div>
            <div className="mt-1 text-[12px] text-white/90">자가체크로 예비 등급을 진단하고 맞춤 트랙으로 바로 신청하세요.</div>
          </div>
          <div className="flex shrink-0 gap-2">
            {ONBOARDING.enabled && (
              <Link href={ONBOARDING.path} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-[12px] font-black text-[#1A56DB] hover:bg-white/90">
                <ShoppingBag size={14} /> 입점 신청
              </Link>
            )}
            <Link href="/plans/mall" className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 px-4 py-2.5 text-[12px] font-black text-white hover:bg-white/10">
              <ListChecks size={14} /> 요금 보기
            </Link>
          </div>
        </div>

        {/* 관련 가이드 */}
        {related.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-[14px] font-black">이어서 읽으면 좋아요</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/guide/${r.slug}`} className="group rounded-xl border border-[var(--border)] bg-white p-4 transition hover:border-[var(--accent)] hover:shadow-md">
                  <div className="text-[18px]">{r.emoji}</div>
                  <div className="mt-1.5 text-[12px] font-bold leading-snug">{r.title}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)]">읽기 <ArrowRight size={11} className="transition-transform group-hover:translate-x-0.5" /></div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </PageShell>
  );
}

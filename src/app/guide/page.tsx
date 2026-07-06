import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight, Clock, ShoppingBag } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { GUIDES, GUIDE_CATEGORIES } from "@/data/ktrend/guides";
import { ONBOARDING } from "@/data/ktrend/meta";

export const metadata: Metadata = {
  title: "틱톡샵 입점 가이드 — Glovek",
  description: "틱톡샵 크로스보더 입점의 자격·서류·인증부터 수수료·정산·등급별 로드맵·콘텐츠 규정까지. 브랜드가 알아야 할 전 과정을 정리한 가이드.",
  alternates: { canonical: "/guide" },
};

const CAT_COLOR: Record<string, string> = {
  "입점 시작": "#7C3AED",
  "비용·정산": "#0E9F6E",
  "성장 전략": "#1A56DB",
  "규정·운영": "#EA580C",
};

export default function GuideHubPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--accent)]">
            <BookOpen size={12} /> 입점 가이드
          </span>
          <h1 className="mt-3 text-[26px] font-black tracking-tight">틱톡샵 입점, 처음이라 막막하다면</h1>
          <p className="mx-auto mt-2 max-w-2xl text-[13px] leading-relaxed text-[var(--muted)]">
            자격·서류·인증부터 수수료·정산, 등급별 로드맵, 콘텐츠 규정까지 —
            브랜드가 실제로 궁금해하는 전 과정을 순서대로 풀었습니다. 읽고 나면 &lsquo;우리도 할 수 있겠다&rsquo;가 됩니다.
          </p>
        </div>

        {GUIDE_CATEGORIES.map((cat) => {
          const items = GUIDES.filter((g) => g.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat} className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <span className="h-4 w-1 rounded-full" style={{ background: CAT_COLOR[cat] }} />
                <h2 className="text-[15px] font-black">{cat}</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/guide/${g.slug}`}
                    className="group flex flex-col rounded-2xl border border-[var(--border)] bg-white p-5 transition hover:border-[var(--accent)] hover:shadow-lg"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--accent-light)] text-[20px]">{g.emoji}</span>
                      <div>
                        <h3 className="text-[15px] font-black leading-snug">{g.title}</h3>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--muted)]">
                          <Clock size={11} /> {g.readMin}분 · {g.updated} 업데이트
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 flex-1 text-[12px] leading-relaxed text-[var(--muted)]">{g.summary}</p>
                    <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[var(--accent)]">
                      가이드 읽기 <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {/* 하단 CTA */}
        {ONBOARDING.enabled && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#1A56DB] px-6 py-5 text-white sm:flex-row">
            <div>
              <div className="text-[15px] font-black">준비 상태부터 진단해 볼까요?</div>
              <div className="mt-1 text-[12px] text-white/90">자가체크 5개 지표로 예비 등급과 맞춤 트랙을 바로 확인할 수 있어요.</div>
            </div>
            <Link href={ONBOARDING.path} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-[12px] font-black text-[#1A56DB] hover:bg-white/90">
              <ShoppingBag size={14} /> 자가체크하고 시작하기 <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </PageShell>
  );
}

import { Fragment } from "react";
import type { Metadata } from "next";

// 검색엔진 색인 차단(비공개 자료). robots.ts에도 disallow 추가됨.
export const metadata: Metadata = {
  title: "국가별 12개월 예산 플래닝",
  description: "브랜드사 대상 예산 편성 자료",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const card = "rounded-2xl border border-[var(--border)] bg-slate-50/70 p-5";

// 기본 예산 항목 (국가당 · 월) — A타입 / B타입 금액 + 항목별 편성 기준
const BUDGET: { icon: string; title: string; sub: string; a: string; b: string; rule: React.ReactNode; pink?: boolean }[] = [
  {
    icon: "🧾", title: "운영비", sub: "스토어 운영·번역·CS·정산 관리",
    a: "300~500만", b: "500~700만",
    rule: "규모와 무관하게 필요한 고정 인프라 · 스토어·번역·CS·정산을 매월 동일하게 편성합니다.",
  },
  {
    icon: "🎁", title: "무가 운영", sub: "크리에이터 모집·제품 공급·시딩 운영",
    a: "300~1,000만", b: "1,000~3,000만",
    rule: <>기본안 <b>최대 1,000개</b>까지 진행 (모집·제품 공급 조건) · 초과 및 메가 캠페인 무가는 별도 협의.</>,
  },
  {
    icon: "💸", title: "유가 운영비", sub: "인플루언서별 유가 캠페인 집행",
    a: "건당 100만~", b: "건당 300만~",
    rule: <>인플루언서별 마케팅 전략 수립 후 <b>샵 티어별 편성</b> (100만~5억).</>,
  },
  {
    icon: "📈", title: "부스팅 애즈 (예비비)", sub: "ROAS 기준 광고 증액 운영",
    a: "500만~", b: "1,500만~", pink: true,
    rule: <>ROAS 기준 추가 편성 · 샵 티어별 (500만~5억). <b>성과가 확인된 소재에만</b> 집행하며 미달 시 미집행·중단.</>,
  },
];

// 12개월 시즌 편성 — 막대 높이(%) + 유형(base/mid/peak)
const BARS: { m: number; h: number; t: "base" | "mid" | "peak" }[] = [
  { m: 1, h: 40, t: "base" }, { m: 2, h: 40, t: "base" }, { m: 3, h: 40, t: "base" },
  { m: 4, h: 40, t: "base" }, { m: 5, h: 40, t: "base" }, { m: 6, h: 62, t: "mid" },
  { m: 7, h: 40, t: "base" }, { m: 8, h: 40, t: "base" }, { m: 9, h: 60, t: "mid" },
  { m: 10, h: 74, t: "peak" }, { m: 11, h: 96, t: "peak" }, { m: 12, h: 92, t: "peak" },
];
const BAR_COLOR: Record<string, string> = {
  base: "bg-amber-200",
  mid: "bg-pink-300",
  peak: "bg-[var(--accent)]",
};

// 타입별 예산 표 (A: slate / B: accent)
function TypeTable({ type }: { type: "A" | "B" }) {
  const isB = type === "B";
  return (
    <section>
      {/* 타입 배지 */}
      <div className={`mb-3 flex flex-wrap items-center gap-2.5 rounded-2xl border px-5 py-4 ${isB ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)] bg-white"}`}>
        <span className={`rounded-full px-3 py-1 text-[12px] font-extrabold text-white ${isB ? "bg-[var(--accent)]" : "bg-slate-800"}`}>{type} 타입</span>
        <span className="text-[13px] text-slate-600">
          {isB ? <><b className="text-[var(--accent)]">해외매출 50억 이상</b> — 비중운영 A 대비 2~3배 집중 확장안</> : <>성장 초입 · 중견 브랜드 — 효율 중심 진입안</>}
        </span>
      </div>

      {/* 표 */}
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="w-full min-w-[300px] border-collapse text-[13.5px]">
          <thead>
            <tr className={isB ? "bg-[var(--accent)] text-white" : "bg-slate-800 text-white"}>
              <th className="px-4 py-3 text-left font-bold">항목</th>
              <th className="px-4 py-3 text-right font-bold">월 예산</th>
            </tr>
          </thead>
          <tbody>
            {BUDGET.map((b) => (
              <Fragment key={b.title}>
                {/* 항목 + 금액 */}
                <tr className={`border-t border-[var(--border)] ${b.pink ? "bg-[var(--accent-light)]" : "bg-white"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-[16px]">{b.icon}</span>
                      <div className="min-w-0">
                        <div className={`font-extrabold ${b.pink ? "text-[var(--accent)]" : ""}`}>{b.title}</div>
                        <div className="text-[11.5px] leading-snug text-[var(--muted)]">{b.sub}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right text-[16px] font-black ${isB ? "text-[var(--accent)]" : ""}`}>
                    {isB ? b.b : b.a}
                  </td>
                </tr>
                {/* 편성 기준 (항목 하위 행) */}
                <tr className={b.pink ? "bg-[var(--accent-light)]" : "bg-slate-50/60"}>
                  <td colSpan={2} className="px-4 pb-3 pt-0">
                    <div className="flex gap-2 text-[12px] leading-relaxed text-slate-600">
                      <span className="mt-0.5 shrink-0 rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">편성 기준</span>
                      <span>{b.rule}</span>
                    </div>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function TiktokSitPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-10 sm:py-16">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[3px] text-[var(--accent)]">19 · Budget Planning</div>
            <h1 className="mt-3 inline-block rounded-2xl bg-[var(--accent)] px-6 py-3 text-[28px] font-black leading-none text-white sm:text-[36px]">
              국가별 12개월 예산 플래닝
            </h1>
            <p className="mt-4 text-[15px] text-[var(--muted)] sm:text-[17px]">
              중소 브랜드 일반 기준 · 국가별 월 예산 구성 · 시즌별 증액 반영
            </p>
          </div>
          <div className="hidden shrink-0 text-[18px] font-black text-[var(--accent)] sm:block">Glovek ✦</div>
        </div>

        {/* 기본 예산 — A타입 / B타입 각각 표 */}
        <div className="mt-10">
          <h2 className="mb-4 text-[18px] font-extrabold">기본 예산 (국가당 · 월)</h2>
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <TypeTable type="A" />
            <TypeTable type="B" />
          </div>

          {/* 편성 안내 (다크 바) */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 px-5 py-4 text-white">
            <div className="text-[13.5px]">
              <b className="text-[var(--accent)]">편성 안내</b>&nbsp;&nbsp;부스팅 애즈는 성과에 따라 집행하는 <b>예비비</b>로 편성합니다
            </div>
            <div className="text-[12px] text-slate-400">* 샵 티어·품목에 따라 변동</div>
          </div>
        </div>

        {/* 12개월 시즌 편성 */}
        <div className="mt-12">
          <h2 className="mb-4 text-[18px] font-extrabold">12개월 시즌 편성</h2>
          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            {/* 막대 차트 */}
            <div className={card}>
              <div className="flex h-[220px] items-end justify-between gap-1.5 sm:gap-2.5">
                {BARS.map((b) => (
                  <div key={b.m} className="flex h-full flex-1 flex-col items-center justify-end">
                    <div className={`w-full rounded-t-md ${BAR_COLOR[b.t]}`} style={{ height: `${b.h}%` }} />
                    <div className={`mt-2 text-[12px] ${b.m >= 11 ? "font-black" : "text-[var(--muted)]"}`}>{b.m}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-[12px] text-[var(--muted)]">
                {[["기본", "bg-amber-200"], ["중간 시즌", "bg-pink-300"], ["블프·연말 성수기", "bg-[var(--accent)]"]].map(([label, c]) => (
                  <span key={label} className="inline-flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${c}`} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* 증액 배너 */}
            <div className="flex flex-col justify-center rounded-2xl bg-gradient-to-r from-[var(--accent)] to-orange-400 px-6 py-8 text-white">
              <div className="text-[13px] font-bold tracking-wide opacity-90">블랙프라이데이 · 주요 시즌</div>
              <div className="mt-1 text-[32px] font-black leading-none sm:text-[38px]">예산 200~300% 증액</div>
              <div className="mt-3 text-[13.5px] opacity-90">11~12월 집중 · 시즌 전 사전 시딩 확대 필수</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

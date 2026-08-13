import type { Metadata } from "next";

// 검색엔진 색인 차단(비공개 자료). robots.ts에도 disallow 추가됨.
export const metadata: Metadata = {
  title: "국가별 12개월 예산 플래닝",
  description: "브랜드사 대상 예산 편성 자료",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const card = "rounded-2xl border border-[var(--border)] bg-slate-50/70 p-5";

// 기본 예산 항목 (국가당 · 월)
const BUDGET: { icon: string; title: string; sub: string; amount: string; pink?: boolean }[] = [
  { icon: "🧾", title: "운영비", sub: "스토어 운영·번역·CS·정산 관리", amount: "300~500만" },
  { icon: "🎁", title: "무가 운영", sub: "크리에이터 모집·제품 공급·시딩 운영", amount: "300~1,000만" },
  { icon: "💸", title: "유가 운영비", sub: "인플루언서별 유가 캠페인 집행", amount: "100만~" },
  { icon: "📈", title: "부스팅 애즈 (예버비)", sub: "ROAS 기준 광고 증액 운영", amount: "500만~", pink: true },
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

const RULES: React.ReactNode[] = [
  <><b>무가 운영</b> 기본안 최대 <b>1,000개</b>까지 진행 (모집·제품 공급 조건) · 초과 및 메가 캠페인 무가는 별도 협의</>,
  <><b>유가 운영비</b> 인플루언서별 마케팅 전략 수립 후 샵 티어별 편성 (100만~5억)</>,
  <><b>부스팅 애즈(예버비)</b> ROAS 기준 추가 편성 · 샵 티어별 (500만~5억)</>,
];

export default function TiktokMarketing2Page() {
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

        {/* 2열 그리드 */}
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* 좌: 기본 예산 */}
          <section>
            <h2 className="mb-4 text-[18px] font-extrabold">기본 예산 (국가당 · 월)</h2>
            <div className="space-y-3">
              {BUDGET.map((b) => (
                <div
                  key={b.title}
                  className={`flex items-center gap-4 rounded-2xl border p-5 ${
                    b.pink ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)] bg-slate-50/70"
                  }`}
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[20px] ${b.pink ? "bg-white" : "bg-white"}`}>
                    {b.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[17px] font-extrabold ${b.pink ? "text-[var(--accent)]" : ""}`}>{b.title}</div>
                    <div className="mt-0.5 text-[13px] text-[var(--muted)]">{b.sub}</div>
                  </div>
                  <div className={`shrink-0 text-[22px] font-black sm:text-[26px] ${b.pink ? "text-[var(--accent)]" : ""}`}>{b.amount}</div>
                </div>
              ))}
            </div>

            {/* 편성 안내 (다크 바) */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 px-5 py-4 text-white">
              <div className="text-[13.5px]">
                <b className="text-[var(--accent)]">편성 안내</b>&nbsp;&nbsp;부스팅 애즈는 성과에 따라 집행하는{" "}
                <b>예버비</b>로 편성합니다
              </div>
              <div className="text-[12px] text-slate-400">* 샵 티어·품목에 따라 변동</div>
            </div>
          </section>

          {/* 우: 12개월 시즌 편성 */}
          <section>
            <h2 className="mb-4 text-[18px] font-extrabold">12개월 시즌 편성</h2>

            {/* 막대 차트 */}
            <div className={card}>
              <div className="flex h-[220px] items-end justify-between gap-1.5 sm:gap-2.5">
                {BARS.map((b) => (
                  <div key={b.m} className="flex h-full flex-1 flex-col items-center justify-end">
                    <div
                      className={`w-full rounded-t-md ${BAR_COLOR[b.t]}`}
                      style={{ height: `${b.h}%` }}
                    />
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
            <div className="mt-5 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-orange-400 px-6 py-5 text-white">
              <div className="text-[13px] font-bold tracking-wide opacity-90">블랙프라이데이 · 주요 시즌</div>
              <div className="mt-1 text-[30px] font-black leading-none sm:text-[34px]">예산 200~300% 증액</div>
              <div className="mt-2 text-[13.5px] opacity-90">11~12월 집중 · 시즌 전 사전 시딩 확대 필수</div>
            </div>

            {/* 편성 기준 */}
            <div className="mt-5 rounded-2xl border border-[var(--border)] bg-white p-5">
              <div className="mb-2 text-[14px] font-extrabold">편성 기준</div>
              <ul className="space-y-2">
                {RULES.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[13.5px] leading-relaxed text-slate-600">
                    <span className="mt-1 text-[var(--accent)]">·</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* 계산기 유도 */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-slate-50/70 px-6 py-5">
          <div className="text-[14px] text-[var(--muted)]">
            우리 브랜드 기준으로 예산·성과를 시뮬레이션하고 싶다면
          </div>
          <a
            href="/tiktokmarketing3"
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-[13px] font-extrabold text-white hover:opacity-90"
          >
            예산·성과 시뮬레이터 열기 →
          </a>
        </div>
      </div>
    </div>
  );
}

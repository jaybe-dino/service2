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

/* ── 타입별 월 예산 설계 (A / B) ─────────────────────────────
   운영비는 고정, 비중운영(무가·유가·부스팅)은 시즌 계수로 증액.
   B타입(해외매출 50억 이상)은 A 대비 비중운영을 2~3배로 집중 편성. */
const SEASON = [1, 1, 1, 1, 1, 1.3, 1, 1, 1.3, 1.8, 2.5, 2.2]; // 월별 비중운영 계수
type Model = { op: number; seed: number; paid: number; boost: number };
const MODEL_A: Model = { op: 400, seed: 500, paid: 200, boost: 500 };
const MODEL_B: Model = { op: 600, seed: 1400, paid: 500, boost: 1300 };

function monthRows(m: Model) {
  return SEASON.map((f, i) => {
    const seed = Math.round(m.seed * f);
    const paid = Math.round(m.paid * f);
    const boost = Math.round(m.boost * f);
    const total = m.op + seed + paid + boost;
    return { month: i + 1, op: m.op, seed, paid, boost, total, peak: i >= 9 };
  });
}
function annual(m: Model) {
  return monthRows(m).reduce((a, r) => a + r.total, 0);
}
const fmt = (v: number) => v.toLocaleString("ko-KR");
const eok = (v: number) => (v / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 2 });
const A_YR = annual(MODEL_A);
const B_YR = annual(MODEL_B);

function BudgetTable({ model, tone }: { model: Model; tone: "a" | "b" }) {
  const rows = monthRows(model);
  const sum = (k: "op" | "seed" | "paid" | "boost" | "total") => rows.reduce((a, r) => a + r[k], 0);
  const head = tone === "b" ? "bg-[var(--accent)] text-white" : "bg-slate-800 text-white";
  const cols = ["월", "운영비", "무가 운영", "유가", "부스팅(예버비)", "월 합계"];
  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
      <table className="w-full min-w-[560px] border-collapse text-right text-[13px]">
        <thead>
          <tr className={head}>
            {cols.map((c, i) => (
              <th key={c} className={`px-3 py-2.5 font-bold ${i === 0 ? "text-left" : ""}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month} className={`border-t border-[var(--border)] ${r.peak ? "bg-[var(--accent-light)]" : "bg-white"}`}>
              <td className="px-3 py-2 text-left font-bold">
                {r.month}월 {r.peak && <span className="ml-1 rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold text-white">성수기</span>}
              </td>
              <td className="px-3 py-2 text-slate-500">{fmt(r.op)}</td>
              <td className="px-3 py-2">{fmt(r.seed)}</td>
              <td className="px-3 py-2">{fmt(r.paid)}</td>
              <td className="px-3 py-2 font-semibold text-[var(--accent)]">{fmt(r.boost)}</td>
              <td className="px-3 py-2 font-black">{fmt(r.total)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-300 bg-slate-50 font-black">
            <td className="px-3 py-2.5 text-left">연 합계</td>
            <td className="px-3 py-2.5">{fmt(sum("op"))}</td>
            <td className="px-3 py-2.5">{fmt(sum("seed"))}</td>
            <td className="px-3 py-2.5">{fmt(sum("paid"))}</td>
            <td className="px-3 py-2.5 text-[var(--accent)]">{fmt(sum("boost"))}</td>
            <td className="px-3 py-2.5">{fmt(sum("total"))}</td>
          </tr>
        </tbody>
      </table>
    </div>
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
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[20px]">{b.icon}</span>
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
                <b className="text-[var(--accent)]">편성 안내</b>&nbsp;&nbsp;부스팅 애즈는 성과에 따라 집행하는 <b>예버비</b>로 편성합니다
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

        {/* ── 타입별 월 예산 설계 (A / B) ── */}
        <section className="mt-16">
          <div className="text-[11px] font-extrabold uppercase tracking-[3px] text-sky-600">Budget Models</div>
          <h2 className="mt-2 text-[24px] font-black tracking-tight sm:text-[30px]">타입별 12개월 월 예산 설계 (A · B)</h2>
          <p className="mt-2 max-w-[900px] text-[14px] leading-relaxed text-[var(--muted)]">
            브랜드 규모에 맞춘 두 가지 운영 모델입니다. <b>A타입</b>은 성장 초입~중견 브랜드의 효율적 진입안,
            <b> B타입</b>은 <b>해외 매출 50억 이상</b> 브랜드가 시장 지배력을 확보하기 위해 비중운영(무가·유가·부스팅)을
            A 대비 <b className="text-[var(--accent)]">2~3배</b>로 집중 편성한 확장안입니다. 운영비는 고정, 비중운영은 시즌 계수에 따라 증액됩니다.
          </p>

          {/* 비교 요약 카드 */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-[12px] font-extrabold text-white">A 타입</span>
                <span className="text-[13px] font-semibold text-[var(--muted)]">성장 초입 · 중견 브랜드</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <div className="text-[30px] font-black">{eok(A_YR)}억</div>
                <div className="text-[13px] text-[var(--muted)]">/ 연 · 국가당</div>
              </div>
              <div className="mt-1 text-[13px] text-[var(--muted)]">월 평균 약 {fmt(Math.round(A_YR / 12))}만 · 효율 중심 검증형</div>
            </div>
            <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-light)] p-5">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-[12px] font-extrabold text-white">B 타입</span>
                <span className="text-[13px] font-semibold text-[var(--accent)]">해외매출 50억 이상 · 확장</span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <div className="text-[30px] font-black text-[var(--accent)]">{eok(B_YR)}억</div>
                <div className="text-[13px] text-[var(--muted)]">/ 연 · 국가당</div>
              </div>
              <div className="mt-1 text-[13px] text-[var(--muted)]">월 평균 약 {fmt(Math.round(B_YR / 12))}만 · A 대비 약 {(B_YR / A_YR).toFixed(1)}배 편성</div>
            </div>
          </div>

          {/* A 타입 표 */}
          <div className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-[18px] font-extrabold">A 타입 · 월별 예산 <span className="text-[13px] font-normal text-[var(--muted)]">(국가당 · 단위: 만원)</span></h3>
            </div>
            <p className="mb-3 text-[13.5px] leading-relaxed text-slate-600">
              성장 초입~중견 브랜드의 <b>효율적 진입안</b>입니다. 무가 시딩으로 소재를 쌓고, 성과가 확인된 콘텐츠에만 부스팅을 태워
              리스크를 낮춥니다. 평시 월 약 1,600만으로 시작해 성수기(10~12월) 부스팅·무가를 2배 이상 증액합니다.
            </p>
            <BudgetTable model={MODEL_A} tone="a" />
          </div>

          {/* B 타입 표 */}
          <div className="mt-10">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-[18px] font-extrabold text-[var(--accent)]">B 타입 · 월별 예산 <span className="text-[13px] font-normal text-[var(--muted)]">(국가당 · 단위: 만원)</span></h3>
            </div>
            <p className="mb-3 text-[13.5px] leading-relaxed text-slate-600">
              <b>해외매출 50억 이상</b> 브랜드의 <b>시장 지배 확장안</b>입니다. 무가 시딩 물량을 대폭 늘려 콘텐츠 점유율을 높이고,
              유가·부스팅을 A 대비 2~3배로 집중해 상위 티어(T3~T5)로 빠르게 진입합니다. 성수기엔 검증된 소재에 예산을 몰아
              매출 레버리지를 극대화합니다.
            </p>
            <BudgetTable model={MODEL_B} tone="b" />
          </div>

          {/* 설계 메모 */}
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-slate-50/70 p-5 text-[13px] leading-relaxed text-slate-600">
            <b>설계 기준 메모</b>
            <ul className="mt-2 space-y-1.5">
              <li>· <b>운영비</b>는 규모와 무관하게 필요한 고정 인프라(스토어·번역·CS·정산)로 매월 동일하게 편성.</li>
              <li>· <b>비중운영(무가·유가·부스팅)</b>은 시즌 계수(6·9월 1.3배, 10월 1.8배, 11월 2.5배, 12월 2.2배)로 증액.</li>
              <li>· <b>B타입</b>은 A 대비 무가 약 2.8배·유가 2.5배·부스팅 2.6배로 집중 → 연 총액 약 {(B_YR / A_YR).toFixed(1)}배.</li>
              <li>· 부스팅은 <b>예버비</b> — ROAS가 확인된 소재에만 집행하며 성과 미달 시 미집행/중단.</li>
            </ul>
          </div>
        </section>

        {/* 계산기 유도 */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-slate-50/70 px-6 py-5">
          <div className="text-[14px] text-[var(--muted)]">우리 브랜드 기준으로 예산·성과를 시뮬레이션하고 싶다면</div>
          <a href="/tiktokmarketing3" className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-[13px] font-extrabold text-white hover:opacity-90">
            예산·성과 시뮬레이터 열기 →
          </a>
        </div>
      </div>
    </div>
  );
}

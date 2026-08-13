import type { Metadata } from "next";

// 검색엔진 색인 차단(비공개 자료). robots.ts에도 disallow 추가됨.
export const metadata: Metadata = {
  title: "TikTok Shop 성장 예산 설계",
  description: "브랜드사 대상 예산·성장 제안 자료",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const CY = "text-sky-600";
const PK = "text-[var(--accent)]";

// 왜 매력적인가 — 4가지 핵심 가치
const VALUES: { icon: string; title: string; desc: string; pink?: boolean }[] = [
  { icon: "🎯", title: "성과가 나올 때만 증액", desc: "부스팅은 ‘예버비’ — ROAS가 확인된 콘텐츠에만 광고비를 태웁니다. 안 나오면 즉시 끕니다. 태우는 돈이 곧 검증된 매출.", pink: true },
  { icon: "🌱", title: "광고비 0으로 시작", desc: "무가 시딩은 제품(현물)만 제공. 광고비 없이 콘텐츠 자산 수백 개를 먼저 쌓고, 터지는 소재만 골라 키웁니다." },
  { icon: "📈", title: "티어가 오르면 복리로", desc: "콘텐츠가 쌓일수록 샵 티어가 오르고, 티어가 오를수록 노출·전환 효율이 좋아집니다. 초기 투자가 시간이 갈수록 커집니다." },
  { icon: "🔥", title: "시즌에 레버리지", desc: "블프·연말엔 같은 소재로 예산만 2~3배 태워도 매출이 폭발합니다. 평소에 쌓은 소재가 성수기에 터집니다." },
];

// 예산을 '투자→성과'로 리프레이밍
const INVEST: { tag: string; title: string; get: string; amount: string; pink?: boolean }[] = [
  { tag: "인프라", title: "운영비", get: "현지 스토어·번역·CS·정산을 대행. 브랜드는 제품에만 집중.", amount: "월 300~500만" },
  { tag: "소재 자산", title: "무가 시딩", get: "광고비 0. 크리에이터가 만든 콘텐츠 = 재사용 가능한 광고 소재 수백 개.", amount: "월 300~1,000만" },
  { tag: "매출 레퍼런스", title: "유가 캠페인", get: "검증된 인플루언서로 초기 매출·후기·랭킹을 빠르게 확보.", amount: "건당 100만~" },
  { tag: "성과 증폭", title: "부스팅 애즈 (예버비)", get: "ROAS 확인된 소재만 노출 100만·1,000만까지 확대. 성과 없으면 미집행.", amount: "성과 연동 500만~", pink: true },
];

// ROI 예시 (부스팅 성과 기반)
const ROI = [
  { spend: "500만", roas: "3배", gmv: "1,500만" },
  { spend: "1,000만", roas: "3.5배", gmv: "3,500만" },
  { spend: "3,000만", roas: "4배", gmv: "1.2억" },
];

// 12개월 시즌 편성 막대
const BARS: { m: number; h: number; t: "base" | "mid" | "peak" }[] = [
  { m: 1, h: 40, t: "base" }, { m: 2, h: 40, t: "base" }, { m: 3, h: 40, t: "base" },
  { m: 4, h: 40, t: "base" }, { m: 5, h: 40, t: "base" }, { m: 6, h: 62, t: "mid" },
  { m: 7, h: 40, t: "base" }, { m: 8, h: 40, t: "base" }, { m: 9, h: 60, t: "mid" },
  { m: 10, h: 74, t: "peak" }, { m: 11, h: 96, t: "peak" }, { m: 12, h: 92, t: "peak" },
];
const BAR_COLOR: Record<string, string> = { base: "bg-amber-200", mid: "bg-pink-300", peak: "bg-[var(--accent)]" };

// 성장 4단계
const STEPS: { n: string; title: string; desc: string }[] = [
  { n: "01", title: "시작 (Seed)", desc: "무가 시딩으로 콘텐츠 자산 확보. 광고비 없이 데이터부터." },
  { n: "02", title: "검증 (Prove)", desc: "유가 캠페인으로 초기 매출·후기·랭킹 확보. 무엇이 팔리는지 확인." },
  { n: "03", title: "증폭 (Scale)", desc: "ROAS 확인된 소재에 부스팅. 성과 나는 것만 키움." },
  { n: "04", title: "성수기 (Season)", desc: "쌓인 소재를 블프·연말에 2~3배 예산으로 폭발." },
];

// 리스크 안심 요소
const SAFE: string[] = [
  "부스팅은 성과가 확인된 소재에만 집행 — 안 나오면 즉시 중단(예버비)",
  "무가 시딩은 광고비 0, 제품 원가만으로 시작 가능",
  "예산은 국가·품목·티어에 따라 유연하게 스케일 (작게 시작 → 검증 후 확대)",
  "운영·번역·CS·정산은 전부 대행 — 브랜드는 제품 공급에만 집중",
];

export default function TiktokMarketing2Page() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* 히어로 */}
      <header className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-[var(--accent)] opacity-[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-24 h-64 w-64 rounded-full bg-sky-400 opacity-[0.08] blur-3xl" />
        <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-10 sm:py-20">
          <div className="text-[12px] font-extrabold uppercase tracking-[4px] text-[var(--accent)]">Growth Budget · TikTok Shop</div>
          <h1 className="mt-4 text-[34px] font-black leading-[1.12] tracking-tight sm:text-[52px]">
            비용이 아니라, <span className={PK}>성장에 투자</span>합니다
          </h1>
          <p className="mt-5 max-w-[760px] text-[16px] leading-relaxed text-[var(--muted)] sm:text-[19px]">
            작게 시작해 데이터로 키우는 구조입니다. 광고비 없이 소재를 쌓고, <b className="text-[var(--fg)]">성과가 확인된 콘텐츠에만</b> 예산을 태웁니다.
            티어가 오를수록 효율은 복리로 커지고, 성수기엔 같은 소재로 매출이 폭발합니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="/tiktokmarketing3" className="rounded-full bg-[var(--accent)] px-6 py-3 text-[14px] font-extrabold text-white hover:opacity-90">
              우리 브랜드로 성과 시뮬레이션 →
            </a>
            <a href="/tiktokmarketing" className="rounded-full border border-[var(--border)] bg-white px-6 py-3 text-[14px] font-extrabold hover:bg-slate-50">
              전체 구조 가이드 보기
            </a>
          </div>
          {/* 신뢰 지표 */}
          <div className="mt-10 grid max-w-[820px] grid-cols-2 gap-4 sm:grid-cols-4">
            {[["98%", "무가 시딩 이행률"], ["ROAS 3~4배", "부스팅 목표 효율"], ["200~300%", "성수기 매출 레버리지"], ["0원", "무가 광고비"]].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-[var(--border)] bg-white p-4">
                <div className={`text-[22px] font-black leading-none sm:text-[26px] ${PK}`}>{v}</div>
                <div className="mt-1.5 text-[12px] text-[var(--muted)]">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-10">
        {/* 왜 매력적인가 */}
        <section>
          <div className={`text-[11px] font-extrabold uppercase tracking-[3px] ${CY}`}>Why it works</div>
          <h2 className="mt-2 text-[26px] font-black tracking-tight sm:text-[32px]">돈이 아깝지 않은 4가지 이유</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className={`rounded-2xl border p-6 ${v.pink ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)] bg-white"}`}>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[20px] ring-1 ring-[var(--border)]">{v.icon}</span>
                  <h3 className={`text-[18px] font-extrabold ${v.pink ? PK : ""}`}>{v.title}</h3>
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-slate-600">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 성장 4단계 */}
        <section className="mt-16">
          <div className={`text-[11px] font-extrabold uppercase tracking-[3px] ${CY}`}>Growth Path</div>
          <h2 className="mt-2 text-[26px] font-black tracking-tight sm:text-[32px]">작게 시작해서, 이렇게 커집니다</h2>
          <div className="mt-7 grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative rounded-2xl border border-[var(--border)] bg-white p-5">
                <div className={`text-[13px] font-black ${i === 3 ? PK : CY}`}>{s.n}</div>
                <h4 className="mt-1 text-[16px] font-extrabold">{s.title}</h4>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">{s.desc}</p>
                {i < STEPS.length - 1 && <span className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-slate-300 md:inline">→</span>}
              </div>
            ))}
          </div>
        </section>

        {/* 투자 → 성과 (예산 리프레이밍) */}
        <section className="mt-16">
          <div className={`text-[11px] font-extrabold uppercase tracking-[3px] ${PK}`}>What you get</div>
          <h2 className="mt-2 text-[26px] font-black tracking-tight sm:text-[32px]">예산은 이렇게 <span className={PK}>성과로 돌아옵니다</span></h2>
          <p className="mt-2 text-[14px] text-[var(--muted)]">중소 브랜드 일반 기준 · 국가당 · 월. 실제는 티어·품목에 따라 유연하게 조정됩니다.</p>
          <div className="mt-7 space-y-3">
            {INVEST.map((it) => (
              <div key={it.title} className={`grid items-center gap-4 rounded-2xl border p-5 sm:grid-cols-[160px_1fr_auto] ${it.pink ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)] bg-white"}`}>
                <div>
                  <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-extrabold ${it.pink ? "bg-[var(--accent)] text-white" : "bg-slate-100 text-slate-600"}`}>{it.tag}</span>
                  <div className={`mt-2 text-[18px] font-extrabold ${it.pink ? PK : ""}`}>{it.title}</div>
                </div>
                <p className="text-[14px] leading-relaxed text-slate-600">{it.get}</p>
                <div className={`text-[18px] font-black sm:text-right ${it.pink ? PK : ""}`}>{it.amount}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ROI 예시 */}
        <section className="mt-16 rounded-3xl border border-[var(--border)] bg-slate-50/70 p-6 sm:p-8">
          <div className={`text-[11px] font-extrabold uppercase tracking-[3px] ${PK}`}>Performance Math</div>
          <h2 className="mt-2 text-[24px] font-black tracking-tight sm:text-[30px]">부스팅은 태운 만큼이 아니라, <span className={PK}>돌아온 만큼</span></h2>
          <p className="mt-2 text-[14px] text-[var(--muted)]">ROAS가 확인된 소재에만 집행하므로, 광고비는 곧 검증된 매출입니다. (예시)</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {ROI.map((r) => (
              <div key={r.spend} className="rounded-2xl border border-[var(--border)] bg-white p-5 text-center">
                <div className="text-[13px] text-[var(--muted)]">부스팅 {r.spend}</div>
                <div className="my-2 text-[13px] font-bold text-slate-400">× ROAS {r.roas}</div>
                <div className={`text-[30px] font-black ${PK}`}>{r.gmv}</div>
                <div className="mt-1 text-[12px] text-[var(--muted)]">예상 GMV</div>
              </div>
            ))}
          </div>
          <div className="mt-5 text-center">
            <a href="/tiktokmarketing3" className="inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-[14px] font-extrabold text-white hover:opacity-90">
              우리 숫자로 직접 계산해보기 →
            </a>
          </div>
        </section>

        {/* 12개월 시즌 = 기회 */}
        <section className="mt-16">
          <div className={`text-[11px] font-extrabold uppercase tracking-[3px] ${CY}`}>Seasonal Leverage</div>
          <h2 className="mt-2 text-[26px] font-black tracking-tight sm:text-[32px]">평소에 쌓고, <span className={PK}>성수기에 터뜨립니다</span></h2>
          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            {/* 차트 */}
            <div className="rounded-2xl border border-[var(--border)] bg-slate-50/70 p-5">
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
                  <span key={label} className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-full ${c}`} />{label}</span>
                ))}
              </div>
            </div>
            {/* 증액 배너 + 설명 */}
            <div className="flex flex-col justify-center">
              <div className="rounded-2xl bg-gradient-to-r from-[var(--accent)] to-orange-400 px-6 py-6 text-white">
                <div className="text-[13px] font-bold tracking-wide opacity-90">블랙프라이데이 · 주요 시즌</div>
                <div className="mt-1 text-[32px] font-black leading-none sm:text-[38px]">매출 200~300% 확대</div>
                <div className="mt-2 text-[13.5px] opacity-90">이미 검증된 소재에 예산만 태우면 됩니다 · 11~12월 집중</div>
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-slate-600">
                성수기 매출의 핵심은 “그때 뭘 만드냐”가 아니라 “그전에 뭘 쌓아뒀냐”입니다.
                평소 무가 시딩으로 소재를 축적하고, 성수기엔 검증된 소재에 예산을 집중해 레버리지를 극대화합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 리스크 안심 */}
        <section className="mt-16 rounded-3xl border border-[var(--border)] bg-white p-6 sm:p-8">
          <h2 className="text-[22px] font-black tracking-tight sm:text-[26px]">부담은 최소화했습니다</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {SAFE.map((s) => (
              <div key={s} className="flex gap-3 rounded-xl bg-slate-50 p-4">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[12px] font-black text-white">✓</span>
                <p className="text-[13.5px] leading-relaxed text-slate-600">{s}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 최종 CTA */}
        <section className="mt-16 rounded-3xl bg-slate-900 px-6 py-10 text-center text-white sm:px-10 sm:py-14">
          <h2 className="text-[26px] font-black leading-tight tracking-tight sm:text-[34px]">
            지금 시작하는 브랜드가, <span className="text-[var(--accent)]">다음 성수기</span>를 가져갑니다
          </h2>
          <p className="mx-auto mt-4 max-w-[620px] text-[15px] leading-relaxed text-slate-300">
            소재는 하루아침에 쌓이지 않습니다. 광고비 없이 시작할 수 있는 지금이 가장 저렴한 진입점입니다.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="/tiktokmarketing3" className="rounded-full bg-[var(--accent)] px-7 py-3.5 text-[15px] font-extrabold text-white hover:opacity-90">
              예산·성과 시뮬레이터 →
            </a>
            <a href="/tiktokmarketing" className="rounded-full border border-white/25 px-7 py-3.5 text-[15px] font-extrabold text-white hover:bg-white/10">
              온보딩·마케팅 가이드
            </a>
          </div>
          <p className="mt-5 text-[12px] text-slate-500">* 예산·성과는 샵 티어·품목·시즌·콘텐츠 품질에 따라 변동하는 추정치입니다.</p>
        </section>
      </div>
    </div>
  );
}

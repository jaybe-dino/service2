"use client";
import { useMemo, useState } from "react";

/* ── 통화 포맷 (내부 단위: 만원) ───────────────────────────── */
function fmtManwon(v: number): string {
  if (!isFinite(v)) return "-";
  const neg = v < 0;
  const a = Math.abs(v);
  let s: string;
  if (a >= 10000) s = `${(a / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억`;
  else s = `${Math.round(a).toLocaleString("ko-KR")}만`;
  return (neg ? "−" : "") + s;
}
/* ── 입력 정의 (money 단위 = 만원) ─────────────────────────── */
type Key =
  | "countries" | "months" | "opCost"
  | "seedQty" | "seedUnit" | "seedGmvPer"
  | "paidCount" | "paidUnit" | "paidGmvPer"
  | "boostBudget" | "boostRoas"
  | "commRate" | "marginRate"
  | "peakMult" | "peakMonths" | "growthRate";

type Field = {
  key: Key; label: string; sub: string; unit: string; step: number; min: number; max: number;
};
type Group = { title: string; note: string; pink?: boolean; fields: Field[] };

const GROUPS: Group[] = [
  {
    title: "① 규모 · 기간",
    note: "몇 개 국가에서 몇 개월 운영할지",
    fields: [
      { key: "countries", label: "진출 국가 수", sub: "미국·베트남·태국 등", unit: "개국", step: 1, min: 1, max: 20 },
      { key: "months", label: "운영 기간", sub: "시뮬레이션 개월수", unit: "개월", step: 1, min: 1, max: 36 },
      { key: "opCost", label: "운영비 (국가·월)", sub: "스토어 운영·번역·CS·정산", unit: "만원", step: 50, min: 0, max: 5000 },
    ],
  },
  {
    title: "② 무가 시딩 (어필리에이트)",
    note: "제품만 제공 · 소재 발굴이 목적",
    fields: [
      { key: "seedQty", label: "무가 시딩 수량 (국가·월)", sub: "배포하는 제품 개수", unit: "개", step: 10, min: 0, max: 2000 },
      { key: "seedUnit", label: "시딩 제품 원가 (개당)", sub: "현물 제공 단가", unit: "만원", step: 0.5, min: 0, max: 100 },
      { key: "seedGmvPer", label: "시딩 1건 평균 발생 GMV", sub: "콘텐츠당 기대 매출", unit: "만원", step: 0.5, min: 0, max: 500 },
    ],
  },
  {
    title: "③ 유가 캠페인",
    note: "제품 + 광고비 지급 · 매출 기대",
    fields: [
      { key: "paidCount", label: "유가 캠페인 수 (국가·월)", sub: "집행 건수", unit: "건", step: 1, min: 0, max: 200 },
      { key: "paidUnit", label: "유가 건당 비용", sub: "인플루언서 지급액", unit: "만원", step: 10, min: 0, max: 50000 },
      { key: "paidGmvPer", label: "유가 건당 예상 GMV", sub: "캠페인당 기대 매출", unit: "만원", step: 10, min: 0, max: 100000 },
    ],
  },
  {
    title: "④ 부스팅 애즈 (예버비)",
    note: "ROAS 기준 광고 증액",
    pink: true,
    fields: [
      { key: "boostBudget", label: "부스팅 예산 (국가·월)", sub: "샵 에즈 광고비", unit: "만원", step: 50, min: 0, max: 100000 },
      { key: "boostRoas", label: "예상 ROAS", sub: "광고비 대비 매출 배수", unit: "배", step: 0.1, min: 0, max: 20 },
    ],
  },
  {
    title: "⑤ 수익 · 시즌 가정",
    note: "마진·커미션·성수기 증액",
    fields: [
      { key: "commRate", label: "어필리에이트 커미션율", sub: "무가·유가 GMV 기준 지급", unit: "%", step: 1, min: 0, max: 60 },
      { key: "marginRate", label: "상품 마진율", sub: "GMV 대비 매출총이익", unit: "%", step: 1, min: 0, max: 95 },
      { key: "peakMult", label: "성수기 증액 배수", sub: "블프·연말 부스팅 증액", unit: "배", step: 0.1, min: 1, max: 5 },
      { key: "peakMonths", label: "성수기 개월수", sub: "11~12월 등", unit: "개월", step: 1, min: 0, max: 6 },
      { key: "growthRate", label: "연 성장률 (티어 상승)", sub: "3년 프로젝션 복리", unit: "%", step: 5, min: 0, max: 200 },
    ],
  },
];

const DEFAULTS: Record<Key, number> = {
  countries: 1, months: 12, opCost: 400,
  seedQty: 120, seedUnit: 1.5, seedGmvPer: 5,
  paidCount: 3, paidUnit: 200, paidGmvPer: 800,
  boostBudget: 500, boostRoas: 4,
  commRate: 12, marginRate: 55,
  peakMult: 2.5, peakMonths: 3, growthRate: 50,
};

export default function Calculator() {
  const [v, setV] = useState<Record<Key, number>>(DEFAULTS);
  const set = (k: Key, val: number) => setV((p) => ({ ...p, [k]: isNaN(val) ? 0 : val }));

  const r = useMemo(() => {
    const N = Math.max(1, v.countries);
    const M = Math.max(1, v.months);

    // ── 국가·월 단위 (만원) ──
    const seedCost = v.seedQty * v.seedUnit;
    const paidCost = v.paidCount * v.paidUnit;
    const mCost = v.opCost + seedCost + paidCost + v.boostBudget;

    const seedGmv = v.seedQty * v.seedGmvPer;
    const paidGmv = v.paidCount * v.paidGmvPer;
    const boostGmv = v.boostBudget * v.boostRoas;
    const mGmv = seedGmv + paidGmv + boostGmv;
    const mAffiliateGmv = seedGmv + paidGmv; // 부스팅(광고)은 커미션 대상 아님

    // ── 성수기 증액 (부스팅 한정) ──
    const peakBoostCost = v.boostBudget * (v.peakMult - 1) * v.peakMonths * N;
    const peakBoostGmv = v.boostBudget * v.boostRoas * (v.peakMult - 1) * v.peakMonths * N;

    // ── 연간(전체 국가) ──
    const opCostYr = v.opCost * M * N;
    const seedCostYr = seedCost * M * N;
    const paidCostYr = paidCost * M * N;
    const boostCostYr = v.boostBudget * M * N + peakBoostCost;

    const seedGmvYr = seedGmv * M * N;
    const paidGmvYr = paidGmv * M * N;
    const boostGmvYr = boostGmv * M * N + peakBoostGmv;

    const affiliateGmvYr = mAffiliateGmv * M * N;
    const commissionYr = affiliateGmvYr * (v.commRate / 100);

    const gmvYr = seedGmvYr + paidGmvYr + boostGmvYr;
    const spendYr = opCostYr + seedCostYr + paidCostYr + boostCostYr + commissionYr;
    const grossProfitYr = gmvYr * (v.marginRate / 100);
    const netProfitYr = grossProfitYr - opCostYr - seedCostYr - paidCostYr - boostCostYr - commissionYr;

    const blendedRoas = spendYr > 0 ? gmvYr / spendYr : 0;
    const netMargin = gmvYr > 0 ? (netProfitYr / gmvYr) * 100 : 0;

    // ── 3년 복리 프로젝션 (티어 상승 → 성장) ──
    const g = v.growthRate / 100;
    const factor = 1 + (1 + g) + (1 + g) * (1 + g); // 1년차 + 2년차 + 3년차
    const gmv3 = gmvYr * factor;
    const net3 = netProfitYr * factor;
    const yearly = [0, 1, 2].map((y) => {
      const mult = Math.pow(1 + g, y);
      return { year: y + 1, gmv: gmvYr * mult, net: netProfitYr * mult };
    });

    return {
      N, M,
      mCostAll: mCost * N,
      mGmvAll: mGmv * N,
      costRows: [
        { label: "운영비", val: opCostYr, c: "slate" },
        { label: "무가 시딩 원가", val: seedCostYr, c: "slate" },
        { label: "유가 캠페인", val: paidCostYr, c: "slate" },
        { label: "부스팅 애즈", val: boostCostYr, c: "pink" },
        { label: "어필리에이트 커미션", val: commissionYr, c: "slate" },
      ],
      gmvRows: [
        { label: "무가 GMV", val: seedGmvYr },
        { label: "유가 GMV", val: paidGmvYr },
        { label: "부스팅 GMV", val: boostGmvYr },
      ],
      spendYr, gmvYr, grossProfitYr, netProfitYr, commissionYr, blendedRoas, netMargin,
      peakBoostCost, peakBoostGmv,
      gmv3, net3, yearly,
    };
  }, [v]);

  const profitPos = r.netProfitYr >= 0;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-10 sm:py-16">
        {/* 헤더 */}
        <div className="text-[11px] font-extrabold uppercase tracking-[3px] text-[var(--accent)]">Simulation · Budget & Performance</div>
        <h1 className="mt-3 text-[32px] font-black leading-tight tracking-tight sm:text-[42px]">예산 · 성과 시뮬레이터</h1>
        <p className="mt-3 max-w-[820px] text-[14px] leading-relaxed text-[var(--muted)] sm:text-[15px]">
          틱톡샵 온보딩·마케팅 구조(무가 시딩 → 콘텐츠 → 부스팅 → GMV)를 기준으로, 주요 변수를 입력하면 예상 예산과 성과를 실시간 계산합니다.
          모든 금액 입력 단위는 <b>만원</b>이며, 결과는 <b>연간(전체 국가) 합산</b> 기준입니다.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1fr]">
          {/* ── 입력 ── */}
          <div className="space-y-5">
            {GROUPS.map((g) => (
              <div
                key={g.title}
                className={`rounded-2xl border p-5 ${g.pink ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)] bg-slate-50/60"}`}
              >
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <div className={`text-[15px] font-extrabold ${g.pink ? "text-[var(--accent)]" : ""}`}>{g.title}</div>
                  <div className="text-[12px] text-[var(--muted)]">{g.note}</div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {g.fields.map((f) => (
                    <label key={f.key} className="block">
                      <div className="text-[12.5px] font-semibold">{f.label}</div>
                      <div className="mb-1 text-[11px] text-[var(--muted)]">{f.sub}</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={v[f.key]}
                          step={f.step}
                          min={f.min}
                          max={f.max}
                          onChange={(e) => set(f.key, parseFloat(e.target.value))}
                          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[14px] font-semibold outline-none focus:border-[var(--accent)]"
                        />
                        <span className="shrink-0 text-[12px] text-[var(--muted)]">{f.unit}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => setV(DEFAULTS)}
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]"
            >
              기본값으로 초기화
            </button>
          </div>

          {/* ── 결과 ── */}
          <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="연 총 예산" value={fmtManwon(r.spendYr)} sub={`월 ${fmtManwon(r.mCostAll)} · ${r.N}개국`} />
              <Kpi label="연 예상 GMV" value={fmtManwon(r.gmvYr)} sub={`월 ${fmtManwon(r.mGmvAll)}`} pink />
              <Kpi
                label="예상 순이익"
                value={fmtManwon(r.netProfitYr)}
                sub={`순이익률 ${r.netMargin.toFixed(1)}%`}
                tone={profitPos ? "good" : "bad"}
              />
              <Kpi label="종합 ROAS" value={`${r.blendedRoas.toFixed(2)}배`} sub={`GMV ÷ 총지출`} />
            </div>

            {/* 핵심 요약 한 줄 */}
            <div className={`rounded-2xl border px-5 py-4 text-[13.5px] leading-relaxed ${profitPos ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              총 <b>{fmtManwon(r.spendYr)}</b> 투자 → 매출 <b className="text-[var(--accent)]">{fmtManwon(r.gmvYr)}</b> ·
              순이익 <b className={profitPos ? "text-emerald-600" : "text-rose-600"}>{fmtManwon(r.netProfitYr)}</b>
              {profitPos ? <> — 투자 1원당 <b>{r.blendedRoas.toFixed(1)}원</b> 매출을 회수합니다.</> : <> — 현재 가정에선 적자입니다. 마진·ROAS를 조정해 보세요.</>}
            </div>

            {/* 3년 복리 프로젝션 */}
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <div className="mb-1 flex items-baseline justify-between">
                <div className="text-[14px] font-extrabold">3년 성장 프로젝션</div>
                <div className="text-[12px] text-slate-400">티어 상승 연 {v.growthRate}% 복리</div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {r.yearly.map((y) => (
                  <div key={y.year} className="rounded-xl bg-white/5 p-3 text-center">
                    <div className="text-[11px] text-slate-400">{y.year}년차</div>
                    <div className="mt-1 text-[16px] font-black text-[var(--accent)]">{fmtManwon(y.gmv)}</div>
                    <div className="mt-0.5 text-[11px] text-slate-300">순익 {fmtManwon(y.net)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-3">
                <span className="text-[13px] text-slate-300">3년 누적 GMV</span>
                <span className="text-[20px] font-black text-[var(--accent)]">{fmtManwon(r.gmv3)}</span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-[13px] text-slate-300">3년 누적 순이익</span>
                <span className="text-[16px] font-black text-emerald-400">{fmtManwon(r.net3)}</span>
              </div>
            </div>

            {/* 지출 구성 */}
            <Panel title="연간 지출 구성" total={r.spendYr}>
              {r.costRows.map((row) => (
                <BarRow key={row.label} label={row.label} val={row.val} total={r.spendYr} pink={row.c === "pink"} />
              ))}
            </Panel>

            {/* GMV 구성 */}
            <Panel title="연간 GMV 구성" total={r.gmvYr} accent>
              {r.gmvRows.map((row) => (
                <BarRow key={row.label} label={row.label} val={row.val} total={r.gmvYr} pink />
              ))}
            </Panel>

            {/* 손익 요약 */}
            <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
              <div className="mb-3 text-[14px] font-extrabold">손익 요약 (연간)</div>
              <Line label="예상 GMV" val={r.gmvYr} bold />
              <Line label={`매출총이익 (마진 ${v.marginRate}%)`} val={r.grossProfitYr} />
              <Line label="− 총 운영·광고 지출" val={-(r.spendYr - r.commissionYr)} />
              <Line label="− 어필리에이트 커미션" val={-r.commissionYr} />
              <div className="my-2 border-t border-dashed border-[var(--border)]" />
              <Line label="= 예상 순이익" val={r.netProfitYr} bold tone={profitPos ? "good" : "bad"} />
            </div>

            {/* 성수기 효과 */}
            {v.peakMonths > 0 && v.peakMult > 1 && (
              <div className="rounded-2xl bg-gradient-to-r from-[var(--accent)] to-orange-400 px-5 py-4 text-white">
                <div className="text-[12px] font-bold opacity-90">성수기 증액 반영분 ({v.peakMonths}개월 · {v.peakMult}배)</div>
                <div className="mt-1 text-[14px]">
                  부스팅 <b>+{fmtManwon(r.peakBoostCost)}</b> 추가 집행 → GMV <b>+{fmtManwon(r.peakBoostGmv)}</b> 기대
                </div>
              </div>
            )}

            <p className="text-[11.5px] leading-relaxed text-[var(--muted)]">
              * 추정 모델입니다. 실제 성과는 샵 티어·품목·시즌·크리에이터 콘텐츠 품질에 따라 변동합니다.
              부스팅 GMV는 <b>예상 ROAS</b>에 선형 비례하며, 어필리에이트 커미션은 무가·유가 GMV에만 적용됩니다.
              성수기 증액은 부스팅에만 반영됩니다. 참고: <a href="/tiktokmarketing" className="text-sky-600 underline">온보딩·마케팅 가이드</a> ·
              <a href="/tiktoksit" className="ml-1 text-sky-600 underline">예산 플래닝</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 소형 컴포넌트 ─────────────────────────────────────────── */
function Kpi({ label, value, sub, pink, tone }: { label: string; value: string; sub?: string; pink?: boolean; tone?: "good" | "bad" }) {
  const valColor = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : pink ? "text-[var(--accent)]" : "";
  return (
    <div className={`rounded-2xl border p-4 ${pink ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)] bg-white"}`}>
      <div className="text-[12px] text-[var(--muted)]">{label}</div>
      <div className={`mt-1 text-[24px] font-black leading-none sm:text-[26px] ${valColor}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11.5px] text-[var(--muted)]">{sub}</div>}
    </div>
  );
}

function Panel({ title, total, accent, children }: { title: string; total: number; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-[14px] font-extrabold">{title}</div>
        <div className={`text-[15px] font-black ${accent ? "text-[var(--accent)]" : ""}`}>{fmtManwon(total)}</div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function BarRow({ label, val, total, pink }: { label: string; val: number; total: number; pink?: boolean }) {
  const pct = total > 0 ? Math.max(0, (val / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[12.5px]">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold">{fmtManwon(val)} <span className="text-[var(--muted)]">· {pct.toFixed(0)}%</span></span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${pink ? "bg-[var(--accent)]" : "bg-sky-400"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Line({ label, val, bold, tone }: { label: string; val: number; bold?: boolean; tone?: "good" | "bad" }) {
  const c = tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : "";
  return (
    <div className={`flex items-baseline justify-between py-1 text-[13.5px] ${bold ? "font-extrabold" : ""}`}>
      <span className={bold ? "" : "text-slate-600"}>{label}</span>
      <span className={c}>{fmtManwon(val)}</span>
    </div>
  );
}

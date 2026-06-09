"use client";

import Link from "next/link";
import { Check, Sparkles, Plug, BadgePercent } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { TOTAL_BRANDS } from "@/data/ktrend/brands";

const PLANS = [
  {
    key: "basic",
    name: "Basic",
    price: "무료",
    period: "",
    desc: "K-뷰티 틱톡 트렌드를 가볍게 둘러보기",
    cta: "무료로 시작",
    highlight: false,
    features: ["1개 브랜드 콘텐츠 조회", "기본 성과 지표 조회", "주간 바이럴 요약", "6개국 트렌드 미리보기"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$159",
    period: "/ 월",
    desc: "마케터를 위한 콘텐츠 탐색 풀 액세스",
    cta: "Pro 시작하기",
    highlight: true,
    features: [
      `${TOTAL_BRANDS}개 브랜드 콘텐츠 무제한 조회`,
      "실시간 어필리에이트 수수료율 연동",
      "인플루언서 DB 단가·진정성 지수",
      "실시간 바이럴 감지 알림 (월·목)",
      "모바일 뷰어 제공",
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "$399~",
    period: "/ 월",
    desc: "브랜드사 전사 분석 및 API 연동",
    cta: "도입 문의",
    highlight: false,
    features: [
      "Pro의 모든 기능 포함",
      "커스텀 브랜드 추가 추적",
      "경쟁사 대비 자사 성과 원클릭 리포트",
      "전용 API 제공",
      "전담 CSM 지원",
    ],
  },
];

const ADDONS = [
  { name: "크리에이터 다이렉트 컨택 라인 잠금 해제", price: "$19", unit: "/ 명" },
  { name: "AI 훅(Hook) 분석 리포트 다운로드", price: "$49", unit: "/ 건" },
  { name: "개별 전략 리포트 (PDF)", price: "$79", unit: "/ 건" },
];

export default function PlansPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">요금제</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-500">
            콘텐츠 탐색부터 실매출 데이터 연동까지. 브랜드의 성장 단계에 맞춰 선택하세요.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-3xl border p-7 ${
                p.highlight ? "border-rose-300 bg-white shadow-lg ring-1 ring-rose-200" : "border-slate-200 bg-white"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-600 px-3 py-1 text-xs font-semibold text-white">
                  <Sparkles className="h-3.5 w-3.5" /> 가장 인기
                </span>
              )}
              <h2 className="text-lg font-bold text-slate-900">{p.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{p.desc}</p>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-bold tracking-tight text-slate-900">{p.price}</span>
                <span className="mb-1 text-sm text-slate-400">{p.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.highlight ? "text-rose-500" : "text-emerald-500"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.key === "enterprise" ? "mailto:hello@ktrend.io" : "/"}
                className={`mt-7 rounded-xl py-3 text-center text-sm font-semibold transition ${
                  p.highlight
                    ? "bg-slate-900 text-white hover:bg-slate-700"
                    : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* 틱톡 샵 연동 할인 배너 */}
        <div className="mt-8 flex flex-col items-center gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 sm:flex-row">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
            <Plug className="h-6 w-6" />
          </span>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="flex items-center justify-center gap-2 text-base font-bold text-emerald-800 sm:justify-start">
              <BadgePercent className="h-4 w-4" /> 틱톡 샵 판매자 계정 연동 시 Pro 20% 할인
            </h3>
            <p className="mt-1 text-sm text-emerald-700">
              Seller Center를 OAuth2로 연동하면 실매출 피드백 루프로 추정 정확도가 높아지고, 즉시 할인 혜택이 적용됩니다.
            </p>
          </div>
          <button className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
            틱톡 샵 연동하기
          </button>
        </div>

        {/* Add-on */}
        <div className="mt-12">
          <h3 className="text-lg font-bold text-slate-900">Add-on 결제</h3>
          <p className="mt-1 text-sm text-slate-500">필요한 기능만 건별로 추가하세요.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {ADDONS.map((a) => (
              <div key={a.name} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-600">{a.name}</p>
                <p className="mt-3">
                  <span className="text-2xl font-bold text-slate-900">{a.price}</span>
                  <span className="text-sm text-slate-400"> {a.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

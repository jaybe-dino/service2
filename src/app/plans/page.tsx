"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Star } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { ADDONS, PLANS } from "@/data/ktrend/meta";

const ANNUAL_OFF = 0.2; // 연간 결제 20% 할인 (2개월+ 무료)

function priceParts(price: string, annual: boolean): { main: string; sub: string | null } {
  const m = price.match(/\$([\d,]+)/);
  if (!m) return { main: price, sub: null };
  const monthly = Number(m[1].replace(/,/g, ""));
  if (monthly === 0) return { main: price, sub: null };
  if (!annual) return { main: price, sub: null };
  const tilde = price.includes("~") ? "~" : "";
  const discounted = Math.round(monthly * (1 - ANNUAL_OFF));
  const yearly = discounted * 12;
  return { main: `$${discounted}${tilde}`, sub: `연 $${yearly.toLocaleString()}${tilde} 청구 · 20% 절약` };
}

const COMPARE = [
  { feature: "콘텐츠 성과 지표", basic: "전체 공개", pro: "전체 공개", ent: "전체 공개 + 실매출" },
  { feature: "열람권 (링크 열람·이름 공개)", basic: "하루 5건", pro: "무제한", ent: "무제한" },
  { feature: "인플루언서 컨택 라인", basic: "잠금", pro: "해금", ent: "해금 + 단가" },
  { feature: "신규 브랜드 자가 학습", basic: "미지원", pro: "월 3회 (12h)", ent: "무제한 (12h)" },
  { feature: "바이럴 알림 · 리포트", basic: "미지원", pro: "주 2회 · 제공", ent: "실시간 · 무제한 PDF" },
  { feature: "틱톡 샵 API(OAuth2)", basic: "—", pro: "—", ent: "실시간 연동" },
];

export default function PlansPage() {
  const { plan } = usePlan();
  const [annual, setAnnual] = useState(true);

  return (
    <PageShell>
      <div className="mb-6 text-center">
        <h1 className="text-[24px] font-black tracking-tight">요금제</h1>
        <p className="mt-2 text-[13px] text-[var(--muted)]">
          비즈니스 성장 단계에 맞춰 결합 가능한 SaaS 구독 + Add-on 모델.
        </p>
        {/* 월간/연간 토글 */}
        <div className="mt-4 inline-flex items-center gap-1 rounded-full border border-[var(--border)] p-1 text-[11px] font-semibold">
          <button
            onClick={() => setAnnual(false)}
            className={`rounded-full px-3 py-1 ${!annual ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}
          >
            월간
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-1 rounded-full px-3 py-1 ${annual ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}
          >
            연간 <span className={`rounded-full px-1.5 py-0.5 text-[8px] ${annual ? "bg-white/25" : "bg-emerald-100 text-emerald-700"}`}>20% OFF</span>
          </button>
        </div>
      </div>

      {/* 플랜 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const current = plan === p.id;
          return (
            <div
              key={p.id}
              className={`kt-card relative flex flex-col p-6 ${
                p.popular ? "ring-2 ring-[var(--accent)] md:-translate-y-2" : ""
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-bold text-white">
                  <Star size={11} fill="currentColor" /> Most Popular
                </span>
              )}
              <h2 className="text-[18px] font-black">{p.name}</h2>
              <p className="mt-1 text-[11px] text-[var(--muted)]">{p.tagline}</p>
              {(() => {
                const pp = priceParts(p.price, annual);
                return (
                  <>
                    <div className="mt-4 flex items-end gap-1">
                      <span className="text-[32px] font-black">{pp.main}</span>
                      <span className="mb-1.5 text-[12px] text-[var(--muted)]">{p.priceNote}</span>
                    </div>
                    <div className="h-4 text-[10px] font-semibold text-emerald-600">{pp.sub ?? ""}</div>
                  </>
                );
              })()}
              <ul className="mt-5 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[11px]">
                    <Check size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {current ? (
                <button
                  disabled
                  className="kt-btn mt-6 w-full cursor-default py-2.5 text-[12px] kt-btn-outline border-[var(--accent)] text-[var(--accent)]"
                >
                  ✓ 현재 플랜
                </button>
              ) : (
                <Link
                  href={p.id === "pro" ? "/checkout" : p.id === "basic" ? "/signup" : "/login"}
                  className={`kt-btn mt-6 w-full py-2.5 text-[12px] ${
                    p.popular ? "kt-btn-primary" : "kt-btn-outline"
                  }`}
                >
                  {p.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* 기능 비교 테이블 */}
      <h2 className="mb-3 mt-10 text-[16px] font-bold">기능 상세 비교</h2>
      <div className="kt-card overflow-x-auto">
        <table className="w-full min-w-[680px] text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="p-3 text-[var(--muted)]">기능</th>
              <th className="p-3">Basic</th>
              <th className="p-3 text-[var(--accent)]">Pro</th>
              <th className="p-3">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((r) => (
              <tr key={r.feature} className="border-b border-[var(--border)] last:border-0">
                <td className="p-3 font-semibold">{r.feature}</td>
                <td className="p-3 text-[var(--muted)]">{r.basic}</td>
                <td className="p-3 font-semibold text-[var(--accent)]">{r.pro}</td>
                <td className="p-3">{r.ent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add-on */}
      <h2 className="mb-3 mt-10 text-[16px] font-bold">Add-on 부분 유료화</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {ADDONS.map((a) => (
          <div key={a.id} className="kt-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold">{a.name}</h3>
              <span className="kt-badge-brand">{a.price}</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">{a.desc}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 rounded-lg bg-[var(--accent-light)] px-4 py-3 text-center text-[11px] text-[var(--muted)]">
        틱톡 샵 공식 판매자 계정(OAuth2)을 연동하면 <b className="text-[var(--accent)]">Pro 20% 할인</b> 혜택과 함께
        실매출 피드백 루프로 분석 정밀도가 지속 향상됩니다.
      </p>
    </PageShell>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Star, ShoppingBag, ArrowRight } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { PLANS, ONBOARDING } from "@/data/ktrend/meta";

const ANNUAL_OFF = 0.2; // 연간 결제 20% 할인 (2개월+ 무료)

function priceParts(price: string, annual: boolean): { main: string; sub: string | null } {
  const m = price.match(/([$₩])([\d,]+)/);
  if (!m) return { main: price, sub: null };
  const cur = m[1];
  const monthly = Number(m[2].replace(/,/g, ""));
  if (monthly === 0) return { main: price, sub: null };
  if (!annual) return { main: price, sub: null };
  const tilde = price.includes("~") ? "~" : "";
  const discounted = Math.round(monthly * (1 - ANNUAL_OFF));
  const yearly = discounted * 12;
  return { main: `${cur}${discounted.toLocaleString()}${tilde}`, sub: `연 ${cur}${yearly.toLocaleString()}${tilde} 청구 · 20% 절약` };
}

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

      {/* 틱톡샵 온보딩은 별도 트랙 안내 배너 */}
      {ONBOARDING.enabled && (
        <div className="mx-auto mt-10 max-w-[1100px] px-4">
          <div className="flex flex-col items-start gap-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#1A56DB] px-6 py-6 text-white shadow-lg sm:flex-row sm:items-center">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15">
              <ShoppingBag size={22} className="text-white" />
            </span>
            <div className="flex-1">
              <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wide">별도 트랙 안내</span>
              <h3 className="mt-2 text-[17px] font-black leading-snug">틱톡샵 입점(온보딩)은 별도 트랙입니다</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-white/90">
                위 요금제는 <b className="font-bold text-white">콘텐츠·인플루언서·브랜드 분석 서비스</b> 구독입니다.<br className="hidden sm:block" />
                글로벌 틱톡샵 멀티몰 입점·운영(Start / Live Focus / Onboarding)은<br className="hidden sm:block" />
                <b className="font-bold text-white">자가체크 → 트랙 선택 → 결제</b>까지 별도 신청 페이지에서 진행됩니다.
              </p>
            </div>
            <Link href={ONBOARDING.path} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-[12px] font-black text-[#1A56DB] shadow-sm transition-colors hover:bg-white/90">
              틱톡샵 입점 신청 <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

    </PageShell>
  );
}

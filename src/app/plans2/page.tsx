"use client";

// 결제 2 페이지 — 나이스페이 심사용(서비스 제공기간 3개월 이하만). 연간 상품 제거, 월간만.
// 결제 1(/plans, 연간 포함)은 현행 유지. 심사 시 이 페이지/플로우로 전환.
import Link from "next/link";
import { Check, Star, ShoppingBag, ArrowRight } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { PLANS, ONBOARDING } from "@/data/ktrend/meta";

export default function Plans2Page() {
  const { plan } = usePlan();

  return (
    <PageShell>
      <div className="mb-6 text-center">
        <h1 className="text-[24px] font-black tracking-tight">Glovek 플랫폼 구독</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
          콘텐츠·인플루언서·브랜드 분석 SaaS <b>월간 구독</b>입니다. (월 단위 결제 · 언제든 해지)
        </p>
      </div>

      {/* 플랜 카드 — 월간만 */}
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const current = plan === p.id;
          return (
            <div key={p.id} className={`kt-card relative flex flex-col p-6 ${p.popular ? "ring-2 ring-[var(--accent)] md:-translate-y-2" : ""}`}>
              {p.popular && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1 text-[10px] font-bold text-white">
                  <Star size={11} fill="currentColor" /> Most Popular
                </span>
              )}
              <h2 className="text-[18px] font-black">{p.name}</h2>
              <p className="mt-1 text-[11px] text-[var(--muted)]">{p.tagline}</p>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-[32px] font-black">{p.price}</span>
                <span className="mb-1.5 text-[12px] text-[var(--muted)]">{p.priceNote}</span>
              </div>
              <div className="h-4 text-[10px] font-semibold text-[var(--muted)]">{p.price.includes("0") && p.id !== "basic" ? "월 단위 자동결제" : ""}</div>
              <ul className="mt-5 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[11px]">
                    <Check size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {current ? (
                <button disabled className="kt-btn mt-6 w-full cursor-default py-2.5 text-[12px] kt-btn-outline border-[var(--accent)] text-[var(--accent)]">✓ 현재 플랜</button>
              ) : (
                <Link href={p.id === "pro" ? "/checkout" : p.id === "basic" ? "/signup" : "/login"}
                  className={`kt-btn mt-6 w-full py-2.5 text-[12px] ${p.popular ? "kt-btn-primary" : "kt-btn-outline"}`}>
                  {p.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-6 max-w-[720px] text-center text-[11px] leading-relaxed text-[var(--muted)]">
        모든 구독은 <b className="text-[var(--fg)]">월 단위(30일)</b>로 제공·결제되며, 마이페이지 또는 고객센터를 통해 언제든 해지할 수 있습니다.
        서비스 제공기간이 3개월을 초과하는 연간·장기 상품은 판매하지 않습니다.<br />
        결제 취소·해지·환불 기준은 <Link href="/refund" className="font-bold text-[var(--accent)] underline underline-offset-2">취소·환불 정책</Link>을 따릅니다. (7일 이내 미사용 전액 환불 · 중도해지 일할 환불)
      </p>

      {ONBOARDING.enabled && (
        <div className="mx-auto mt-10 max-w-[1100px] px-4">
          <div className="flex flex-col items-start gap-5 rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#1A56DB] px-6 py-6 text-white shadow-lg sm:flex-row sm:items-center">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15"><ShoppingBag size={22} className="text-white" /></span>
            <div className="flex-1">
              <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wide">별도 트랙 안내</span>
              <h3 className="mt-2 text-[17px] font-black leading-snug">틱톡샵 입점(온보딩)은 별도 트랙입니다</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-white/90">위 요금제는 <b className="font-bold text-white">콘텐츠·인플루언서·브랜드 분석 서비스</b> 월간 구독입니다.<br className="hidden sm:block" />틱톡샵 멀티몰 입점·운영은 <b className="font-bold text-white">자가체크 → 트랙 선택 → 월간 결제</b>로 별도 진행됩니다.</p>
            </div>
            <Link href={ONBOARDING.path} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-[12px] font-black text-[#1A56DB] shadow-sm transition-colors hover:bg-white/90">틱톡샵 입점 신청 <ArrowRight size={14} /></Link>
          </div>
        </div>
      )}
    </PageShell>
  );
}

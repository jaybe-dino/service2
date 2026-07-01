"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Star, ShoppingBag, ArrowRight } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { PLANS, ONBOARDING, MALL_TRACKS } from "@/data/ktrend/meta";
import { GRADE_GUIDE } from "@/lib/onboarding";

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
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
          <b className="text-[var(--fg)]">틱톡샵 멀티몰 입점</b>과 <b className="text-[var(--fg)]">Glovek 플랫폼 구독</b>은 서로 다른 상품입니다.<br className="hidden sm:block" />
          아래에서 각각 확인하세요.
        </p>
      </div>

      {/* 틱톡샵 멀티몰 입점 트랙 단가표 + 등급 추천 */}
      {ONBOARDING.enabled && (
        <div className="mb-8 overflow-hidden rounded-2xl border border-[var(--border)]">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-[#7C3AED] to-[#1A56DB] px-5 py-4 text-white">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold"><ShoppingBag size={11} /> 틱톡샵 멀티몰 입점</span>
              <h2 className="mt-1 text-[16px] font-black">트랙별 단가 &amp; 추천 등급</h2>
            </div>
            <Link href={ONBOARDING.path} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[11px] font-black text-[#1A56DB] hover:bg-white/90">
              자가체크하고 추천받기 <ArrowRight size={13} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[12px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50 text-left text-[10px] uppercase text-[var(--muted)]">
                  <th className="p-3">트랙</th><th className="p-3">월 구독료</th><th className="p-3">판매 수수료</th><th className="p-3">추천 등급</th><th className="p-3">적합 브랜드</th>
                </tr>
              </thead>
              <tbody>
                {MALL_TRACKS.map((t) => {
                  const grades = GRADE_GUIDE.filter((g) => g.recommended === t.id);
                  return (
                    <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-3 font-bold">{t.name}{t.highlight && <span className="ml-1 rounded-full bg-pink-50 px-1.5 py-0.5 text-[9px] font-bold text-pink-600">추천</span>}</td>
                      <td className="p-3 font-black text-pink-500">{t.priceLabel}{!t.inquiry && <span className="text-[10px] font-normal text-[var(--muted)]">/월</span>}</td>
                      <td className="p-3">{t.commissionLabel.replace("판매 수수료 ", "")}</td>
                      <td className="p-3">
                        <span className="inline-flex gap-1">
                          {grades.map((g) => (
                            <span key={g.grade} className="grid h-5 w-5 place-items-center rounded text-[10px] font-black text-white" style={{ background: g.color }}>{g.grade}</span>
                          ))}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-[var(--muted)]">{t.tagline}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--border)] px-5 py-3 text-[11px] leading-relaxed text-[var(--muted)]">
            등급은 자가체크(해외 판매 경험 5개 지표)로 산정됩니다 · <b className="text-[var(--fg)]">C</b> 입문 → Start · <b className="text-[var(--fg)]">B</b> 진출 계획 → Live Focus · <b className="text-[var(--fg)]">A·S</b> 성장·스케일업 → Onboarding
            <div className="mt-1.5 font-semibold text-[var(--fg)]">※ 입점 트랙은 월 단위 요금이며, 아래 플랫폼 구독의 월간/연간 할인은 적용되지 않습니다.</div>
          </div>
        </div>
      )}

      {/* Glovek 플랫폼 구독 (SaaS) 섹션 헤더 + 월간/연간 토글 */}
      <div className="mb-4 flex flex-col items-center gap-3 border-t border-[var(--border)] pt-8 text-center">
        <div>
          <h2 className="text-[18px] font-black">Glovek 플랫폼 구독</h2>
          <p className="mt-1 text-[12px] text-[var(--muted)]">콘텐츠·인플루언서·브랜드 분석 SaaS (틱톡샵 입점과 별개)</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] p-1 text-[11px] font-semibold">
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

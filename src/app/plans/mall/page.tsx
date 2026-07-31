import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { MALL_TRACKS, MALL_TRACK_MAP, ONBOARDING } from "@/data/ktrend/meta";
import { GRADE_GUIDE } from "@/lib/onboarding";
import { PAY_REVIEW } from "@/data/ktrend/pay-review";

export const metadata: Metadata = {
  title: "틱톡샵 멀티몰 입점 요금 — Glovek",
  description: "Glovek 틱톡샵 멀티몰 입점 트랙(Live Focus / Onboarding)별 월 구독료·판매 수수료와 등급별 추천.",
  alternates: { canonical: "/plans/mall" },
};

export default function MallPlansPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--accent)]"><ShoppingBag size={12} /> TikTok Shop 입점</span>
          <h1 className="mt-3 text-[24px] font-black tracking-tight">틱톡샵 멀티몰 입점 요금</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            자가체크로 예비 등급을 진단하고, 등급에 맞는 트랙을 선택해 입점하세요.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-[#7C3AED] to-[#1A56DB] px-5 py-4 text-white">
            <h2 className="text-[16px] font-black">트랙별 단가 &amp; 추천 등급</h2>
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
                {MALL_TRACKS.filter((t) => !(PAY_REVIEW && MALL_TRACK_MAP[t.id]?.fixedPrice)).map((t) => {
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
            등급은 자가체크(해외 판매 경험 5개 지표)로 산정됩니다 · <b className="text-[var(--fg)]">C·B</b> 입문·진출 계획 → Live Focus · <b className="text-[var(--fg)]">A·S</b> 성장·스케일업 → Onboarding
            <div className="mt-1.5 font-semibold text-[var(--fg)]">※ 입점 트랙은 월 단위 요금이며, 플랫폼 구독의 월간/연간 할인은 적용되지 않습니다.</div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <Link href="/plans" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">
            <ArrowLeft size={14} /> Glovek 플랫폼 구독 요금 보기
          </Link>
          <Link href={ONBOARDING.path} className="kt-btn kt-btn-primary px-5 py-2.5 text-[12px]">
            틱톡샵 입점 신청 시작 <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

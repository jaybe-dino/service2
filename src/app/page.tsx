import Link from "next/link";
import { ArrowRight, BarChart3, Bell, Contact, TrendingUp } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { COUNTRIES, SERVICE } from "@/data/ktrend/meta";
import { BRANDS, BRAND_MAP, FEATURED_BRAND_IDS } from "@/data/ktrend/brands";
import { INFLUENCERS } from "@/data/ktrend/influencers";
import { CONTENT } from "@/data/ktrend/content";

const VALUE = [
  { icon: TrendingUp, title: "콘텐츠별 성과 조회", desc: "모든 리스팅을 틱톡 영상(콘텐츠) 단위로 보고 수수료율·추정 ROAS·기여 매출을 즉시 비교." },
  { icon: BarChart3, title: "브랜드 벤치마킹", desc: "110+ K-뷰티 브랜드의 틱톡 마케팅 성과를 자사·경쟁사 한눈에 비교." },
  { icon: Contact, title: "검증된 인플루언서 DB", desc: "실제 매출을 발생시킨 어필리에이트 크리에이터의 성과와 컨택 라인 제공." },
  { icon: Bell, title: "실시간 바이럴 감지", desc: "매주 월·목 정기 AI 트렌드 업데이트와 급상승 영상 푸시 알림." },
];

export default function Home() {
  return (
    <PageShell contained={false}>
      {/* Hero */}
      <section className="border-b border-[var(--border)] bg-gradient-to-b from-[var(--accent-light)]/60 to-white">
        <div className="mx-auto max-w-[1480px] px-4 py-16 text-center">
          <span className="kt-badge-brand mx-auto">{SERVICE.version} · TikTok 중심</span>
          <h1 className="mx-auto mt-4 max-w-3xl text-[34px] font-black leading-tight tracking-tight md:text-[44px]">
            글로벌 틱톡 K-뷰티 콘텐츠를<br />
            <span className="text-[var(--accent)]">브랜드·콘텐츠·인플루언서</span>별로 분석
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
            {SERVICE.tagline}. 미국을 중심으로 태국·베트남·필리핀·말레이시아·싱가포르 6개국
            틱톡 샵의 바이럴 콘텐츠를 정량 데이터로 추적합니다.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <Link href="/explorer" className="kt-btn kt-btn-primary px-6 py-3 text-[13px]">
              콘텐츠 탐색 시작 <ArrowRight size={15} />
            </Link>
            <Link href="/plans" className="kt-btn kt-btn-outline px-6 py-3 text-[13px]">
              요금제 보기
            </Link>
          </div>

          {/* 지표 요약 */}
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4">
            {[
              { n: `${BRANDS.length}+`, l: "추적 브랜드" },
              { n: `${CONTENT.length.toLocaleString()}`, l: "분석 콘텐츠" },
              { n: `${INFLUENCERS.length}+`, l: "검증 인플루언서" },
            ].map((s) => (
              <div key={s.l} className="kt-card p-4">
                <div className="text-[24px] font-black text-[var(--accent)]">{s.n}</div>
                <div className="text-[11px] text-[var(--muted)]">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value */}
      <section className="mx-auto max-w-[1480px] px-4 py-14">
        <h2 className="text-center text-[22px] font-black">마케터의 Pain Point를 해결합니다</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {VALUE.map((v) => (
            <div key={v.title} className="kt-card p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-light)] text-[var(--accent)]">
                <v.icon size={18} />
              </span>
              <h3 className="mt-3 text-[14px] font-bold">{v.title}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 국가 */}
      <section className="bg-[var(--accent-light)]/40 py-14">
        <div className="mx-auto max-w-[1480px] px-4">
          <h2 className="text-center text-[22px] font-black">타겟 6개국 (미국 중심)</h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COUNTRIES.map((c) => (
              <div key={c.code} className={`kt-card p-4 ${c.primary ? "ring-1 ring-[var(--accent)]" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[22px]">{c.flag}</span>
                  <div>
                    <div className="text-[13px] font-bold">
                      {c.nameKo} <span className="text-[var(--muted)]">{c.nameEn}</span>
                    </div>
                    <div className="text-[10px] font-semibold text-[var(--accent)]">
                      틱톡 샵 활성도 · {c.activity}
                    </div>
                  </div>
                  {c.primary && <span className="kt-badge-brand ml-auto">핵심 시장</span>}
                </div>
                <p className="mt-2 text-[11px] text-[var(--muted)]">{c.focus}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured 브랜드 */}
      <section className="mx-auto max-w-[1480px] px-4 py-14">
        <h2 className="text-center text-[22px] font-black">대표 바이럴 브랜드</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURED_BRAND_IDS.map((id) => {
            const b = BRAND_MAP[id];
            if (!b) return null;
            return (
              <div key={id} className="kt-card p-5">
                <div className="flex items-center gap-2">
                  <span className="kt-badge-brand">{b.nameEn}</span>
                  <span className="text-[12px] font-bold">{b.nameKo}</span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--muted)]">{b.pitch}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Link href="/explorer" className="kt-btn kt-btn-primary px-6 py-3 text-[13px]">
            전체 콘텐츠 탐색하기 <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

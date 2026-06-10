"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Bell, Contact, TrendingUp } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import ContentCard from "@/components/ktrend/ContentCard";
import HeroBackground from "@/components/ktrend/HeroBackground";
import { usePlan } from "@/components/ktrend/PlanContext";
import { CATEGORIES, SERVICE } from "@/data/ktrend/meta";
import { BRANDS } from "@/data/ktrend/brands";
import { loadContentStaged, randomSample, fmtCompact, type Content } from "@/data/ktrend/content";

const VALUE = [
  { icon: TrendingUp, title: "콘텐츠별 성과 조회", desc: "모든 리스팅을 틱톡 영상(콘텐츠) 단위로 보고 조회수·참여율·ROAS·기여 매출을 즉시 비교." },
  { icon: BarChart3, title: "브랜드 벤치마킹", desc: "K-뷰티 브랜드의 틱톡 마케팅 성과를 자사·경쟁사 한눈에 비교." },
  { icon: Contact, title: "검증된 인플루언서 DB", desc: "실제 매출을 발생시킨 어필리에이트 크리에이터의 성과와 컨택 라인 제공." },
  { icon: Bell, title: "실시간 바이럴 감지", desc: "매주 월·목 정기 트렌드 업데이트와 급상승 영상 푸시 알림." },
];

export default function Home() {
  const { isAdmin } = usePlan();
  const [random, setRandom] = useState<Content[]>([]);
  const [totalContent, setTotalContent] = useState(0);

  useEffect(() => {
    // 단계적 로드: 정적 데이터로 메인 영상을 먼저 채우고, 수집 DB 병합 후 갱신
    loadContentStaged((all) => {
      setTotalContent(all.length);
      setRandom(randomSample(all, 8));
    });
  }, []);

  const totalViews = BRANDS.reduce((s, b) => s + b.totalViews, 0);
  const featured = BRANDS.slice(0, 6);

  return (
    <PageShell contained={false}>
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-gradient-to-b from-[var(--accent-light)]/60 to-white">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-[1480px] px-4 py-16 text-center">
          <span className="kt-badge-brand mx-auto">실데이터 기반 · TikTok 중심</span>
          <h1 className="mx-auto mt-4 max-w-3xl text-[34px] font-black leading-tight tracking-tight md:text-[44px]">
            글로벌 틱톡 K-뷰티 콘텐츠를<br />
            <span className="text-[var(--accent)]">브랜드·콘텐츠·인플루언서</span>별로 분석
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
            {SERVICE.tagline}. 실제 틱톡 콘텐츠를 브랜드·콘텐츠·인플루언서별로 추적합니다.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <Link href="/explorer" className="kt-btn kt-btn-primary px-6 py-3 text-[13px]">
              콘텐츠 탐색 시작 <ArrowRight size={15} />
            </Link>
            <Link href="/plans" className="kt-btn kt-btn-outline px-6 py-3 text-[13px]">요금제 보기</Link>
          </div>

          {/* 데이터 규모: 관리자 전용 */}
          {isAdmin && (
            <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4">
              {[
                { n: `${BRANDS.length}`, l: "추적 브랜드" },
                { n: fmtCompact(totalContent), l: "분석 콘텐츠" },
                { n: fmtCompact(totalViews), l: "누적 조회수" },
              ].map((s) => (
                <div key={s.l} className="kt-card p-4">
                  <div className="text-[24px] font-black text-[var(--accent)]">{s.n}</div>
                  <div className="text-[11px] text-[var(--muted)]">{s.l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 지금 뜨는 콘텐츠 (랜덤) */}
      <section className="mx-auto max-w-[1480px] px-4 py-12">
        <div className="mb-4">
          <h2 className="text-[20px] font-black">지금 뜨는 콘텐츠</h2>
        </div>
        {random.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {random.map((c) => (
              <ContentCard key={c.id} content={c} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-[12px] text-[var(--muted)]">콘텐츠 로딩 중…</div>
        )}
        <div className="mt-6 text-center">
          <Link href="/explorer" className="kt-btn kt-btn-primary px-6 py-3 text-[13px]">
            전체 콘텐츠 탐색하기 <ArrowRight size={15} />
          </Link>
        </div>
      </section>

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

      {/* 카테고리 */}
      <section className="bg-[var(--accent-light)]/40 py-14">
        <div className="mx-auto max-w-[1480px] px-4">
          <h2 className="text-center text-[22px] font-black">코스메틱 카테고리</h2>
          <div className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
            {CATEGORIES.map((c) => {
              const brands = BRANDS.filter((b) => b.category === c.id);
              const vids = brands.reduce((s, b) => s + b.videos, 0);
              return (
                <div key={c.id} className="kt-card p-5 text-center">
                  <div className="text-[28px]">{c.icon}</div>
                  <div className="mt-1 text-[14px] font-bold">{c.nameKo}</div>
                  {isAdmin && (
                    <div className="mt-1 text-[11px] text-[var(--muted)]">
                      브랜드 {brands.length} · 영상 {fmtCompact(vids)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 대표 브랜드 */}
      <section className="mx-auto max-w-[1480px] px-4 py-14">
        <h2 className="text-center text-[22px] font-black">조회수 상위 브랜드</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((b) => (
            <Link href={`/brand/${b.id}`} key={b.id} className="kt-card block p-5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                  {b.rank}
                </span>
                <span className="text-[14px] font-bold">{b.name}</span>
                <span className="kt-badge-brand ml-auto">Shop {b.shopRatio}%</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <Stat l="누적 조회" v={fmtCompact(b.totalViews)} />
                <Stat l="인플루언서" v={`${b.influencers}`} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return (
    <div className="rounded-md bg-[var(--accent-light)]/60 py-2">
      <div className="text-[13px] font-black text-[var(--accent)]">{v}</div>
      <div className="text-[9px] text-[var(--muted)]">{l}</div>
    </div>
  );
}

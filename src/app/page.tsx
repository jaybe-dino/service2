"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Bell, Contact, TrendingUp, Check, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import ContentCard from "@/components/ktrend/ContentCard";
import HeroBackground from "@/components/ktrend/HeroBackground";
import { usePlan } from "@/components/ktrend/PlanContext";
import { CATEGORIES, ONBOARDING, MALL_TRACKS, MALL_TRACK_MAP } from "@/data/ktrend/meta";
import { GRADE_GUIDE } from "@/lib/onboarding";
import { BRANDS } from "@/data/ktrend/brands";
import { loadContentStaged, randomSample, fmtCompact, type Content } from "@/data/ktrend/content";

const VALUE = [
  { icon: TrendingUp, title: "콘텐츠별 성과 조회", desc: "모든 리스팅을 틱톡 영상(콘텐츠) 단위로 보고 조회수·참여율·ROAS·기여 매출을 즉시 비교." },
  { icon: BarChart3, title: "브랜드 벤치마킹", desc: "K-뷰티 브랜드의 틱톡 마케팅 성과를 자사·경쟁사 한눈에 비교." },
  { icon: Contact, title: "검증된 인플루언서", desc: "실제 매출을 발생시킨 어필리에이트 크리에이터의 성과와 컨택 라인 제공." },
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

  // 메인 전면 가로 슬라이드(캐러셀) — 히어로 + (온보딩) 입점 슬라이드
  const slideCount = ONBOARDING.enabled ? 2 : 1;
  const carRef = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef(0); // 사용자 조작 시 자동넘김 일시정지 (timestamp)
  const [slide, setSlide] = useState(0);
  const goSlide = (i: number) => {
    const el = carRef.current; if (!el) return;
    pausedUntil.current = Date.now() + 12000; // 수동 이동 후 12초 자동넘김 정지
    const idx = Math.max(0, Math.min(slideCount - 1, i));
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  };
  const onCarScroll = () => {
    const el = carRef.current; if (!el) return;
    setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };
  // 자동 넘김 (6초, 사용자 조작·호버 시 일시정지)
  useEffect(() => {
    if (slideCount <= 1) return;
    const id = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      const el = carRef.current; if (!el) return;
      const cur = Math.round(el.scrollLeft / el.clientWidth);
      el.scrollTo({ left: ((cur + 1) % slideCount) * el.clientWidth, behavior: "smooth" });
    }, 6000);
    return () => clearInterval(id);
  }, [slideCount]);

  const totalViews = BRANDS.reduce((s, b) => s + b.totalViews, 0);
  const featured = BRANDS.slice(0, 6);

  return (
    <PageShell contained={false}>
      {/* 메인 전면 가로 슬라이드 (히어로 · 자가체크 · 틱톡샵 입점) */}
      <div className="relative border-b border-[var(--border)]">
        <div ref={carRef} onScroll={onCarScroll}
          onMouseEnter={() => { pausedUntil.current = Date.now() + 3_600_000; }}
          onMouseLeave={() => { pausedUntil.current = Date.now() + 3000; }}
          onTouchStart={() => { pausedUntil.current = Date.now() + 12000; }}
          className="kt-noscrollbar flex h-[calc(100svh-3.5rem)] snap-x snap-mandatory overflow-x-auto overflow-y-hidden">
      <section className="relative flex h-full w-full shrink-0 snap-start flex-col justify-center overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[var(--accent-light)]/60 to-white">
        <HeroBackground />
        <div className="relative z-10 mx-auto max-w-[1480px] px-4 py-16 text-center">
          <span className="kt-badge-brand mx-auto">실데이터 기반 · TikTok 중심</span>
          <h1 className="mx-auto mt-4 max-w-3xl text-[30px] font-black leading-tight tracking-tight md:text-[42px]">
            글로벌에서 지금 <span className="text-[var(--accent)]">1위 브랜드</span>는<br />
            누구와 캠페인을 하는지 찾아보세요
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-relaxed text-[var(--muted)]">
            브랜드별 캠페인 분석 서비스
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

      {/* P2 — 자가체크 + 틱톡샵 입점 트랙 (병합) */}
      {ONBOARDING.enabled && (
        <section className="flex h-full w-full shrink-0 snap-start flex-col justify-center overflow-y-auto bg-white">
          <div className="mx-auto w-full max-w-[1480px] px-4 py-8 text-center">
            <span className="kt-badge-brand mx-auto inline-flex items-center gap-1">
              <ShoppingBag size={12} /> TikTok Shop 입점
            </span>
            <h2 className="mt-3 text-[24px] font-black leading-tight md:text-[32px]">
              브랜드 자가체크하고 맞춤 트랙에 맞춰<br />GloveK와 함께 입점하세요!
            </h2>

            {/* 자가체크 CTA */}
            <Link
              href={ONBOARDING.path}
              className="mx-auto mt-5 block max-w-2xl rounded-2xl bg-gradient-to-r from-[#7C3AED] to-[#1A56DB] p-4 text-white shadow-md transition-opacity hover:opacity-95"
            >
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <div className="flex shrink-0 gap-1.5">
                  {[...GRADE_GUIDE].reverse().map((g) => (
                    <span key={g.grade} className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 text-[15px] font-black">{g.grade}</span>
                  ))}
                </div>
                <span className="flex-1 text-[13px] font-semibold text-white/90 sm:text-left">1분 자가체크로 예비 등급(S·A·B·C)과 추천 트랙 확인</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-5 py-2.5 text-[13px] font-black text-[#1A56DB]">
                  자가체크 시작 <ArrowRight size={15} />
                </span>
              </div>
            </Link>

            <div className="mx-auto mt-6 grid max-w-3xl gap-4 text-left sm:grid-cols-2">
              {MALL_TRACKS.filter((t) => t.flow === "subscribe").map((t) => (
                <div
                  key={t.id}
                  className={`flex flex-col overflow-hidden rounded-2xl border bg-white ${
                    t.highlight ? "border-pink-200 shadow-md" : "border-[var(--border)]"
                  }`}
                >
                  {t.highlight && <div className="h-1 w-full bg-pink-500" />}
                  <div className="px-5 pt-5">
                    <div className="flex items-center justify-between">
                      <div className="text-[18px] font-black tracking-tight">{t.name}</div>
                      {t.highlight && <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-bold text-pink-600">추천</span>}
                    </div>
                    <div className="mt-1 text-[12px] text-[var(--muted)]">{t.tagline}</div>
                    <div className="mt-3 flex items-end gap-1">
                      <span className="text-[24px] font-black text-pink-500">{t.priceLabel}</span>
                      <span className="mb-1 text-[12px] font-semibold text-[var(--muted)]">/월</span>
                    </div>
                    <div className="text-[12px] text-[var(--muted)]">+ {t.commissionLabel}</div>
                  </div>
                  <ul className="mt-4 flex-1 space-y-1.5 border-t border-[var(--border)] px-5 py-4">
                    {t.features.map((f) => (
                      <li key={f} className="flex gap-1.5 text-[12px]"><Check size={14} className="mt-0.5 shrink-0 text-pink-500" /> {f}</li>
                    ))}
                  </ul>
                  <div className="px-5 pb-5">
                    <Link
                      href={`${ONBOARDING.path}?track=${t.id}`}
                      className={`block w-full rounded-lg py-2.5 text-center text-[12px] font-bold transition-colors ${
                        t.highlight ? "bg-pink-500 text-white hover:bg-pink-600" : "border border-[var(--fg)] text-[var(--fg)] hover:bg-slate-50"
                      }`}
                    >
                      {t.name}으로 입점
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-center text-[12px] text-[var(--muted)]">
              메가 스케일업이 필요하다면{" "}
              <Link href={`${ONBOARDING.path}?track=onboarding`} className="font-semibold text-[var(--accent)] hover:underline">
                {MALL_TRACK_MAP.onboarding.name} ({MALL_TRACK_MAP.onboarding.priceLabel})
              </Link>
              {" "}· <Link href={ONBOARDING.path} className="font-semibold text-[var(--accent)] hover:underline">전체 트랙 비교</Link>
            </div>
          </div>
        </section>
      )}
        </div>

        {/* 좌우 화살표 (데스크탑) — 슬라이드 2장 이상일 때만 */}
        {slideCount > 1 && (
          <>
            <button onClick={() => goSlide(slide - 1)} aria-label="이전"
              className={`absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-[var(--border)] bg-white/90 p-2 shadow-md hover:bg-white md:block ${slide <= 0 ? "pointer-events-none opacity-0" : ""}`}>
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => goSlide(slide + 1)} aria-label="다음"
              className={`absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-[var(--border)] bg-white/90 p-2 shadow-md hover:bg-white md:block ${slide >= slideCount - 1 ? "pointer-events-none opacity-0" : ""}`}>
              <ChevronRight size={20} />
            </button>

            {/* 하단 점 인디케이터 */}
            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {Array.from({ length: slideCount }, (_, i) => i).map((i) => (
                <button key={i} onClick={() => goSlide(i)} aria-label={`슬라이드 ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${slide === i ? "w-6 bg-[var(--accent)]" : "w-2 bg-[var(--border)]"}`} />
              ))}
            </div>
          </>
        )}
      </div>

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

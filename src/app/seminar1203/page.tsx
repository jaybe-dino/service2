/*
 * /seminar1203 — TikTok Shop 글로벌 진출 전략 세미나 (2026.12.03, 교보타워 드림홀 23층).
 * /seminar1120의 GloveK 풀폭·잉크표지 디자인 언어를 이어감. 신청은 외부 Google Forms(새 창).
 * 신규 브랜드 = 공개 신규폼(주 CTA), 기존 참여 브랜드 = 기존폼(보조 링크).
 */
import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
import { Calendar, MapPin, Users, Clock, Store, Sparkles, Truck, CreditCard, Gift, Mail, Coffee, ArrowUpRight } from "lucide-react";
import styles from "./seminar.module.css";

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const FORM_NEW = "https://docs.google.com/forms/d/e/1FAIpQLSd8xDJnMlU6OBqO0PdLl-cILIDKPsuoH2bf0psP87na92l24w/viewform";
const FORM_EXISTING = "https://forms.gle/iZyswAmdkedbfA1u5";
const CONTACT = "dino_glovek@glovek.space";
const VENUE = "교보타워 드림홀 23층";
const ADDRESS = "서울특별시 서초구 강남대로 465";
const MAPS: { label: string; url: string }[] = [
  { label: "네이버 지도", url: "https://map.naver.com/p/search/교보타워%20드림홀" },
  { label: "카카오맵", url: "https://map.kakao.com/?q=교보타워%20강남대로%20465" },
  { label: "구글 지도", url: "https://www.google.com/maps/search/?api=1&query=교보타워%20강남대로%20465" },
];

export const metadata: Metadata = {
  title: "TikTok Shop 글로벌 진출 전략 세미나 | 2026.12.03",
  description:
    "2026년 12월 3일(목) 14:00–17:00 · 교보타워 드림홀 23층(서울 서초구 강남대로 465). 한국 법인으로 TikTok Shop 크로스보더 입점을 준비하는 브랜드를 위한 실무 세미나 — 입점·매출 성장, 글로벌 특송·결제, K-뷰티 제품 기획과 OEM·ODM 제조. 참여기업: 디노스튜디오·정코스·SF익스프레스·핑퐁페이먼트.",
  alternates: { canonical: "/seminar1203" },
  openGraph: {
    url: "https://glovek.space/seminar1203",
    title: "TikTok Shop 글로벌 진출 전략 세미나",
    description:
      "2026.12.03(목) 14:00–17:00 · 교보타워 드림홀 23층. 입점·매출 성장부터 글로벌 특송·결제, K-뷰티 OEM·ODM 제조까지 — 각 분야 실무 전략.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "TikTok Shop 글로벌 진출 전략 세미나 | 2026.12.03",
    description: "12월 3일(목) 14:00–17:00 · 교보타워 드림홀 23층 · 디노스튜디오·정코스·SF익스프레스·핑퐁페이먼트",
  },
};

// 참여기업 — SF익스프레스는 후원사이므로 로고 나열 시 가장 앞에 배치(허정발 대표 확인). 정코스는 공식 로고 미보유 → 기업명 텍스트.
const COMPANIES: { name: string; role: string; logo: string | null; maxH: string }[] = [
  { name: "SF익스프레스", role: "후원 · 글로벌 특송", logo: "/seminar1203/logo-sf.png", maxH: "max-h-[34px]" },
  { name: "디노스튜디오", role: "틱톡샵 입점·운영", logo: "/seminar1203/logo-dino.png", maxH: "max-h-[34px]" },
  { name: "정코스", role: "K-뷰티 OEM·ODM", logo: null, maxH: "" },
  { name: "핑퐁페이먼트", role: "글로벌 결제", logo: "/seminar1203/logo-pingpong.svg", maxH: "max-h-[24px]" },
];

// 핵심 학습 내용 — 실제 프로그램(발표) 기반 4개 주제.
const LEARN: { icon: IconType; org: string; title: string; desc: string }[] = [
  { icon: Store, org: "디노스튜디오", title: "한국 법인으로 시작하는 글로벌 틱톡샵", desc: "입점부터 매출 성장까지, 크로스보더 TikTok Shop 운영의 A to Z를 실무 관점에서 정리합니다." },
  { icon: Sparkles, org: "정코스", title: "K-뷰티 제품 기획과 OEM·ODM 제조", desc: "글로벌 시장을 겨냥한 K-뷰티 제품 기획 및 OEM·ODM 제조 전략을 다룹니다." },
  { icon: Truck, org: "SF익스프레스", title: "성장하는 브랜드의 특송 파트너 선택", desc: "성장하는 이커머스 브랜드가 어떤 글로벌 특송 파트너를 선택해야 하는지 짚습니다." },
  { icon: CreditCard, org: "핑퐁페이먼트", title: "올인원 글로벌 결제 솔루션", desc: "해외 비즈니스 성장을 위한 올인원 글로벌 결제 솔루션을 소개합니다." },
];

// 최종 프로그램(시간표) — 2026-11-20 확정 기준.
const PROGRAM: { time: string; org: string | null; title: string; rest?: boolean }[] = [
  { time: "14:00 – 14:10", org: null, title: "개회 / 행사 소개" },
  { time: "14:10 – 15:00", org: "디노스튜디오", title: "한국 법인으로 시작하는 글로벌 틱톡샵 A to Z: 입점부터 매출 성장까지" },
  { time: "15:00 – 15:40", org: "정코스", title: "글로벌 시장을 위한 K-뷰티 제품 기획 및 OEM·ODM 제조 전략" },
  { time: "15:40 – 15:50", org: null, title: "휴식 (10분)", rest: true },
  { time: "15:50 – 16:25", org: "SF익스프레스", title: "성장하는 이커머스 브랜드는 어떤 특송 파트너를 선택해야 하는가" },
  { time: "16:25 – 17:00", org: "핑퐁페이먼트", title: "해외 비즈니스 성장을 위한 올인원 글로벌 결제 솔루션" },
];

function ApplyNew({ big = false, onDark = false }: { big?: boolean; onDark?: boolean }) {
  return (
    <a
      href={FORM_NEW}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#b6382c] font-semibold text-white transition-colors hover:bg-[#9c2f24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        onDark ? "focus-visible:outline-[#fdfcf9]" : "focus-visible:outline-[#1f1b16]"
      } ${big ? "px-7 py-3.5 text-[17px]" : "px-6 py-3 text-[15px]"}`}
    >
      신규 브랜드 참가 신청
      <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden />
    </a>
  );
}

function ApplyExisting({ onDark = false }: { onDark?: boolean }) {
  return (
    <a
      href={FORM_EXISTING}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        onDark ? "text-[#c9cdd6] focus-visible:outline-[#fdfcf9]" : "text-[#5e554a] focus-visible:outline-[#1f1b16]"
      }`}
    >
      기존 참여 브랜드이신가요? 기존 브랜드 신청
      <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden />
    </a>
  );
}

function CompanyMark({ c }: { c: (typeof COMPANIES)[number] }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div className="flex h-[40px] items-center justify-center">
        {c.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.logo} alt={c.name} className={`${c.maxH} h-auto w-auto max-w-full object-contain`} loading="lazy" />
        ) : (
          <span className="text-[19px] font-semibold tracking-tight text-[#1f1b16]">{c.name}</span>
        )}
      </div>
      <div className="min-w-0">
        {c.logo && <p className="text-[13px] font-medium text-[#1f1b16]">{c.name}</p>}
        <p className="text-[12px] text-[#655b50]">{c.role}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#f0a79d]" />
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[#aab0bd]">{label}</p>
        <p className="mt-0.5 text-[15px] leading-relaxed text-white">{children}</p>
      </div>
    </div>
  );
}

export default function Seminar1203Page() {
  return (
    <main className={`${styles.page} break-keep bg-white text-[#1f1b16] antialiased`}>

      {/* ══ HERO — 짙은 잉크 표지 ══ */}
      <header className="relative isolate overflow-hidden bg-[#171b23] text-white">
        <div className={styles.heroMap} aria-hidden="true" />
        <div className={`${styles.container} relative z-10`}>
          <div className="flex items-center justify-between gap-4 border-b border-white/10 py-4 text-[12px] font-medium text-[#aab0bd]">
            <span>전략 세미나 · Global Commerce</span>
            <span className="tabular-nums">2026 · Seoul</span>
          </div>

          <div className="grid grid-cols-1 items-center gap-8 py-10 sm:py-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-12">
            {/* 좌: 제목·소개·날짜·행동 */}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#f0a79d]">한국 법인으로 준비하는 TikTok Shop 크로스보더</p>
              <h1 className="mt-4 text-[34px] font-semibold leading-[1.08] tracking-tight sm:text-[46px] lg:text-[58px]">
                TikTok Shop<br />글로벌 진출<br />전략 세미나
              </h1>
              <p className="mt-5 max-w-[520px] text-[15px] leading-relaxed text-[#c9cdd6] sm:text-[16px]">
                입점과 매출 성장부터 글로벌 특송·결제, K-뷰티 제품 기획과 OEM·ODM 제조까지 —
                각 분야 실무진이 해외 진출 전략을 직접 소개합니다.
              </p>

              {/* 큰 날짜 */}
              <div className="mt-7 flex items-end gap-4">
                <span className="text-[52px] font-semibold leading-[0.9] tracking-tight tabular-nums text-[#f0a79d] sm:text-[64px]">12.03</span>
                <div className="pb-1.5 text-[13px] font-medium leading-tight text-[#c9cdd6]">
                  <p className="text-white">2026 · 목요일</p>
                  <p className="mt-1 tabular-nums">14:00 – 17:00</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5 text-[15px] text-white">
                <span className="inline-flex items-center gap-3"><MapPin size={18} strokeWidth={1.5} className="shrink-0 text-[#f0a79d]" /> {VENUE}</span>
                <span className="inline-flex items-start gap-3"><Users size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#f0a79d]" /> <span className="text-[#c9cdd6]">TikTok Shop·해외 진출을 준비하는 브랜드·제조·유통기업</span></span>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <ApplyNew onDark />
                <a href="#program" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/25 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fdfcf9]">
                  프로그램 보기
                </a>
              </div>
              <div className="mt-4"><ApplyExisting onDark /></div>
            </div>

            {/* 우: 타이포그래픽 행사 정보 카드(사진 없이) */}
            <div className="min-w-0 lg:order-last">
              <div className="rounded-2xl border border-white/15 bg-white/5 p-6 sm:p-7">
                <p className="text-[12px] font-semibold text-[#f0a79d]">행사 개요</p>
                <div className="mt-5 space-y-5">
                  <InfoRow icon={Calendar} label="일시">2026년 12월 3일(목) 14:00 – 17:00 <span className="text-[#aab0bd]">(KST)</span></InfoRow>
                  <InfoRow icon={MapPin} label="장소">{VENUE}<br /><span className="text-[#c9cdd6]">{ADDRESS}</span></InfoRow>
                  <InfoRow icon={Users} label="참여기업">SF익스프레스 · 디노스튜디오 · 정코스 · 핑퐁페이먼트</InfoRow>
                  <InfoRow icon={Mail} label="문의"><a href={`mailto:${CONTACT}`} className="break-all underline-offset-2 hover:underline">{CONTACT}</a></InfoRow>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ══ 참여기업 로고 스트립 — 화이트 (SF익스프레스 후원사 → 맨 앞) ══ */}
      <section className="border-b border-[#1f1b16]/10 bg-white">
        <div className={`${styles.container} py-8`}>
          <p className="text-center text-[12px] font-semibold text-[#655b50] sm:text-left">참여기업</p>
          <div className="mt-6 grid grid-cols-2 items-start gap-x-6 gap-y-8 sm:grid-cols-4 sm:gap-x-10">
            {COMPANIES.map((c) => (
              <CompanyMark key={c.name} c={c} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ 세미나 소개 — 웜그레이 ══ */}
      <section className="bg-[#e9e4da]">
        <div className={`${styles.container} py-11 sm:py-14`}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-12">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#b6382c]">About</p>
              <h2 className="mt-2 text-[24px] font-semibold tracking-tight sm:text-[30px]">세미나 소개</h2>
            </div>
            <div className="min-w-0">
              <p className="text-[17px] font-medium leading-relaxed text-[#1f1b16] sm:text-[18px]">
                한국 법인으로 TikTok Shop 크로스보더 입점을 준비하는 브랜드를 위한 실무 세미나입니다.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-[#5e554a] sm:text-[16px]">
                입점과 매출 성장부터 글로벌 특송·결제, K-뷰티 제품 기획과 OEM·ODM 제조까지 — 각 분야의 실무 전략을 소개합니다.
                TikTok Shop 및 해외 시장 진출을 준비하는 국내 브랜드·제조·유통기업 관계자를 대상으로 합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 핵심 학습 내용 — 페이퍼 ══ */}
      <section className="bg-[#f7f5f0]">
        <div className={`${styles.container} py-12 sm:py-14`}>
          <p className="text-[12px] font-semibold text-[#b6382c]">Highlights</p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight sm:text-[32px]">핵심 학습 내용</h2>
          <p className="mt-3 max-w-[560px] text-[16px] leading-relaxed text-[#5e554a]">
            실제 프로그램 발표를 기반으로, 해외 진출 실무의 네 축을 한자리에서 정리합니다.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
            {LEARN.map((l) => (
              <div key={l.title} className="flex min-w-0 gap-4 border-t border-[#1f1b16]/12 pt-6">
                <l.icon size={22} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#b6382c]" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-[#b6382c]">{l.org}</p>
                  <h3 className="mt-1 text-[18px] font-semibold leading-snug tracking-tight sm:text-[20px]">{l.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#5e554a]">{l.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 프로그램 시간표 — 짙은 잉크(장면 전환) ══ */}
      <section id="program" className="scroll-mt-6 bg-[#171b23] text-white">
        <div className={`${styles.container} py-12 sm:py-14`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#f0a79d]">Program</p>
              <h2 className="mt-2 text-[26px] font-semibold tracking-tight sm:text-[32px]">프로그램</h2>
            </div>
            <p className="inline-flex items-center gap-2 text-[13px] text-[#aab0bd]"><Clock size={15} strokeWidth={1.5} className="text-[#f0a79d]" /> 14:00 – 17:00 (KST)</p>
          </div>
          <ol className="mt-8 divide-y divide-white/10">
            {PROGRAM.map((p) => (
              <li key={p.time} className="grid grid-cols-1 gap-x-6 gap-y-1.5 py-5 sm:grid-cols-[150px_1fr] sm:items-baseline">
                <span className="text-[14px] font-semibold tabular-nums text-[#f0a79d]">{p.time}</span>
                {p.rest ? (
                  <span className="inline-flex items-center gap-2 text-[15px] text-[#aab0bd]"><Coffee size={16} strokeWidth={1.5} /> {p.title}</span>
                ) : (
                  <div className="min-w-0">
                    {p.org && <p className="text-[12.5px] font-medium text-[#aab0bd]">{p.org}</p>}
                    <p className="mt-0.5 text-[16px] font-medium leading-snug text-white sm:text-[17px]">{p.title}</p>
                  </div>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-6 text-[12px] text-[#aab0bd]">* 현장 사정에 따라 발표 순서·시간은 일부 변동될 수 있습니다.</p>
        </div>
      </section>

      {/* ══ 특별 프로모션 — 화이트(액센트 밴드) ══ */}
      <section className="bg-white">
        <div className={`${styles.container} py-12 sm:py-14`}>
          <div className="grid grid-cols-1 gap-6 rounded-2xl border-l-4 border-[#b6382c] bg-[#f3e6df] p-6 sm:p-8 md:grid-cols-[auto_1fr] md:items-center md:gap-8">
            <Gift size={36} strokeWidth={1.3} className="shrink-0 text-[#b6382c]" aria-hidden />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-[#b6382c]">세미나 참석 브랜드 특별 혜택</p>
              <p className="mt-2 text-[18px] font-semibold leading-snug tracking-tight text-[#1f1b16] sm:text-[20px]">
                세미나에 참석한 브랜드가 디노스튜디오와 틱톡샵 운영을 진행하시면, 추가 1개 국가의 틱톡샵 운영을 무료로 지원해 드립니다.
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-[#655b50]">* 혜택 적용 범위·절차는 신청 후 개별 안내드립니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 오시는 길 — 화이트 ══ */}
      <section className="bg-[#f7f5f0]">
        <div className={`${styles.container} py-12 sm:py-14`}>
          <p className="text-[12px] font-semibold text-[#b6382c]">Location</p>
          <h2 className="mt-2 text-[24px] font-semibold tracking-tight sm:text-[30px]">오시는 길</h2>
          <div className="mt-7 grid gap-x-12 gap-y-8 lg:grid-cols-[1fr_minmax(0,320px)]">
            <div className="min-w-0">
              <p className="text-[17px] font-semibold">{VENUE}</p>
              <p className="mt-1 text-[15px] text-[#5e554a]">{ADDRESS}</p>
              <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-[#5e554a]">
                <p className="grid grid-cols-[auto_1fr] gap-3"><span className="font-medium text-[#1f1b16]">지하철</span><span>9호선·신분당선 신논현역 인근(강남대로). 정확한 출구·도보 경로는 지도 앱에서 확인해 주세요.</span></p>
                <p className="grid grid-cols-[auto_1fr] gap-3"><span className="font-medium text-[#1f1b16]">자가용</span><span>건물 주차 상황에 따라 혼잡할 수 있어 대중교통을 권장합니다.</span></p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {MAPS.map((m) => (
                  <a key={m.label} href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#1f1b16]/15 bg-white px-4 py-2 text-[13.5px] font-medium transition-colors hover:border-[#b6382c] hover:text-[#b6382c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1b16]">
                    {m.label} <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden />
                  </a>
                ))}
              </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-[#1f1b16]/12 bg-white p-6">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-[#b6382c]"><Mail size={18} strokeWidth={1.5} /> 문의</p>
              <a href={`mailto:${CONTACT}`} className="mt-2 block break-all text-[17px] font-semibold text-[#1f1b16] underline-offset-2 hover:underline">{CONTACT}</a>
              <p className="mt-3 text-[14px] leading-relaxed text-[#5e554a]">등록 · 프로그램 · 현장 안내</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 최종 신청 — 짙은 밴드(풀폭) ══ */}
      <section className="relative isolate overflow-hidden bg-[#12151c] text-white">
        <div className={styles.closingMap} aria-hidden="true" />
        <div className={`${styles.container} relative z-10 py-12 sm:py-14`}>
          <div className="max-w-[640px]">
            <div className={`${styles.tiktokLogo} ${styles.closingLogo}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/seminar1203/tiktok-logo.webp" alt="TikTok" width={2000} height={834} loading="eager" />
            </div>
            <h2 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[34px]">지금 참가 신청하세요</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#c9cdd6]">
              2026.12.03(목) 14:00 – 17:00 · {VENUE}. 신규 브랜드는 아래 공식 신청서로 접수해 주세요.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ApplyNew big onDark />
              <ApplyExisting onDark />
            </div>
            <p className="mt-5 text-[13px] text-[#aab0bd]">문의 {CONTACT}</p>
          </div>
        </div>
      </section>

      {/* ══ 푸터 — 화이트 ══ */}
      <footer className="border-t border-[#1f1b16]/10 bg-white">
        <div className={`${styles.container} py-8`}>
          <p className="text-center text-[12px] font-semibold text-[#655b50]">참여기업</p>
          <div className="mx-auto mt-6 grid max-w-[720px] grid-cols-2 items-start gap-x-6 gap-y-8 sm:grid-cols-4 sm:gap-x-10">
            {COMPANIES.map((c) => (
              <CompanyMark key={c.name} c={c} />
            ))}
          </div>
          <p className="mt-8 text-center text-[13px] text-[#5e554a]">
            문의 <a href={`mailto:${CONTACT}`} className="font-medium text-[#1f1b16] underline-offset-2 hover:underline">{CONTACT}</a>
          </p>
        </div>
      </footer>
    </main>
  );
}

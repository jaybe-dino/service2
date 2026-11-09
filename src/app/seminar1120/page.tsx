/*
 * /seminar1120 — TikTok Shop & 글로벌 진출 실무 세미나.
 * 풀폭 섹션 구성: 짙은 잉크 표지 + 밝은 본문, 섹션마다 배경(ink / white / warm-grey / paper) 전환.
 * Design method: "Unslop" by Damir Sokolovsky (@heydamir) — https://heydamir.design/unslop (CC-BY-4.0).
 * 신청은 외부 Google Forms(새 창)로 접수. 결제·자동 계약·내부 폼 저장 없음.
 */
import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";
import { Calendar, MapPin, Users, Building2, Store, Megaphone, Truck, Mail, ArrowUpRight } from "lucide-react";
import styles from "./seminar.module.css";

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const FORM_URL = "https://forms.gle/2Vtibrkbrv7DAnwC7";
const CONTACT = "dino_glovek@glovek.space";
const VENUE = "포스코타워 역삼 이벤트홀";
const ADDRESS = "서울특별시 강남구 테헤란로 134 (역삼동)";
const VENUE_SOURCE = "https://poscotower-yeoksam.co.kr/page/1_2.php";
const MAPS: { label: string; url: string }[] = [
  { label: "네이버 지도", url: "https://map.naver.com/p/search/포스코타워%20역삼%20이벤트홀" },
  { label: "카카오맵", url: "https://map.kakao.com/?q=포스코타워%20역삼" },
  { label: "구글 지도", url: "https://www.google.com/maps/search/?api=1&query=포스코타워%20역삼%20이벤트홀" },
];

export const metadata: Metadata = {
  title: "TikTok Shop & 글로벌 진출 실무 세미나 | 2026.11.20",
  description:
    "일본에서 시작해 미국·동남아로. 2026.11.20(금) 14:00–18:00 · 포스코타워 역삼 이벤트홀(서울 강남구 테헤란로 134). 입점·운영과 국가별 판매 전략, 현지 마케팅과 글로벌 크리에이터, 해외 물류·풀필먼트와 인증·정산을 다룹니다. 공동 주관: 아워박스·비브로·디노스튜디오.",
  alternates: { canonical: "/seminar1120" },
  openGraph: {
    url: "https://glovek.space/seminar1120",
    title: "TikTok Shop & 글로벌 진출 실무 세미나",
    description:
      "일본에서 시작해 미국·동남아로 — 2026.11.20(금) 14:00–18:00 · 포스코타워 역삼 이벤트홀. 입점·운영 → 콘텐츠·마케팅 → 물류·인증·정산.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "TikTok Shop & 글로벌 진출 실무 세미나 | 2026.11.20",
    description: "11월 20일(금) 14:00–18:00 · 포스코타워 역삼 이벤트홀 · 아워박스·비브로·디노스튜디오",
  },
};

// 광학 크기 균형을 위해 로고별 최대 높이 지정(비율 유지, 폭은 자동). ourbox는 저해상(150px)이라 과대확대 금지.
const HOSTS: { src: string; alt: string; cls: string }[] = [
  { src: "/seminar1120/ourbox.png", alt: "아워박스", cls: "max-h-[20px]" },
  { src: "/seminar1120/bbro.png", alt: "비브로", cls: "max-h-[28px]" },
  { src: "/seminar1120/dinostudio.png", alt: "디노스튜디오", cls: "max-h-[36px]" },
];

// 로고 한 줄 고정(최소 320px까지): 3고정 컬럼 그리드, 각 셀 안에서 비율 유지하며 축소.
function HostLogos({ className = "" }: { className?: string }) {
  return (
    <div className={`grid grid-cols-3 place-items-center gap-x-6 sm:gap-x-12 ${className}`}>
      {HOSTS.map((o) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={o.src} src={o.src} alt={o.alt} className={`${o.cls} h-auto w-auto max-w-full object-contain`} loading="lazy" />
      ))}
    </div>
  );
}

const FACTS: { icon: IconType; label: string; value: ReactNode }[] = [
  { icon: Calendar, label: "일시", value: <>2026.11.20(금)<br />14:00 – 18:00</> },
  { icon: MapPin, label: "장소", value: <>{VENUE}<br /><span className="text-[#655b50]">{ADDRESS}</span></> },
  { icon: Users, label: "공동 주관", value: <>아워박스 · 비브로 · 디노스튜디오</> },
  { icon: Building2, label: "대상", value: <>해외 진출을 준비하는 국내 브랜드 · 제조 · 유통기업</> },
];

const PILLARS: { icon: IconType; step: string; title: string; desc: string }[] = [
  { icon: Store, step: "입점·운영", title: "입점·운영과 국가별 판매 전략", desc: "TikTok Shop 입점과 운영, 국가별 판매 전략을 실무 관점에서 정리합니다." },
  { icon: Megaphone, step: "콘텐츠·마케팅", title: "현지 마케팅과 글로벌 크리에이터", desc: "현지 마케팅과 글로벌 크리에이터를 활용한 판매 전환 흐름을 다룹니다." },
  { icon: Truck, step: "물류·정산", title: "해외 물류·풀필먼트와 인증·정산", desc: "해외 물류·풀필먼트, 인증과 정산까지 진출 실무의 뒷단을 짚습니다." },
];

// 이미지 출처(리사이즈·WebP 변환만 적용):
// listing: https://cdn.imweb.me/thumbnail/20250803/573cccddcf538.jpg
// fulfillment: https://cdn.imweb.me/thumbnail/20230709/2a56a52cb4cfd.jpg
// creator: 기존 /refer 공개 콘텐츠 예시(ugc-drive-2.jpg). 연사·행사 사진으로 표현하지 않는다.
const IMG = {
  listing: { src: "/seminar1120/listing.webp", alt: "태블릿으로 상품 운영 자료를 검토하는 모습", label: "입점·상품 리스팅", credit: "비브로 공식 이미지", href: "https://bbro.co.kr/brand-agency", w: 960, h: 639 },
  creator: { src: "/seminar1120/creator.webp", alt: "헤어 스타일링 제품을 직접 보여주는 숏폼 콘텐츠 예시", label: "제품 시연·숏폼 콘텐츠", credit: "콘텐츠 예시 보기", href: "/refer#ugc", w: 576, h: 1024 },
  fulfillment: { src: "/seminar1120/fulfillment.webp", alt: "상품과 배송 박스가 보관된 아워박스 물류센터 내부", label: "보관·출고·풀필먼트", credit: "아워박스 공식 이미지", href: "https://ourbox.co.kr/Center", w: 1370, h: 500 },
};

function Apply({ big = false, onDark = false }: { big?: boolean; onDark?: boolean }) {
  return (
    <a
      href={FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#b6382c] font-semibold text-white transition-colors hover:bg-[#9c2f24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        onDark ? "focus-visible:outline-[#fdfcf9]" : "focus-visible:outline-[#1f1b16]"
      } ${big ? "px-7 py-3.5 text-[17px]" : "px-6 py-3 text-[15px]"}`}
    >
      참가 신청하기
      <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden />
    </a>
  );
}

function TikTokVisualLogo({ closing = false }: { closing?: boolean }) {
  return (
    <div className={`${styles.tiktokLogo} ${closing ? styles.closingLogo : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/seminar1120/tiktok-logo.webp" alt="TikTok" width={2000} height={834} loading="eager" />
    </div>
  );
}

// 진출 경로 — 일본에서 시작해 미국·동남아로. 얇은 분기 경로선(독자 SVG) + 실제 HTML 라벨(큰 시장명).
function RouteLine() {
  return (
    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7" role="img" aria-label="진출 경로: 일본에서 시작해 미국·동남아로">
      <div className="flex items-center gap-3">
        <span className="h-3 w-3 shrink-0 rounded-full bg-[#b6382c]" aria-hidden />
        <span className="text-[26px] font-semibold tracking-tight text-[#1f1b16] sm:text-[32px]">일본</span>
        <span className="rounded-md border border-[#b6382c]/40 px-2 py-0.5 text-[12px] font-medium text-[#b6382c]">시작 시장</span>
      </div>
      <svg viewBox="0 0 72 52" className="hidden h-[52px] w-[72px] shrink-0 sm:block" aria-hidden>
        <g fill="none" stroke="#b6382c" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 26 H26" />
          <path d="M26 26 C46 26 52 10 70 10" />
          <path d="M26 26 C46 26 52 42 70 42" />
        </g>
      </svg>
      <span className="pl-1 text-[20px] text-[#b6382c] sm:hidden" aria-hidden>↓</span>
      <div className="flex gap-x-8 gap-y-2 sm:flex-col sm:gap-y-3">
        <span className="inline-flex items-center gap-2 text-[24px] font-semibold tracking-tight text-[#1f1b16] sm:text-[30px]"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#b6382c]" aria-hidden />미국</span>
        <span className="inline-flex items-center gap-2 text-[24px] font-semibold tracking-tight text-[#1f1b16] sm:text-[30px]"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#b6382c]" aria-hidden />동남아</span>
      </div>
    </div>
  );
}

// 실무 흐름의 가로 사진 컷(번호 + 주제 + 출처). listing/fulfillment에 사용.
function FlowShot({ img, num, step, aspect }: { img: typeof IMG.listing; num: string; step: string; aspect: string }) {
  return (
    <figure className="min-w-0">
      <div className={`${styles.edImg} ${aspect}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.src} alt={img.alt} width={img.w} height={img.h} loading="lazy" />
        <span className={styles.photoLabel}>{img.label}</span>
      </div>
      <figcaption className="mt-3 flex items-baseline justify-between gap-3">
        <span className="flex items-baseline gap-3 min-w-0">
          <span className="text-[22px] font-semibold tabular-nums leading-none text-[#b6382c]">{num}</span>
          <span className="truncate text-[14px] font-medium text-[#1f1b16]">{step}</span>
        </span>
        <a href={img.href} target="_blank" rel="noopener noreferrer" className={styles.imageCredit}>
          {img.credit} <ArrowUpRight size={12} strokeWidth={1.5} aria-hidden />
        </a>
      </figcaption>
    </figure>
  );
}

export default function Seminar1120Page() {
  return (
    <main className={`${styles.page} break-keep bg-white text-[#1f1b16] antialiased`}>

      {/* ══ HERO — 짙은 잉크 표지 ══ */}
      <header className="relative overflow-hidden bg-[#171b23] text-white">
        <div className={styles.heroMap} aria-hidden="true" />
        <div className={`${styles.container} relative`}>
          {/* 상단 마스트헤드 */}
          <div className="flex items-center justify-between gap-4 border-b border-white/10 py-4 text-[12px] font-medium text-[#aab0bd]">
            <span>실무 세미나 · Global Commerce</span>
            <span className="tabular-nums">2026 · Seoul</span>
          </div>

          <div className="grid grid-cols-1 items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.04fr_0.96fr] lg:gap-14">
            {/* 좌: 제목·소개·날짜·행사정보·행동 */}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#f0a79d]">일본에서 시작해 미국·동남아로</p>
              <h1 className="mt-4 text-[36px] font-semibold leading-[1.08] tracking-tight sm:text-[48px] lg:text-[60px]">
                TikTok Shop &amp;<br />글로벌 진출<br />실무 세미나
              </h1>
              <p className="mt-5 max-w-[500px] text-[15px] leading-relaxed text-[#c9cdd6] sm:text-[16px]">
                입점·운영과 국가별 판매 전략부터 현지 마케팅·글로벌 크리에이터, 해외 물류·풀필먼트와 인증·정산까지 —
                해외 진출을 준비하는 기업을 위한 하루 세미나.
              </p>

              {/* 큰 날짜 */}
              <div className="mt-7 flex items-end gap-4">
                <span className="text-[52px] font-semibold leading-[0.9] tracking-tight tabular-nums text-[#f0a79d] sm:text-[64px]">11.20</span>
                <div className="pb-1.5 text-[13px] font-medium leading-tight text-[#c9cdd6]">
                  <p className="text-white">2026 · 금요일</p>
                  <p className="mt-1 tabular-nums">14:00 – 18:00</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5 text-[15px] text-white">
                <span className="inline-flex items-center gap-3"><MapPin size={18} strokeWidth={1.5} className="shrink-0 text-[#f0a79d]" /> {VENUE}</span>
                <span className="inline-flex items-center gap-3"><Users size={18} strokeWidth={1.5} className="shrink-0 text-[#f0a79d]" /> 공동 주관 · 아워박스 · 비브로 · 디노스튜디오</span>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Apply onDark />
                <a href="#program" className="inline-flex min-h-[44px] items-center rounded-xl border border-white/25 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fdfcf9]">
                  프로그램 보기
                </a>
              </div>
            </div>

            {/* 우: 실제 행사장 사진(크게) + 날짜 인쇄형 블록 */}
            <figure className="min-w-0 lg:order-last">
              <div className={styles.venueCrop}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/seminar1120/venue.jpg" alt="포스코타워 역삼 이벤트홀 내부" width={671} height={771} loading="eager" />
                <div className={styles.dateChip}>
                  <div className="text-[10px] font-semibold tracking-wide text-[#b6382c]">NOV</div>
                  <div className="text-[26px] font-semibold leading-none tabular-nums">20</div>
                  <div className="text-[10px] tabular-nums text-[#655b50]">2026 · FRI</div>
                </div>
              </div>
              <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[#aab0bd]">
                <span>{VENUE}</span>
                <a href={VENUE_SOURCE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fdfcf9]">
                  사진 출처: 공식 홈페이지 <ArrowUpRight size={13} strokeWidth={1.5} aria-hidden />
                </a>
              </figcaption>
              <p className="mt-1 text-[11.5px] text-[#aab0bd]">* 공간 참고용 이미지이며, 행사 당일 촬영 사진이 아닙니다.</p>
            </figure>
          </div>
        </div>
      </header>

      {/* ══ 공동 주관 로고 스트립 — 화이트 ══ */}
      <section className="border-b border-[#1f1b16]/10 bg-white">
        <div className={`${styles.container} flex flex-col items-center gap-5 py-9 sm:flex-row sm:justify-between sm:gap-8`}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#655b50]">공동 주관</p>
          <HostLogos className="w-full max-w-[420px]" />
        </div>
      </section>

      {/* ══ 진출 경로 — 웜그레이 밴드 ══ */}
      <section className="bg-[#e9e4da]">
        <div className={`${styles.container} py-14 sm:py-16`}>
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-12">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#b6382c]">Route</p>
              <h2 className="mt-2 text-[24px] font-semibold tracking-tight sm:text-[30px]">진출 경로</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#5e554a]">
                일본 시장에서 시작해, 미국과 동남아로 판매 채널을 넓혀가는 흐름을 함께 설계합니다.
              </p>
            </div>
            <div className="flex min-w-0 justify-center lg:justify-end">
              <RouteLine />
            </div>
          </div>
        </div>
      </section>

      {/* ══ 핵심 정보 info row — 화이트 ══ */}
      <section className="bg-white">
        <div className={`${styles.container} py-14 sm:py-16`}>
          <dl className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map((f) => (
              <div key={f.label} className="min-w-0 border-t border-[#1f1b16]/12 pt-5">
                <dt className="flex items-center gap-2 text-[13px] font-semibold text-[#b6382c]">
                  <f.icon size={18} strokeWidth={1.5} />
                  {f.label}
                </dt>
                <dd className="mt-2 text-[16px] leading-relaxed text-[#1f1b16]">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ══ 실무 흐름 — 페이퍼(에디토리얼 사진) ══ */}
      <section className="bg-[#f7f5f0]">
        <div className={`${styles.container} py-16 sm:py-20`}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#b6382c]">Flow</p>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight sm:text-[32px]">진출 실무, 한 흐름으로</h2>
          <p className="mt-3 max-w-[560px] text-[16px] leading-relaxed text-[#5e554a]">
            입점·운영에서 콘텐츠·마케팅, 물류·인증·정산까지 — 실제 진출 순서대로 연결해 다룹니다.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch lg:gap-12">
            {/* 콘텐츠 — 세로 숏폼 컷(시선 포인트) */}
            <figure className="min-w-0 self-center">
              <div className={styles.phone}>
                <span className={styles.phoneBar} aria-hidden="true" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={IMG.creator.src} alt={IMG.creator.alt} width={IMG.creator.w} height={IMG.creator.h} loading="lazy" />
              </div>
              <figcaption className="mx-auto mt-4 flex max-w-[300px] items-baseline justify-between gap-3">
                <span className="flex items-baseline gap-3 min-w-0">
                  <span className="text-[22px] font-semibold tabular-nums leading-none text-[#b6382c]">02</span>
                  <span className="truncate text-[14px] font-medium text-[#1f1b16]">콘텐츠·마케팅</span>
                </span>
                <a href={IMG.creator.href} target="_blank" rel="noopener noreferrer" className={styles.imageCredit}>
                  {IMG.creator.credit} <ArrowUpRight size={12} strokeWidth={1.5} aria-hidden />
                </a>
              </figcaption>
            </figure>

            {/* 리스팅 + 물류 — 가로 컷 2단 */}
            <div className="flex min-w-0 flex-col justify-center gap-7">
              <FlowShot img={IMG.listing} num="01" step="입점·운영" aspect="aspect-[960/639]" />
              <FlowShot img={IMG.fulfillment} num="03" step="물류·정산" aspect="aspect-[137/50]" />
            </div>
          </div>
          <p className="mt-8 text-[12px] leading-relaxed text-[#655b50]">* 업무 흐름을 보여주는 참고 이미지이며, 행사 당일 사진이 아닙니다.</p>
        </div>
      </section>

      {/* ══ 주요 내용(구성안) — 짙은 잉크(장면 전환) ══ */}
      <section id="program" className="scroll-mt-6 bg-[#171b23] text-white">
        <div className={`${styles.container} py-16 sm:py-20`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#f0a79d]">Program</p>
              <h2 className="mt-2 text-[26px] font-semibold tracking-tight sm:text-[32px]">주요 내용(구성안)</h2>
            </div>
            <p className="text-[13px] text-[#aab0bd]">연사 · 세부 시간표는 추후 안내 예정</p>
          </div>
          <ol className="mt-10 divide-y divide-white/10">
            {PILLARS.map((p, i) => (
              <li key={p.title} className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 py-7 sm:grid-cols-[96px_1fr]">
                <span className="text-[30px] font-semibold leading-none tracking-tight tabular-nums text-[#f0a79d] sm:text-[40px]">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <span className="flex items-center gap-2 text-[12.5px] font-medium text-[#aab0bd]">
                    <p.icon size={16} strokeWidth={1.5} className="text-[#f0a79d]" /> {p.step}
                  </span>
                  <h3 className="mt-1.5 text-[18px] font-semibold leading-snug tracking-tight sm:text-[21px]">{p.title}</h3>
                  <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-[#c9cdd6] sm:text-[16px]">{p.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ══ 신청 방법 — 웜그레이 ══ */}
      <section className="bg-[#e9e4da]">
        <div className={`${styles.container} py-14 sm:py-16`}>
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#b6382c]">Apply</p>
              <h2 className="mt-2 text-[24px] font-semibold tracking-tight sm:text-[30px]">신청 방법</h2>
              <ol className="mt-6 space-y-4 text-[16px] leading-relaxed text-[#1f1b16]">
                <li className="grid grid-cols-[26px_1fr] gap-3"><span className="font-semibold tabular-nums text-[#b6382c]">1</span><span>아래 공식 신청서(Google Forms)에서 신청합니다.</span></li>
                <li className="grid grid-cols-[26px_1fr] gap-3"><span className="font-semibold tabular-nums text-[#b6382c]">2</span><span>신청 후, 참석 확정 안내를 사전에 발송해 드립니다.</span></li>
                <li className="grid grid-cols-[26px_1fr] gap-3"><span className="font-semibold tabular-nums text-[#b6382c]">3</span><span>여러 명이 참석하실 경우, 참가자별로 각각 신청해 주세요.</span></li>
              </ol>
            </div>
            <div className="lg:text-right">
              <Apply />
              <p className="mt-3 text-[12.5px] text-[#655b50]">외부 온라인 신청서(새 창)로 접수됩니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 오시는 길 — 화이트(장소 정보 중심) ══ */}
      <section className="bg-white">
        <div className={`${styles.container} py-14 sm:py-16`}>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#b6382c]">Location</p>
          <h2 className="mt-2 text-[24px] font-semibold tracking-tight sm:text-[30px]">오시는 길</h2>
          <div className="mt-7 grid gap-x-12 gap-y-8 lg:grid-cols-[1fr_minmax(0,320px)]">
            <div className="min-w-0">
              <p className="text-[17px] font-semibold">{VENUE}</p>
              <p className="mt-1 text-[15px] text-[#5e554a]">{ADDRESS}</p>
              <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-[#5e554a]">
                <p className="grid grid-cols-[auto_1fr] gap-3"><span className="font-medium text-[#1f1b16]">지하철</span><span>2호선 역삼역 인근(테헤란로). 정확한 출구·도보 경로는 지도 앱에서 확인해 주세요.</span></p>
                <p className="grid grid-cols-[auto_1fr] gap-3"><span className="font-medium text-[#1f1b16]">자가용</span><span>건물 주차 상황에 따라 혼잡할 수 있어 대중교통을 권장합니다.</span></p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                {MAPS.map((m) => (
                  <a key={m.label} href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#1f1b16]/15 px-4 py-2 text-[13.5px] font-medium transition-colors hover:border-[#b6382c] hover:text-[#b6382c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1b16]">
                    {m.label} <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden />
                  </a>
                ))}
              </div>
            </div>
            <div className="min-w-0 rounded-2xl border border-[#1f1b16]/12 bg-[#f7f5f0] p-6">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-[#b6382c]"><Mail size={18} strokeWidth={1.5} /> 문의</p>
              <a href={`mailto:${CONTACT}`} className="mt-2 block break-all text-[17px] font-semibold text-[#1f1b16] underline-offset-2 hover:underline">{CONTACT}</a>
              <p className="mt-3 text-[14px] leading-relaxed text-[#5e554a]">등록 · 프로그램 · 현장 안내</p>
              <div className="mt-5"><Apply /></div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 최종 신청 — 짙은 물류 밴드(풀폭) ══ */}
      <section className="relative overflow-hidden bg-[#12151c] text-white">
        <div className={styles.closingLogistics} aria-hidden="true" />
        <div className={styles.closingMap} aria-hidden="true" />
        <div className={`${styles.container} relative py-16 sm:py-20`}>
          <div className="max-w-[640px]">
            <TikTokVisualLogo closing />
            <h2 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[34px]">지금 참가 신청하세요</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#c9cdd6]">
              2026.11.20(금) 14:00 – 18:00 · {VENUE}. 신청 후 참석 확정 안내를 사전에 보내드립니다.
            </p>
            <div className="mt-7"><Apply big onDark /></div>
            <p className="mt-4 text-[13px] text-[#aab0bd]">문의 {CONTACT}</p>
          </div>
        </div>
      </section>

      {/* ══ 푸터 — 화이트 ══ */}
      <footer className="border-t border-[#1f1b16]/10 bg-white">
        <div className={`${styles.container} py-12`}>
          <p className="text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-[#655b50]">공동 주관</p>
          <HostLogos className="mx-auto mt-6 max-w-[420px]" />
          <p className="mt-9 text-center text-[13px] text-[#5e554a]">
            문의 <a href={`mailto:${CONTACT}`} className="font-medium text-[#1f1b16] underline-offset-2 hover:underline">{CONTACT}</a>
          </p>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-[#655b50]">
            연사 · 세부 시간표 · 정원 · 참가비 등 세부사항은 추후 안내됩니다.
          </p>
        </div>
      </footer>
    </main>
  );
}

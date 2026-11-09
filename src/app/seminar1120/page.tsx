/*
 * /seminar1120 — TikTok Shop & 글로벌 진출 실무 세미나 (밝은 행사 브로슈어).
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
const VENUE_SOURCE = "https://poscotower-yeoksam.co.kr";
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

const HOSTS: { src: string; alt: string; h: string }[] = [
  { src: "/seminar1120/ourbox.png", alt: "아워박스", h: "h-[20px]" },
  { src: "/seminar1120/bbro.png", alt: "비브로", h: "h-[30px]" },
  { src: "/seminar1120/dinostudio.png", alt: "디노스튜디오", h: "h-[38px]" },
];

const FACTS: { icon: IconType; label: string; value: ReactNode }[] = [
  { icon: Calendar, label: "일시", value: <>2026.11.20(금)<br />14:00 – 18:00</> },
  { icon: MapPin, label: "장소", value: <>{VENUE}<br /><span className="text-[#7b7266]">{ADDRESS}</span></> },
  { icon: Users, label: "공동 주관", value: <>아워박스 · 비브로 · 디노스튜디오</> },
  { icon: Building2, label: "대상", value: <>해외 진출을 준비하는 국내 브랜드 · 제조 · 유통기업</> },
];

const PILLARS: { icon: IconType; step: string; title: string; desc: string }[] = [
  { icon: Store, step: "입점·운영", title: "입점·운영과 국가별 판매 전략", desc: "TikTok Shop 입점과 운영, 국가별 판매 전략을 실무 관점에서 정리합니다." },
  { icon: Megaphone, step: "콘텐츠·마케팅", title: "현지 마케팅과 글로벌 크리에이터", desc: "현지 마케팅과 글로벌 크리에이터를 활용한 판매 전환 흐름을 다룹니다." },
  { icon: Truck, step: "물류·정산", title: "해외 물류·풀필먼트와 인증·정산", desc: "해외 물류·풀필먼트, 인증과 정산까지 진출 실무의 뒷단을 짚습니다." },
];

function Apply({ big = false }: { big?: boolean }) {
  return (
    <a
      href={FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-xl bg-[#b6382c] font-semibold text-white transition-colors hover:bg-[#9c2f24] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1b16] ${
        big ? "px-7 py-3.5 text-[17px]" : "px-6 py-3 text-[15px]"
      }`}
    >
      참가 신청하기
      <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden />
    </a>
  );
}

// 진출 경로 — 일본에서 시작해 미국·동남아로. 얇은 분기 경로선(독자 SVG, 장식 국기 없음).
function RouteLine() {
  return (
    <svg viewBox="0 0 680 108" className="h-auto w-full max-w-[560px]" role="img" aria-label="진출 경로: 한국·일본에서 시작해 미국·동남아로">
      <g fill="none" stroke="#b6382c" strokeWidth="1.5" strokeLinecap="round">
        <path d="M86 54 H222" />
        <path d="M250 54 C372 54 432 30 532 30" />
        <path d="M250 54 C372 54 432 80 532 80" />
      </g>
      <g fill="#b6382c">
        <circle cx="72" cy="54" r="4" />
        <circle cx="236" cy="54" r="4.5" />
        <circle cx="546" cy="30" r="4" />
        <circle cx="546" cy="80" r="4" />
      </g>
      <g fill="#1f1b16" fontSize="15" fontWeight="500">
        <text x="72" y="82" textAnchor="middle">한국</text>
        <text x="236" y="82" textAnchor="middle">일본</text>
        <text x="562" y="35" textAnchor="start">미국</text>
        <text x="562" y="85" textAnchor="start">동남아</text>
      </g>
      <text x="236" y="30" textAnchor="middle" fill="#7b7266" fontSize="11.5">시작 시장</text>
    </svg>
  );
}

export default function Seminar1120Page() {
  return (
    <main className="min-h-screen break-keep bg-[#f7f4ee] text-[#1f1b16] antialiased">
      <div className="mx-auto max-w-[1120px] px-6 sm:px-8">

        {/* ── HERO ── */}
        <header className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <div>
            <p className="text-[13px] font-medium text-[#7b7266]">실무 세미나 · 2026</p>
            <h1 className="mt-4 text-[34px] font-semibold leading-[1.12] tracking-tight sm:text-[42px] lg:text-[54px]">
              TikTok Shop &amp; 글로벌 진출<br className="hidden sm:block" /> 실무 세미나
            </h1>
            <p className="mt-5 text-[19px] font-medium leading-snug text-[#5e554a] sm:text-[22px]">
              일본에서 시작해 미국·동남아로.
            </p>
            <p className="mt-4 max-w-[500px] text-[16px] leading-relaxed text-[#5e554a]">
              입점·운영과 국가별 판매 전략부터 현지 마케팅·글로벌 크리에이터, 해외 물류·풀필먼트와 인증·정산까지 —
              해외 진출을 준비하는 기업을 위한 하루 세미나.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 text-[15px] text-[#1f1b16]">
              <span className="inline-flex items-center gap-2.5"><Calendar size={18} strokeWidth={1.5} className="text-[#b6382c]" /> 2026.11.20(금) 14:00 – 18:00</span>
              <span className="inline-flex items-center gap-2.5"><MapPin size={18} strokeWidth={1.5} className="text-[#b6382c]" /> {VENUE}</span>
            </div>
            <div className="mt-8">
              <Apply />
            </div>
            <div className="mt-10 border-t border-[#1f1b16]/10 pt-6">
              <p className="text-[12px] font-medium text-[#7b7266]">공동 주관</p>
              <div className="mt-3.5 flex flex-wrap items-center gap-x-7 gap-y-4">
                {HOSTS.map((o) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={o.src} src={o.src} alt={o.alt} className={`${o.h} w-auto object-contain`} loading="lazy" />
                ))}
              </div>
            </div>
          </div>

          {/* 큰 행사장 사진 (공식 홈페이지, 실제 사진 영역만 크롭) */}
          <figure className="lg:order-last">
            <div className={styles.venueCrop}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/seminar1120/venue.jpg" alt="포스코타워 역삼 이벤트홀 내부" width={671} height={771} />
            </div>
            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[#7b7266]">
              <span>{VENUE}</span>
              <a href={VENUE_SOURCE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
                사진 출처: 공식 홈페이지 <ArrowUpRight size={13} strokeWidth={1.5} aria-hidden />
              </a>
            </figcaption>
            <p className="mt-1 text-[11.5px] text-[#9a9186]">* 공간 참고용 이미지이며, 행사 당일 촬영 사진이 아닙니다.</p>
          </figure>
        </header>

        {/* ── 진출 경로 (시그니처) ── */}
        <section className="border-t border-[#1f1b16]/10 py-12">
          <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
            <div className="max-w-[360px]">
              <h2 className="text-[20px] font-semibold tracking-tight">진출 경로</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#5e554a]">
                검증된 일본 시장에서 시작해, 미국과 동남아로 판매 채널을 넓혀가는 흐름을 함께 설계합니다.
              </p>
            </div>
            <div className="flex justify-center sm:justify-end">
              <RouteLine />
            </div>
          </div>
        </section>

        {/* ── 핵심 정보 ── */}
        <section className="border-t border-[#1f1b16]/10 py-12">
          <dl className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {FACTS.map((f) => (
              <div key={f.label}>
                <dt className="flex items-center gap-2 text-[13px] font-medium text-[#7b7266]">
                  <f.icon size={18} strokeWidth={1.5} className="text-[#b6382c]" />
                  {f.label}
                </dt>
                <dd className="mt-2.5 text-[16px] leading-relaxed text-[#1f1b16]">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── 실무 흐름 (입점 → 콘텐츠 → 물류) ── */}
        <section className="border-t border-[#1f1b16]/10 py-14">
          <h2 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">진출 실무, 한 흐름으로</h2>
          <p className="mt-2 max-w-[560px] text-[16px] leading-relaxed text-[#5e554a]">
            입점·운영에서 콘텐츠·마케팅, 물류·인증·정산까지 — 실제 진출 순서대로 연결해 다룹니다.
          </p>
          <ol className="mt-9 flex flex-col gap-y-3 sm:flex-row sm:items-stretch sm:gap-x-3">
            {PILLARS.map((p, i) => (
              <li key={p.step} className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start sm:gap-0">
                <div className="flex w-full flex-1 flex-col rounded-2xl border border-[#1f1b16]/12 bg-[#fdfcf9] p-5">
                  <span className="grid h-10 w-10 place-items-center rounded-lg border border-[#b6382c]/25 text-[#b6382c]">
                    <p.icon size={20} strokeWidth={1.5} />
                  </span>
                  <span className="mt-3 text-[12px] font-medium text-[#7b7266]">STEP {i + 1} · {p.step}</span>
                  <span className="mt-1 text-[16px] font-semibold leading-snug">{p.title}</span>
                </div>
                {i < PILLARS.length - 1 && (
                  <span className="shrink-0 px-1 text-[#b6382c] sm:self-center" aria-hidden>
                    <span className="hidden sm:inline">→</span>
                    <span className="sm:hidden">↓</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* ── 주요 내용 (구성안) ── */}
        <section className="border-t border-[#1f1b16]/10 py-14">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">주요 내용</h2>
            <p className="text-[13px] text-[#7b7266]">연사 · 세부 시간표는 추후 안내 예정</p>
          </div>
          <div className="mt-8 divide-y divide-[#1f1b16]/10">
            {PILLARS.map((p, i) => (
              <div key={p.title} className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 py-6 sm:grid-cols-[72px_1fr]">
                <span className="text-[26px] font-semibold leading-none text-[#1f1b16]/25 sm:text-[30px]">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-[18px] font-semibold leading-snug sm:text-[20px]">{p.title}</h3>
                  <p className="mt-2 max-w-[640px] text-[16px] leading-relaxed text-[#5e554a]">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 신청 안내 ── */}
        <section className="border-t border-[#1f1b16]/10 py-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">신청 방법</h2>
              <ol className="mt-6 space-y-4 text-[16px] leading-relaxed text-[#1f1b16]">
                <li className="grid grid-cols-[22px_1fr] gap-3"><span className="font-semibold text-[#b6382c]">1</span><span>아래 공식 신청서(Google Forms)에서 신청합니다.</span></li>
                <li className="grid grid-cols-[22px_1fr] gap-3"><span className="font-semibold text-[#b6382c]">2</span><span>신청 후, 참석 확정 안내를 사전에 발송해 드립니다.</span></li>
                <li className="grid grid-cols-[22px_1fr] gap-3"><span className="font-semibold text-[#b6382c]">3</span><span>여러 명이 참석하실 경우, 참가자별로 각각 신청해 주세요.</span></li>
              </ol>
            </div>
            <div className="lg:text-right">
              <Apply />
              <p className="mt-3 text-[12.5px] text-[#7b7266]">외부 온라인 신청서(새 창)로 접수됩니다.</p>
            </div>
          </div>
        </section>

        {/* ── 오시는 길 ── */}
        <section className="border-t border-[#1f1b16]/10 py-14">
          <h2 className="text-[24px] font-semibold tracking-tight sm:text-[28px]">오시는 길</h2>
          <div className="mt-7 grid gap-x-12 gap-y-7 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[17px] font-semibold">{VENUE}</p>
              <p className="mt-1 text-[15px] text-[#5e554a]">{ADDRESS}</p>
              <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-[#5e554a]">
                <p className="grid grid-cols-[auto_1fr] gap-2.5"><span className="font-medium text-[#1f1b16]">지하철</span><span>2호선 역삼역 인근(테헤란로). 정확한 출구·도보 경로는 지도 앱에서 확인해 주세요.</span></p>
                <p className="grid grid-cols-[auto_1fr] gap-2.5"><span className="font-medium text-[#1f1b16]">자가용</span><span>건물 주차 상황에 따라 혼잡할 수 있어 대중교통을 권장합니다.</span></p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {MAPS.map((m) => (
                  <a key={m.label} href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[#1f1b16]/15 px-3.5 py-2 text-[13.5px] font-medium transition-colors hover:border-[#b6382c] hover:text-[#b6382c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f1b16]">
                    {m.label} <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden />
                  </a>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[#1f1b16]/12 bg-[#fdfcf9] p-6">
              <p className="flex items-center gap-2 text-[13px] font-medium text-[#7b7266]"><Mail size={18} strokeWidth={1.5} className="text-[#b6382c]" /> 문의</p>
              <a href={`mailto:${CONTACT}`} className="mt-2 block break-all text-[17px] font-semibold text-[#1f1b16] underline-offset-2 hover:underline">{CONTACT}</a>
              <p className="mt-3 text-[14px] leading-relaxed text-[#5e554a]">등록 · 프로그램 · 현장 안내</p>
              <div className="mt-5"><Apply /></div>
            </div>
          </div>
        </section>

        {/* ── 최종 신청 ── */}
        <section className="border-t border-[#1f1b16]/10 py-16">
          <div className="max-w-[640px]">
            <h2 className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[34px]">지금 참가 신청하세요</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-[#5e554a]">
              2026.11.20(금) 14:00 – 18:00 · {VENUE}. 신청 후 참석 확정 안내를 사전에 보내드립니다.
            </p>
            <div className="mt-7"><Apply big /></div>
            <p className="mt-4 text-[13px] text-[#7b7266]">문의 {CONTACT}</p>
          </div>
        </section>
      </div>

      {/* ── 공동 주관 ── */}
      <footer className="border-t border-[#1f1b16]/10">
        <div className="mx-auto max-w-[1120px] px-6 py-12 sm:px-8">
          <p className="text-center text-[12px] font-medium text-[#7b7266]">공동 주관</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {HOSTS.map((o) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={o.src} src={o.src} alt={o.alt} className={`${o.h} w-auto object-contain`} loading="lazy" />
            ))}
          </div>
          <p className="mt-9 text-center text-[13px] text-[#5e554a]">
            문의 <a href={`mailto:${CONTACT}`} className="font-medium text-[#1f1b16] underline-offset-2 hover:underline">{CONTACT}</a>
          </p>
          <p className="mt-2 text-center text-[11.5px] text-[#9a9186]">연사 · 세부 시간표 · 정원 · 참가비 등 세부사항은 추후 안내됩니다.</p>
        </div>
      </footer>
    </main>
  );
}

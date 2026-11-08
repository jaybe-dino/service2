import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";

// 신청은 외부 Google Forms(새창)로 접수. 결제·자동 계약·내부 폼 저장 없음.
const FORM_URL = "https://forms.gle/2Vtibrkbrv7DAnwC7";
const CONTACT = "dino_glovek@glovek.space";
const VENUE = "포스코타워 역삼 이벤트홀";
const ADDRESS = "서울특별시 강남구 테헤란로 134 (역삼동)";
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

/* ── 신청 CTA (외부 Google Forms, 새창) ── */
function Apply({ big = false }: { big?: boolean }) {
  return (
    <a
      href={FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FE2C55] to-[#ec4899] font-black text-white shadow-lg transition hover:shadow-xl ${
        big ? "px-9 py-4 text-[16px] sm:text-[18px]" : "px-7 py-3.5 text-[14px]"
      }`}
    >
      참가 신청하기
      <span className="transition group-hover:translate-x-0.5" aria-hidden>
        →
      </span>
    </a>
  );
}

const FACTS: { icon: string; label: string; value: ReactNode }[] = [
  { icon: "🗓️", label: "일시", value: <><b>2026.11.20(금)</b><br />14:00 – 18:00</> },
  { icon: "📍", label: "장소", value: <><b>{VENUE}</b><br />{ADDRESS}</> },
  { icon: "🤝", label: "공동 주관", value: <>아워박스 · 비브로 · 디노스튜디오</> },
  { icon: "🎯", label: "대상", value: <>해외 진출 준비 국내 브랜드 · 제조 · 유통기업</> },
];

// 국가 확장 흐름 — 일본에서 시작해 미국·동남아로.
const COUNTRY_FLOW: { flag: string; name: string; tag: string }[] = [
  { flag: "🇯🇵", name: "일본", tag: "시작 시장" },
  { flag: "🇺🇸", name: "미국", tag: "확장" },
  { flag: "🌏", name: "동남아", tag: "확장" },
];

// 실무 흐름 3단계 — 입점·운영 → 콘텐츠·마케팅 → 물류·인증·정산.
const PILLARS: { no: string; icon: string; title: string; desc: string }[] = [
  { no: "01", icon: "🛒", title: "입점·운영과 국가별 판매 전략", desc: "TikTok Shop 입점과 운영, 국가별 판매 전략을 실무 관점에서 정리합니다." },
  { no: "02", icon: "🎬", title: "현지 마케팅과 글로벌 크리에이터", desc: "현지 마케팅과 글로벌 크리에이터를 활용한 판매 전환 흐름을 다룹니다." },
  { no: "03", icon: "📦", title: "해외 물류·풀필먼트와 인증·정산", desc: "해외 물류·풀필먼트, 인증과 정산까지 진출 실무의 뒷단을 짚습니다." },
];

export default function Seminar1120Page() {
  return (
    <div className="min-h-screen break-keep bg-white text-[#2d3748]">
      {/* ── HERO ── */}
      <header className="relative overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[#FE2C55] opacity-25 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full bg-[#25F4EE] opacity-20 blur-[120px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[4px] text-pink-300">
              TikTok Shop · Global
            </div>
            <h1 className="mt-5 text-[34px] font-black leading-[1.1] tracking-tight sm:text-[52px]">
              TikTok Shop &amp;{" "}
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-[#25F4EE] bg-clip-text text-transparent">
                글로벌 진출
              </span>{" "}
              실무 세미나
            </h1>
            <p className="mt-5 text-[19px] font-extrabold leading-snug text-white sm:text-[24px]">
              일본에서 시작해{" "}
              <span className="bg-gradient-to-r from-pink-300 to-[#25F4EE] bg-clip-text text-transparent">미국·동남아</span>로.
            </p>
            <p className="mt-4 max-w-[540px] text-[15px] leading-relaxed text-slate-300 sm:text-[16.5px]">
              입점·운영과 국가별 판매 전략부터 현지 마케팅·글로벌 크리에이터, 해외 물류·풀필먼트와 인증·정산까지 —
              해외 진출 준비 기업을 위한 실무 세미나.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5 text-[13px] font-semibold text-slate-200">
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5">🗓️ 2026.11.20(금) 14:00–18:00</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5">📍 포스코타워 역삼 이벤트홀</span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Apply />
              <a href="#program" className="rounded-full border border-white/20 px-6 py-3.5 text-[14px] font-bold text-white hover:bg-white/10">
                주요 내용 보기
              </a>
            </div>
          </div>

          {/* 우측 비주얼 — 날짜 카드 + 국가 확장 흐름 (사진 미사용) */}
          <div className="relative mx-auto w-full max-w-[440px]">
            <div className="absolute -inset-3 rounded-[28px] bg-gradient-to-tr from-pink-500/25 to-sky-500/20 blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 bg-white/[0.04] p-7 ring-1 ring-white/10 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[2px] text-pink-300">Nov</div>
                  <div className="text-[52px] font-black leading-none">20</div>
                  <div className="text-[11px] text-slate-400">2026 · FRI</div>
                </div>
                <div className="text-right text-[13px] leading-relaxed text-slate-300">
                  <div className="font-bold text-white">14:00–18:00</div>
                  <div className="mt-1">{VENUE}</div>
                  <div className="text-[11.5px] text-slate-400">{ADDRESS}</div>
                </div>
              </div>
              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="text-[11px] font-bold uppercase tracking-[2px] text-[#25F4EE]">Global Expansion</div>
                <div className="mt-3 flex items-center gap-2">
                  {COUNTRY_FLOW.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
                        <div className="text-[20px] leading-none">{c.flag}</div>
                        <div className="mt-1 text-[12px] font-bold text-white">{c.name}</div>
                        <div className="text-[9px] text-slate-400">{c.tag}</div>
                      </div>
                      {i < COUNTRY_FLOW.length - 1 && <span className="text-pink-400" aria-hidden>→</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8">
        {/* ── 핵심 정보 ── */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.label} className="rounded-2xl border-t-4 border-[#FE2C55] bg-white p-5 shadow-sm ring-1 ring-[#e2e8f0]">
              <div className="text-[24px]">{f.icon}</div>
              <div className="mt-2 text-[12px] font-bold text-[#FE2C55]">{f.label}</div>
              <div className="mt-1 text-[14px] leading-relaxed">{f.value}</div>
            </div>
          ))}
        </section>

        {/* ── 실무 흐름 시각화: 입점 → 콘텐츠 → 물류 ── */}
        <section className="mt-20">
          <div className="text-[12px] font-extrabold uppercase tracking-[3px] text-sky-600">Flow</div>
          <h2 className="mt-2 text-[28px] font-black tracking-tight sm:text-[36px]">진출 실무, 한 흐름으로</h2>
          <p className="mt-2 text-[14px] text-[#64748b]">입점·운영부터 콘텐츠·마케팅, 물류·인증·정산까지 — 실제 진출 순서대로 정리합니다.</p>
          <div className="mt-8 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {PILLARS.map((p, i) => (
              <Fragment key={p.no}>
                <div className="flex flex-col rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#FE2C55] to-[#ec4899] text-[15px] font-black text-white">
                      {p.no}
                    </div>
                    <div className="text-[24px]">{p.icon}</div>
                  </div>
                  <div className="mt-3 text-[16px] font-extrabold leading-snug">{p.title}</div>
                  <div className="mt-1.5 text-[13.5px] leading-relaxed text-[#64748b]">{p.desc}</div>
                </div>
                {i < PILLARS.length - 1 && (
                  <div className="grid place-items-center">
                    <span className="text-[22px] font-black text-[#FE2C55]" aria-hidden>
                      <span className="hidden lg:inline">→</span>
                      <span className="lg:hidden">↓</span>
                    </span>
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </section>

        {/* ── 주요 내용 (구성안) ── */}
        <section id="program" className="mt-20 scroll-mt-8">
          <div className="text-[12px] font-extrabold uppercase tracking-[3px] text-sky-600">Program</div>
          <h2 className="mt-2 text-[28px] font-black tracking-tight sm:text-[36px]">주요 내용(구성안)</h2>
          <p className="mt-2 text-[14px] text-[#64748b]">연사·세부 시간표는 추후 안내 예정입니다.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.no} className="rounded-2xl border border-[#e2e8f0] bg-white p-5 transition hover:border-[#FE2C55] hover:shadow-md">
                <div className="text-[12px] font-bold text-[#FE2C55]">{p.no}</div>
                <div className="mt-1 text-[15px] font-semibold leading-snug">{p.title}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 신청 안내 ── */}
        <section className="mt-20">
          <div className="rounded-3xl border border-[#e2e8f0] bg-slate-50 p-6 sm:p-8">
            <div className="text-[12px] font-extrabold uppercase tracking-[3px] text-sky-600">How to apply</div>
            <h2 className="mt-2 text-[24px] font-black tracking-tight sm:text-[30px]">신청 방법</h2>
            <ul className="mt-5 space-y-3 text-[14.5px] leading-relaxed">
              <li className="flex gap-2.5"><span className="shrink-0 font-bold text-[#FE2C55]">1.</span><span>아래 <b>공식 신청서(Google Forms)</b>에서 신청합니다.</span></li>
              <li className="flex gap-2.5"><span className="shrink-0 font-bold text-[#FE2C55]">2.</span><span>신청 후, <b>참석 확정 안내를 사전에 발송</b>해 드립니다.</span></li>
              <li className="flex gap-2.5"><span className="shrink-0 font-bold text-[#FE2C55]">3.</span><span>여러 명이 참석하실 경우, <b>참가자별로 각각 신청</b>해 주세요.</span></li>
            </ul>
            <div className="mt-6"><Apply /></div>
            <p className="mt-3 text-[12px] text-[#64748b]">신청은 외부 온라인 신청서(Google Forms, 새 창)로 접수됩니다.</p>
          </div>
        </section>

        {/* ── 오시는 길 ── */}
        <section className="mt-20">
          <div className="text-[12px] font-extrabold uppercase tracking-[3px] text-sky-600">Location</div>
          <h2 className="mt-2 text-[28px] font-black tracking-tight sm:text-[36px]">오시는 길</h2>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6">
              <div className="text-[16px] font-extrabold">{VENUE}</div>
              <div className="mt-1 text-[14px] text-[#64748b]">{ADDRESS}</div>
              <div className="mt-4 space-y-3 text-[14px] leading-relaxed">
                <div className="flex gap-2"><span className="shrink-0 font-bold text-[#FE2C55]">🚇 지하철</span><span>2호선 <b>역삼역</b> 인근(테헤란로). 정확한 출구·도보 경로는 지도 앱에서 확인해 주세요.</span></div>
                <div className="flex gap-2"><span className="shrink-0 font-bold text-[#FE2C55]">🚗 자가용</span><span>건물 주차 상황에 따라 혼잡할 수 있어 대중교통을 권장합니다.</span></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {MAPS.map((m) => (
                  <a key={m.label} href={m.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#e2e8f0] px-4 py-2 text-[12.5px] font-semibold hover:border-[#FE2C55]">
                    {m.label} ↗
                  </a>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] text-[#64748b]">* 정확한 위치·출구는 지도 앱에서 최종 확인해 주세요.</p>
            </div>
            <div className="grid place-items-center rounded-2xl bg-gradient-to-br from-[#fdf2f8] to-white p-6 text-center ring-1 ring-[#e2e8f0]">
              <div>
                <div className="text-[13px] font-bold text-[#64748b]">문의</div>
                <a href={`mailto:${CONTACT}`} className="mt-1 block break-all text-[18px] font-extrabold text-[#FE2C55]">{CONTACT}</a>
                <div className="mt-5 text-[13px] text-[#64748b]">등록 · 프로그램 · 현장 안내</div>
                <div className="mt-4"><Apply /></div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 최종 CTA ── */}
        <section className="relative mt-20 overflow-hidden rounded-3xl bg-slate-950 px-6 py-14 text-center text-white sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#FE2C55] opacity-30 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#25F4EE] opacity-20 blur-[90px]" />
          <div className="relative">
            <div className="text-[12px] font-extrabold uppercase tracking-[3px] text-pink-300">Register</div>
            <h2 className="mt-3 text-[28px] font-black leading-tight tracking-tight sm:text-[40px]">지금 참가 신청하세요</h2>
            <p className="mx-auto mt-4 max-w-[600px] text-[15px] leading-relaxed text-slate-300">
              2026.11.20(금) 14:00–18:00 · {VENUE}. 신청 후 참석 확정 안내를 사전에 보내드립니다.
            </p>
            <div className="mt-7"><Apply big /></div>
            <p className="mt-4 text-[12px] text-slate-500">문의 {CONTACT}</p>
          </div>
        </section>
      </div>

      {/* ── 하단 주관 밴드 (텍스트, 로고 미사용) ── */}
      <footer className="border-t border-[#e2e8f0] bg-slate-50">
        <div className="mx-auto max-w-[1180px] px-5 py-12 text-center sm:px-8">
          <div className="text-[12px] font-bold uppercase tracking-[3px] text-[#64748b]">공동 주관</div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[15px] font-extrabold text-slate-700">
            <span>아워박스</span>
            <span className="text-slate-300" aria-hidden>·</span>
            <span>비브로</span>
            <span className="text-slate-300" aria-hidden>·</span>
            <span>디노스튜디오</span>
          </div>
          <div className="mt-8 text-[12px] text-[#64748b]">
            문의 <a href={`mailto:${CONTACT}`} className="font-semibold text-[#FE2C55]">{CONTACT}</a>
          </div>
          <div className="mt-2 text-[11.5px] text-[#94a3b8]">연사 · 세부 시간표 · 정원 · 참가비 등 세부사항은 추후 안내됩니다.</div>
        </div>
      </footer>
    </div>
  );
}

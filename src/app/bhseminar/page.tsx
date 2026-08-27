import type { Metadata } from "next";

const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc0iBKMgKNebPt4iz1Vq3t2sqG_3K83w8I3H_7a2fSqc8iWOQ/viewform";
const ADDRESS = "서울 강남구 테헤란로 518 섬유센터 17층";
const CONTACT = "dino_glovek@dinostudio.kr";

export const metadata: Metadata = {
  title: "뷰티 & 헬스케어 글로벌 진출 원스톱 전략 세미나 | 2026",
  description: "2026.9.8(화) 13:00–18:00 · 서울 섬유센터. 글로벌 TikTok Shop/Amazon 구축·운영·물류·정산·인증까지 한 번에. 참여자·신청자 전원 「50개국 글로벌 진출 전략」 E-book 제공.",
  openGraph: {
    title: "뷰티 & 헬스케어 글로벌 진출 원스톱 전략 세미나",
    description: "글로벌 TikTok Shop/Amazon — 구축·운영·물류·정산·인증까지. 2026.9.8 서울 섬유센터.",
    images: ["/bhseminar/venue-building.jpg"],
    type: "website",
  },
};

/* ── 브랜드 마크 (SVG 재현) ── */
function TikTokMark({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-block font-black leading-none ${className}`} aria-label="TikTok">
      <span className="absolute left-[-1.5px] top-[1px] text-[#25F4EE]" aria-hidden>TikTok</span>
      <span className="absolute left-[1.5px] top-[-1px] text-[#FE2C55]" aria-hidden>TikTok</span>
      <span className="relative text-slate-900">TikTok</span>
    </span>
  );
}
function AmazonMark({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-block font-black leading-none text-slate-900 ${className}`} aria-label="Amazon">
      amazon
      <svg viewBox="0 0 120 22" className="absolute -bottom-[7px] left-1 w-[88%]" aria-hidden>
        <path d="M4 8 Q60 26 108 7" fill="none" stroke="#FF9900" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M108 7 l-9 -1 M108 7 l-3 8" fill="none" stroke="#FF9900" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}
function ShukranMark({ className = "" }: { className?: string }) {
  // 받은 로고 재현: 주황 SHUKRAN + 회색 KOREA (정확한 raster 필요 시 파일 교체)
  return (
    <span className={`inline-flex flex-col items-start leading-none ${className}`} aria-label="Shukran Korea">
      <span className="font-black tracking-tight text-[#F26522]">SHU<span className="inline-block scale-x-[1.1]">K</span>RAN</span>
      <span className="mt-0.5 self-end text-[0.5em] font-bold tracking-[0.15em] text-slate-500">KOREA</span>
    </span>
  );
}

const FACTS: { icon: string; label: string; value: React.ReactNode }[] = [
  { icon: "🗓", label: "일시", value: <>2026년 9월 8일(화)<br />13:00 – 18:00</> },
  { icon: "📍", label: "장소", value: <>{ADDRESS}</> },
  { icon: "👥", label: "대상", value: <>뷰티·헬스케어 브랜드/제조사<br />대표·실무자 · 사전 등록</> },
  { icon: "🎁", label: "참가 혜택", value: <>참여자 전원 <b>「50개국 진출 전략」 E-book</b><br />1:1 진출 상담 · 현장 온보딩</> },
];

const SESSIONS: { org: string; title: string }[] = [
  { org: "디노스튜디오", title: "왜 지금 글로벌 TikTok Shop인가 — 마케팅 전략 가이드" },
  { org: "디노스튜디오", title: "한국법인으로 글로벌 틱톡샵 오픈 A to Z — 입점·구축·운영·마케팅" },
  { org: "SF Express", title: "해외에서 잘 팔리기 시작하면, 물류는 어떻게 달라져야 할까?" },
  { org: "슈크란코리아", title: "사우디·UAE 진출, 가장 빠른 길 — 등록부터 유통까지 한 번에" },
  { org: "핑퐁페이먼트", title: "핑퐁페이먼트를 통한 틱톡샵 판매 대금 수취 가이드" },
  { org: "전경련 바이오 CEO Club", title: "기업 소개 등" },
];

const GALLERY = [
  { src: "/bhseminar/venue-building.jpg", cap: "섬유센터 (테헤란로 518)" },
  { src: "/bhseminar/venue-lounge.jpg", cap: "17층 스카이 라운지" },
  { src: "/bhseminar/venue-hall.jpg", cap: "세미나홀" },
];

const REGIONS = [["🇺🇸", "미국"], ["🇻🇳🇹🇭", "동남아"], ["🇸🇦🇦🇪", "중동"], ["🇯🇵", "일본"]];

// 파트너 — 브랜드 색상 워드마크(실제 로고 파일 수령 시 <img>로 교체)
const PARTNER_MARKS: { key: string; node: React.ReactNode }[] = [
  { key: "imf", node: <span className="text-[12px] font-black uppercase leading-[1.1] tracking-tight text-[#E6007E]">The Influencer<br />Marketing Factory</span> },
  { key: "eal", node: <span className="text-[16px] font-black tracking-tight"><span className="text-[#0a7ec0]">EASTERN AIR</span> <span className="text-[#8dc63f]">LOGISTICS</span></span> },
  { key: "kantana", node: <span className="text-[18px] font-black tracking-tight text-[#0b3b8c]">KANTANA</span> },
  { key: "ecomobi", node: <span className="inline-flex flex-col items-center leading-none"><span className="text-[17px] font-black tracking-tight text-slate-800">ECOM<span className="text-[#f5333f]">O</span>BI</span><span className="mt-0.5 text-[8px] text-slate-500">Do the right thing</span></span> },
  { key: "bpm", node: <span style={{ fontFamily: "Georgia, 'Times New Roman', serif" }} className="text-[16px] font-bold tracking-wide text-slate-900">BEST PRACTICE <span className="text-[11px] tracking-[0.25em]">MEDIA</span></span> },
  { key: "kindnet", node: <span className="text-[17px] font-black tracking-tight"><span className="text-slate-900">Kind</span><span className="text-[#16a34a]">net</span></span> },
];

const MAPS = [
  { label: "네이버 지도", url: "https://map.naver.com/p/search/" + encodeURIComponent("섬유센터 테헤란로 518") },
  { label: "카카오맵", url: "https://map.kakao.com/?q=" + encodeURIComponent("테헤란로 518 섬유센터") },
  { label: "구글 지도", url: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("서울 강남구 테헤란로 518 섬유센터") },
];

function Apply({ big }: { big?: boolean }) {
  return (
    <a href={FORM_URL} target="_blank" rel="noopener noreferrer" className="group relative inline-block break-keep">
      <span aria-hidden className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-pink-500 via-fuchsia-500 to-orange-400 opacity-50 blur-lg transition group-hover:opacity-90" />
      <span className={`relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent,#ec4899)] to-orange-400 font-extrabold text-white transition group-hover:scale-[1.03] ${big ? "px-10 py-4 text-[17px]" : "px-6 py-3 text-[14px]"}`}>
        참가 신청하기 <span className="text-[1.1em] transition group-hover:translate-x-0.5" aria-hidden>→</span>
      </span>
    </a>
  );
}

export default function BhSeminarPage() {
  return (
    <div className="min-h-screen break-keep bg-[var(--bg,#fff)] text-[var(--fg,#2d3748)]">
      {/* ── 히어로 ── */}
      <header className="relative overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[var(--accent,#ec4899)] opacity-25 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full bg-sky-500 opacity-20 blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.4) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[4px] text-pink-300">
              Offline Seminar · 2026
            </div>
            <h1 className="mt-5 text-[38px] font-black leading-[1.08] tracking-tight sm:text-[60px]">
              뷰티 &amp; 헬스케어
              <br className="hidden sm:block" />{" "}
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-orange-300 bg-clip-text text-transparent">글로벌 진출</span> 전략 세미나
            </h1>
            <p className="mt-5 text-[20px] font-extrabold leading-snug text-white sm:text-[26px]">
              가장 빠른 글로벌 진출 성공전략 —
              <br className="hidden sm:block" />{" "}
              <span className="bg-gradient-to-r from-pink-300 to-orange-200 bg-clip-text text-transparent">정확하게, 그리고 빠르게.</span>
            </p>
            <p className="mt-4 max-w-[540px] text-[15px] leading-relaxed text-slate-300 sm:text-[17px]">
              글로벌 <b className="text-white">TikTok Shop · Amazon</b> — 구축 · 운영 · 물류 · 정산 · 인증까지 한 번에.
              지금 해외로 나가려는 브랜드·제조사를 위한 원스톱 실무 전략.
            </p>
            {/* 플랫폼 배지 */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5"><TikTokMark className="text-[16px]" /> <span className="text-[12px] font-bold text-slate-500">Shop</span></span>
              <span className="inline-flex items-center rounded-lg bg-white px-3 py-2"><AmazonMark className="text-[16px]" /></span>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {["2026.9.8(화) 13:00–18:00", "서울 섬유센터 17층", "참여자 전원 E-book 제공"].map((c) => (
                <span key={c} className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[12.5px] font-semibold text-slate-200">{c}</span>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Apply big />
              <a href="#program" className="rounded-full border border-white/20 px-6 py-3.5 text-[14px] font-bold text-white hover:bg-white/10">프로그램 보기</a>
            </div>
          </div>
          {/* 건물 이미지 */}
          <div className="relative mx-auto w-full max-w-[400px]">
            <div className="absolute -inset-3 rounded-[28px] bg-gradient-to-tr from-pink-500/30 to-sky-500/20 blur-2xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bhseminar/venue-building.jpg" alt="섬유센터" className="relative w-full rounded-3xl object-cover shadow-2xl ring-1 ring-white/10" />
            <div className="absolute -bottom-4 -left-4 rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-xl">
              <div className="text-[10px] font-bold text-[var(--accent,#ec4899)]">SEP</div>
              <div className="text-[26px] font-black leading-none">08</div>
              <div className="text-[10px] text-slate-500">2026 · TUE</div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8">
        {/* 핵심 정보 */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.label} className="rounded-2xl border-t-4 border-[var(--accent,#ec4899)] bg-white p-5 shadow-sm ring-1 ring-[var(--border,#e2e8f0)]">
              <div className="text-[24px]">{f.icon}</div>
              <div className="mt-2 text-[12px] font-bold text-[var(--accent,#ec4899)]">{f.label}</div>
              <div className="mt-1 text-[14px] leading-relaxed">{f.value}</div>
            </div>
          ))}
        </section>

        {/* E-book 강조 배너 */}
        <section className="mt-6">
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-[var(--accent,#ec4899)] bg-[var(--accent-light,#fdf2f8)] p-6 sm:flex-row sm:items-center sm:p-7">
            <div className="text-[40px] leading-none">📘</div>
            <div className="flex-1">
              <div className="text-[12px] font-extrabold uppercase tracking-[2px] text-[var(--accent,#ec4899)]">참여자·신청자 전원 제공</div>
              <div className="mt-1 text-[19px] font-black leading-snug sm:text-[22px]">「50개국 글로벌 진출 전략」 E-book</div>
              <div className="mt-1 text-[13.5px] text-[var(--muted,#64748b)]">세미나 종료 후, 참석 여부와 무관하게 <b className="text-[var(--fg,#2d3748)]">신청자 전원</b>에게 발송됩니다.</div>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--accent,#ec4899)] px-4 py-2 text-[13px] font-extrabold text-white">전원 무료 제공</span>
          </div>
        </section>

        {/* 글로벌 리치 — 이미지 배경 배너 */}
        <section className="mt-20">
          <div className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-16 text-white sm:px-12 sm:py-24">
            {/* 배경 이미지 자리 (실제 이미지 제공 시 여기에 배치) + 그라데이션/도트 패턴 */}
            <div className="pointer-events-none absolute inset-0 opacity-90" style={{ background: "radial-gradient(120% 120% at 80% 0%, rgba(236,72,153,.35), transparent 55%), radial-gradient(120% 120% at 0% 100%, rgba(14,165,233,.30), transparent 55%)" }} />
            <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.8) 1px, transparent 1.4px)", backgroundSize: "22px 22px" }} />
            <div className="relative max-w-[720px]">
              <div className="text-[12px] font-extrabold uppercase tracking-[4px] text-pink-300">Global Reach</div>
              <h2 className="mt-3 text-[30px] font-black leading-[1.15] tracking-tight sm:text-[44px]">우리 브랜드를 <span className="bg-gradient-to-r from-pink-300 to-orange-200 bg-clip-text text-transparent">전 세계 틱톡 피드</span>로</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-slate-300 sm:text-[17px]">미국·동남아·중동·일본까지 — 현지 크리에이터와 퍼포먼스 광고로 글로벌 매출을 만드는 실전 전략을 한자리에서.</p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5"><TikTokMark className="text-[16px]" /> <span className="text-[12px] font-bold text-slate-500">Shop</span></span>
                <span className="inline-flex items-center rounded-lg bg-white px-3 py-2"><AmazonMark className="text-[16px]" /></span>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {REGIONS.map(([f, n]) => (
                  <span key={n} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[13px] font-semibold text-slate-100"><span>{f}</span>{n}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 프로그램 */}
        <section id="program" className="mt-20 scroll-mt-8">
          <div className="text-[12px] font-extrabold uppercase tracking-[3px] text-sky-600">Program</div>
          <h2 className="mt-2 text-[28px] font-black tracking-tight sm:text-[36px]">세션 프로그램</h2>
          <p className="mt-2 text-[14px] text-[var(--muted,#64748b)]">현장 발표 순서·시간은 사정에 따라 변동될 수 있습니다.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {SESSIONS.map((s, i) => (
              <div key={i} className="group flex items-start gap-4 rounded-2xl border border-[var(--border,#e2e8f0)] bg-white p-5 transition hover:border-[var(--accent,#ec4899)] hover:shadow-md">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--accent,#ec4899)] to-orange-400 text-[15px] font-black text-white">{i + 1}</div>
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-[var(--accent,#ec4899)]">{s.org}</div>
                  <div className="mt-0.5 text-[15px] font-semibold leading-snug">{s.title}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 행사장 갤러리 */}
        <section className="mt-20">
          <div className="text-[12px] font-extrabold uppercase tracking-[3px] text-sky-600">Venue</div>
          <h2 className="mt-2 text-[28px] font-black tracking-tight sm:text-[36px]">프리미엄 행사장</h2>
          <p className="mt-2 text-[14px] text-[var(--muted,#64748b)]">테헤란로 섬유센터 17층 — 스카이 라운지와 세미나홀.</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {GALLERY.map((g) => (
              <figure key={g.src} className="group overflow-hidden rounded-2xl ring-1 ring-[var(--border,#e2e8f0)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.src} alt={g.cap} className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" />
                <figcaption className="bg-white px-4 py-3 text-[13px] font-semibold">{g.cap}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* 오시는 길 */}
        <section className="mt-20">
          <div className="text-[12px] font-extrabold uppercase tracking-[3px] text-sky-600">Location</div>
          <h2 className="mt-2 text-[28px] font-black tracking-tight sm:text-[36px]">오시는 길</h2>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border,#e2e8f0)] bg-white p-6">
              <div className="text-[16px] font-extrabold">섬유센터 (한국섬유산업연합회) 17층</div>
              <div className="mt-1 text-[14px] text-[var(--muted,#64748b)]">{ADDRESS}</div>
              <div className="mt-4 space-y-3 text-[14px] leading-relaxed">
                <div className="flex gap-2"><span className="shrink-0 font-bold text-[var(--accent,#ec4899)]">🚇 지하철</span><span>2호선 <b>삼성역</b> 하차 후 도보 약 5분 (테헤란로 방면). 인접역: 2호선 선릉역.</span></div>
                <div className="flex gap-2"><span className="shrink-0 font-bold text-[var(--accent,#ec4899)]">🚌 버스</span><span>‘섬유센터·무역센터’ 인근 정류장 하차 (간선·지선 다수 경유).</span></div>
                <div className="flex gap-2"><span className="shrink-0 font-bold text-[var(--accent,#ec4899)]">🚗 자가용</span><span>건물 내 지하주차장 이용(유료). 당일 혼잡이 예상되니 대중교통을 권장합니다.</span></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {MAPS.map((m) => (
                  <a key={m.label} href={m.url} target="_blank" rel="noopener noreferrer"
                    className="rounded-full border border-[var(--border,#e2e8f0)] px-4 py-2 text-[12.5px] font-semibold hover:border-[var(--accent,#ec4899)]">{m.label} ↗</a>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] text-[var(--muted,#64748b)]">* 정확한 도보 경로·출구는 지도 앱에서 최종 확인해 주세요.</p>
            </div>
            <div className="grid place-items-center rounded-2xl bg-gradient-to-br from-[var(--accent-light,#fdf2f8)] to-white p-6 text-center ring-1 ring-[var(--border,#e2e8f0)]">
              <div>
                <div className="text-[13px] font-bold text-[var(--muted,#64748b)]">문의</div>
                <a href={`mailto:${CONTACT}`} className="mt-1 block text-[18px] font-extrabold text-[var(--accent,#ec4899)]">{CONTACT}</a>
                <div className="mt-5 text-[13px] text-[var(--muted,#64748b)]">등록·프로그램·현장 안내</div>
                <div className="mt-4"><Apply /></div>
              </div>
            </div>
          </div>
        </section>

        {/* 최종 CTA */}
        <section className="relative mt-20 overflow-hidden rounded-3xl bg-slate-950 px-6 py-14 text-center text-white sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent,#ec4899)] opacity-30 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sky-500 opacity-25 blur-[90px]" />
          <div className="relative">
            <div className="text-[12px] font-extrabold uppercase tracking-[3px] text-pink-300">Register Now</div>
            <h2 className="mt-3 text-[28px] font-black leading-tight tracking-tight sm:text-[40px]">지금 사전 등록하세요</h2>
            <p className="mx-auto mt-4 max-w-[600px] text-[15px] leading-relaxed text-slate-300">참여자·신청자 <b className="text-white">전원</b>에게 세미나 종료 후 <b className="text-white">「50개국 글로벌 진출 전략」 E-book</b>을 드립니다. 지금 온라인 신청서로 등록해 주세요.</p>
            <div className="mt-7"><Apply big /></div>
            <p className="mt-4 text-[12px] text-slate-500">신청은 외부 온라인 신청서(Google Forms)로 접수됩니다.</p>
          </div>
        </section>
      </div>

      {/* ── 하단 로고/주최 밴드 ── */}
      <footer className="border-t border-[var(--border,#e2e8f0)] bg-slate-50">
        <div className="mx-auto max-w-[1180px] px-5 py-12 sm:px-8">
          <div className="text-center text-[12px] font-bold uppercase tracking-[3px] text-[var(--muted,#64748b)]">주관 · 협력</div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-7">
            {/* 디노스튜디오 — 로고 이미지 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bhseminar/logo-dino.png" alt="DINO STUDIO" className="h-11 w-auto object-contain" />
            {/* 전경련 바이오 CEO Club — 텍스트 */}
            <span className="text-[15px] font-bold text-slate-700">전경련 바이오 CEO Club</span>
            {/* SF Express — 로고 이미지 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bhseminar/logo-sf.png" alt="SF Express" className="h-8 w-auto object-contain" />
            {/* pingpong — 로고 이미지 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bhseminar/logo-pingpong.svg" alt="pingpong" className="h-7 w-auto object-contain" />
            {/* TikTok — SVG 마크 */}
            <TikTokMark className="text-[22px]" />
            {/* Amazon — SVG 마크 */}
            <AmazonMark className="text-[22px] pb-1" />
            {/* 슈크란코리아 — 로고 재현(주황 SHUKRAN + 회색 KOREA) */}
            <ShukranMark className="text-[22px]" />
          </div>

          {/* 파트너 밴드 */}
          <div className="mt-12 border-t border-[var(--border,#e2e8f0)] pt-10">
            <div className="text-center text-[12px] font-bold uppercase tracking-[3px] text-[var(--muted,#64748b)]">Partners · 파트너</div>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-7">
              {PARTNER_MARKS.map((p) => (
                <span key={p.key} className="inline-flex items-center">{p.node}</span>
              ))}
            </div>
          </div>

          <div className="mt-11 text-center text-[12px] text-[var(--muted,#64748b)]">
            문의 <a href={`mailto:${CONTACT}`} className="font-semibold text-[var(--accent,#ec4899)]">{CONTACT}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

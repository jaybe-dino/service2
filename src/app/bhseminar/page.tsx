import type { Metadata } from "next";

const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSc0iBKMgKNebPt4iz1Vq3t2sqG_3K83w8I3H_7a2fSqc8iWOQ/viewform";
const ADDRESS = "서울 강남구 테헤란로 518 섬유센터 17층";
const CONTACT = "dino_glovek@dinostudio.kr";

export const metadata: Metadata = {
  title: "뷰티 & 헬스케어 글로벌 진출 원스톱 전략 세미나 | 2026",
  description: "2026.9.8(화) 13:30–18:00 · 서울 섬유센터. 글로벌 TikTok Shop/Amazon 구축·운영·물류·정산·인증까지 한 번에. 사전 등록·심사제 200명.",
  openGraph: {
    title: "뷰티 & 헬스케어 글로벌 진출 원스톱 전략 세미나",
    description: "글로벌 TikTok Shop/Amazon — 구축·운영·물류·정산·인증까지. 2026.9.8 서울 섬유센터.",
    type: "website",
  },
};

const FACTS: { icon: string; label: string; value: React.ReactNode }[] = [
  { icon: "🗓", label: "일시", value: <>2026년 9월 8일(화)<br />13:30 – 18:00</> },
  { icon: "📍", label: "장소", value: <>{ADDRESS}</> },
  { icon: "👥", label: "대상 · 규모", value: <>뷰티·헬스케어 브랜드/제조사<br />대표·실무자 <b>200명</b> (사전 등록·심사제)</> },
  { icon: "🎁", label: "참가 혜택", value: <>「글로벌 진출」 E-book 증정<br />1:1 진출 상담 · 현장 온보딩 혜택</> },
];

const SESSIONS: { org: string; title: string }[] = [
  { org: "디노스튜디오", title: "왜 지금 글로벌 TikTok Shop인가 — 마케팅 전략 가이드" },
  { org: "디노스튜디오", title: "한국법인으로 글로벌 틱톡샵 오픈 A to Z — 입점·구축·운영·마케팅" },
  { org: "SF Express", title: "해외에서 잘 팔리기 시작하면, 물류는 어떻게 달라져야 할까?" },
  { org: "슈크란코리아", title: "사우디·UAE 진출, 가장 빠른 길 — 등록부터 유통까지 한 번에" },
  { org: "핑퐁페이먼트", title: "틱톡샵 글로벌 결제 시스템 효율 전략" },
  { org: "전경련 바이오 CEO Club", title: "기업 소개 등" },
];

const HOSTS = ["디노스튜디오", "SF Express Korea", "전경련 BIO club"];
const PARTNERS = ["TikTok", "핑퐁페이먼트(PingPong)", "슈크란코리아"];

const MAPS = [
  { label: "네이버 지도", url: "https://map.naver.com/p/search/" + encodeURIComponent("섬유센터 테헤란로 518") },
  { label: "카카오맵", url: "https://map.kakao.com/?q=" + encodeURIComponent("테헤란로 518 섬유센터") },
  { label: "구글 지도", url: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("서울 강남구 테헤란로 518 섬유센터") },
];

function Apply({ big }: { big?: boolean }) {
  return (
    <a href={FORM_URL} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full bg-[var(--accent,#ec4899)] font-extrabold text-white transition hover:opacity-90 ${big ? "px-8 py-4 text-[16px]" : "px-6 py-3 text-[14px]"}`}>
      참가 신청하기 <span aria-hidden>→</span>
    </a>
  );
}

export default function BhSeminarPage() {
  return (
    <div className="min-h-screen bg-[var(--bg,#fff)] text-[var(--fg,#2d3748)]">
      {/* 히어로 */}
      <header className="relative overflow-hidden border-b border-[var(--border,#e2e8f0)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-[var(--accent,#ec4899)] opacity-[0.10] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-16 h-72 w-72 rounded-full bg-sky-400 opacity-[0.10] blur-3xl" />
        <div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 sm:py-24">
          <div className="text-[12px] font-extrabold uppercase tracking-[5px] text-[var(--accent,#ec4899)]">Offline Seminar · 2026</div>
          <h1 className="mt-4 text-[32px] font-black leading-[1.15] tracking-tight sm:text-[52px]">
            뷰티 &amp; 헬스케어<br /><span className="text-[var(--accent,#ec4899)]">글로벌 진출</span> 원스톱 전략 세미나
          </h1>
          <p className="mt-5 max-w-[720px] text-[16px] leading-relaxed text-[var(--muted,#64748b)] sm:text-[19px]">
            글로벌 TikTok Shop / Amazon — <b className="text-[var(--fg,#2d3748)]">구축·운영·물류·정산·인증</b>까지 한 번에.
            지금 해외로 나가려는 브랜드·제조사를 위한 실무 전략 세미나입니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            {["2026.9.8(화) 13:30", "서울 섬유센터 17층", "선착순 200명", "사전 등록·심사제"].map((c) => (
              <span key={c} className="rounded-full border border-[var(--border,#e2e8f0)] bg-white px-4 py-1.5 text-[12.5px] text-[var(--muted,#64748b)]">{c}</span>
            ))}
          </div>
          <div className="mt-8"><Apply big /></div>
        </div>
      </header>

      <div className="mx-auto max-w-[1120px] px-5 py-14 sm:px-8">
        {/* 핵심 정보 */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.label} className="rounded-2xl border border-[var(--border,#e2e8f0)] bg-white p-5">
              <div className="text-[22px]">{f.icon}</div>
              <div className="mt-2 text-[12px] font-bold text-[var(--accent,#ec4899)]">{f.label}</div>
              <div className="mt-1 text-[14px] leading-relaxed">{f.value}</div>
            </div>
          ))}
        </section>

        {/* 프로그램 */}
        <section className="mt-16">
          <div className="text-[12px] font-extrabold uppercase tracking-[3px] text-sky-600">Program</div>
          <h2 className="mt-2 text-[26px] font-black tracking-tight sm:text-[32px]">세션 프로그램</h2>
          <p className="mt-2 text-[14px] text-[var(--muted,#64748b)]">현장 발표 순서·시간은 사정에 따라 변동될 수 있습니다.</p>
          <div className="mt-6 space-y-3">
            {SESSIONS.map((s, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl border border-[var(--border,#e2e8f0)] bg-white p-5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--accent,#ec4899)] text-[13px] font-black text-white">{i + 1}</div>
                <div className="min-w-0">
                  <div className="text-[12px] font-bold text-[var(--accent,#ec4899)]">{s.org}</div>
                  <div className="mt-0.5 text-[15px] font-semibold leading-snug">{s.title}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 주관·협력 */}
        <section className="mt-16 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border,#e2e8f0)] bg-slate-50/70 p-6">
            <div className="text-[12px] font-bold text-[var(--muted,#64748b)]">주관</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {HOSTS.map((h) => <span key={h} className="rounded-lg bg-white px-3 py-1.5 text-[13px] font-semibold ring-1 ring-[var(--border,#e2e8f0)]">{h}</span>)}
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border,#e2e8f0)] bg-slate-50/70 p-6">
            <div className="text-[12px] font-bold text-[var(--muted,#64748b)]">협력</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PARTNERS.map((h) => <span key={h} className="rounded-lg bg-white px-3 py-1.5 text-[13px] font-semibold ring-1 ring-[var(--border,#e2e8f0)]">{h}</span>)}
            </div>
          </div>
        </section>

        {/* 오시는 길 */}
        <section className="mt-16">
          <div className="text-[12px] font-extrabold uppercase tracking-[3px] text-sky-600">Location</div>
          <h2 className="mt-2 text-[26px] font-black tracking-tight sm:text-[32px]">오시는 길</h2>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border,#e2e8f0)] bg-white p-6">
              <div className="text-[16px] font-extrabold">섬유센터 (한국섬유산업연합회) 17층</div>
              <div className="mt-1 text-[14px] text-[var(--muted,#64748b)]">{ADDRESS}</div>
              <div className="mt-4 space-y-3 text-[14px] leading-relaxed">
                <div className="flex gap-2"><span className="shrink-0 font-bold text-[var(--accent,#ec4899)]">🚇 지하철</span><span>2호선 <b>삼성역</b> 하차 후 도보 약 5분 (테헤란로 방면). 인접역: 2호선 선릉역.</span></div>
                <div className="flex gap-2"><span className="shrink-0 font-bold text-[var(--accent,#ec4899)]">🚌 버스</span><span>‘섬유센터·무역센터’ 인근 정류장 하차 (간선·지선 다수 경유).</span></div>
                <div className="flex gap-2"><span className="shrink-0 font-bold text-[var(--accent,#ec4899)]">🚗 자가용</span><span>건물 내 지하주차장 이용(유료). 행사 당일 주차 혼잡이 예상되니 대중교통을 권장합니다.</span></div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {MAPS.map((m) => (
                  <a key={m.label} href={m.url} target="_blank" rel="noopener noreferrer"
                    className="rounded-full border border-[var(--border,#e2e8f0)] px-4 py-2 text-[12.5px] font-semibold hover:border-[var(--accent,#ec4899)]">{m.label} 열기 ↗</a>
                ))}
              </div>
              <p className="mt-3 text-[11.5px] text-[var(--muted,#64748b)]">* 정확한 도보 경로·출구는 지도 앱에서 최종 확인해 주세요.</p>
            </div>
            <div className="grid place-items-center rounded-2xl border border-[var(--border,#e2e8f0)] bg-gradient-to-br from-[var(--accent-light,#fdf2f8)] to-white p-6 text-center">
              <div>
                <div className="text-[13px] font-bold text-[var(--muted,#64748b)]">문의</div>
                <a href={`mailto:${CONTACT}`} className="mt-1 block text-[18px] font-extrabold text-[var(--accent,#ec4899)]">{CONTACT}</a>
                <div className="mt-5 text-[13px] text-[var(--muted,#64748b)]">등록·프로그램·현장 안내 문의</div>
                <div className="mt-4"><Apply /></div>
              </div>
            </div>
          </div>
        </section>

        {/* 최종 CTA */}
        <section className="mt-16 rounded-3xl bg-slate-900 px-6 py-12 text-center text-white sm:px-10 sm:py-16">
          <div className="text-[12px] font-extrabold uppercase tracking-[3px] text-[var(--accent,#ec4899)]">Register Now</div>
          <h2 className="mt-3 text-[26px] font-black leading-tight tracking-tight sm:text-[36px]">선착순 200명 · 사전 등록·심사제</h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[15px] leading-relaxed text-slate-300">
            좌석이 한정되어 조기 마감될 수 있습니다. 지금 온라인 신청서로 등록해 주세요.
          </p>
          <div className="mt-7"><Apply big /></div>
          <p className="mt-4 text-[12px] text-slate-500">신청은 외부 온라인 신청서(Google Forms)로 접수됩니다.</p>
        </section>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/ktrend/SiteHeader";
import SiteFooter from "@/components/ktrend/SiteFooter";
import {
  REFER_LOGOS, SIZE_ORDER, SIZE_LABEL, REFER_TIKTOK, REFER_YOUTUBE, REFER_YT_THUMBS, REFER_REEL,
  type LogoSize,
} from "@/data/refer";

export const metadata: Metadata = {
  title: "브랜드 협업 레퍼런스 — 디노스튜디오",
  description: "디노스튜디오가 함께한 브랜드 협업 · 글로벌 TikTok Shop 온보딩 · YouTube 콘텐츠 레퍼런스.",
  alternates: { canonical: "/refer" },
};

// 흰/밝은 로고(투명 배경)는 어두운 타일에 올려 가독성 확보
const DARK_BG = new Set(["3M", "SAMWHA", "안나어드바이스랩"]);
// 배경이 박힌(투명 아님) 로고는 연회색 타일로 감싸 회색 박스 이질감 완화
const SOFT_BG = new Set(["닥터노바메디"]);

function LogoTile({ brand, logo, isCompany }: { brand: string; logo: string; isCompany: boolean }) {
  const dark = DARK_BG.has(brand);
  const soft = SOFT_BG.has(brand);
  const tile = dark ? "border-slate-700 bg-slate-800" : soft ? "border-slate-200 bg-slate-100" : "border-[var(--border)] bg-white";
  return (
    <div className={`group relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-xl border p-4 transition hover:shadow-md ${tile}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt={brand} className={`object-contain ${soft ? "max-h-[86%] max-w-[94%]" : "max-h-[68%] max-w-[86%]"}`} loading="lazy" />
      {isCompany && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 px-1.5 py-0.5 text-[8px] font-bold text-white">회사</span>
      )}
      <span className={`absolute bottom-1.5 left-0 right-0 truncate px-2 text-center text-[9px] ${dark ? "text-slate-400" : "text-slate-400"}`}>{brand}</span>
    </div>
  );
}

function Section({ id, kicker, title, desc, children }: { id?: string; kicker: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-[1180px] scroll-mt-8 px-5 py-14 sm:px-8 sm:py-20">
      <div className="text-[11px] font-extrabold uppercase tracking-[3px] text-[var(--accent)]">{kicker}</div>
      <h2 className="mt-2 text-[26px] font-black tracking-tight sm:text-[34px]">{title}</h2>
      {desc && <p className="mt-2 max-w-[760px] text-[14px] leading-relaxed text-[var(--muted)]">{desc}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default function ReferPage() {
  // 규모별 그룹 (미확인·확인필요는 소형에 편입하지 않고 별도 유지)
  const bySize = SIZE_ORDER
    .map((s) => ({ size: s, items: REFER_LOGOS.filter((l) => l.size === s) }))
    .filter((g) => g.items.length > 0);

  const marketOf = (m: string) => (m && m !== "미확인" ? m : null);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <SiteHeader />

      {/* 히어로 */}
      <header className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[var(--accent)] opacity-[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-24 h-72 w-72 rounded-full bg-sky-400 opacity-[0.08] blur-3xl" />
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-24">
          <div className="text-[12px] font-extrabold tracking-[4px] text-sky-600">DINO STUDIO · REFERENCE</div>
          <h1 className="mt-3 max-w-[880px] text-[34px] font-black leading-[1.12] tracking-tight sm:text-[50px]">
            브랜드와 함께 만든<br /><span className="text-[var(--accent)]">글로벌 콘텐츠 · 커머스</span> 레퍼런스
          </h1>
          <p className="mt-4 max-w-[720px] text-[15px] leading-relaxed text-[var(--muted)] sm:text-[17px]">
            대기업부터 성장 브랜드까지 — 디노스튜디오가 함께한 브랜드 협업, 글로벌 TikTok Shop 온보딩, YouTube 콘텐츠 작업을 소개합니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {[["#logos", "브랜드 로고"], ["#tiktok", "TikTok Shop"], ["#youtube", "YouTube 콘텐츠"], ["#global", "글로벌 사례"]].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">{label}</a>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-[13px] text-[var(--muted)]">
            <div><b className="text-[22px] font-black text-[var(--fg)]">{REFER_LOGOS.length}</b> 협업 브랜드</div>
            <div><b className="text-[22px] font-black text-[var(--fg)]">{REFER_TIKTOK.length}</b> TikTok Shop 업무</div>
            <div><b className="text-[22px] font-black text-[var(--fg)]">{REFER_YOUTUBE.length}</b> YouTube 콘텐츠 유형</div>
          </div>
        </div>
      </header>

      {/* 브랜드 로고 그리드 */}
      <Section id="logos" kicker="Clients" title="함께한 브랜드"
        desc="2024 회사소개서 클라이언트 표기 및 협업 이력 기준. 규모 분류는 진열용 잠정값이며, 확인 중인 브랜드는 별도로 표시합니다.">
        <div className="space-y-10">
          {bySize.map((g) => (
            <div key={g.size}>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[13px] font-black">{SIZE_LABEL[g.size as LogoSize]}</span>
                <span className="text-[11px] text-[var(--muted)]">{g.items.length}</span>
                {(g.size === "미확인" || g.size === "확인필요") && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">분류 확인 중</span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {g.items.map((l) => <LogoTile key={l.brand} brand={l.brand} logo={l.logo} isCompany={l.isCompany} />)}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[11px] text-slate-400">※ &lsquo;회사&rsquo; 표기는 제품 브랜드가 아닌 회사(법인) 로고입니다. 규모 분류는 잠정이며 개별 캠페인 기준과 다를 수 있습니다.</p>
      </Section>

      {/* TikTok Shop */}
      <div className="border-y border-[var(--border)] bg-slate-50/60">
        <Section id="tiktok" kicker="TikTok Shop" title="글로벌 TikTok Shop 온보딩"
          desc="브랜드별 진출 국가와 확인된 수행 범위(온보딩·샵 개설·운영)를 정리했습니다. 일반 YouTube 콘텐츠 작업과는 별개 영역입니다.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REFER_TIKTOK.map((t) => (
              <div key={t.brand} className="flex gap-3 rounded-xl border border-[var(--border)] bg-white p-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border p-1.5 ${DARK_BG.has(t.brand.split(" ")[0]) || /안나어드바이스랩/.test(t.brand) ? "border-slate-700 bg-slate-800" : /닥터노바메디/.test(t.brand) ? "border-slate-200 bg-slate-100" : "border-[var(--border)] bg-white"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {t.logo ? <img src={t.logo} alt={t.brand} className="max-h-full max-w-full object-contain" loading="lazy" /> : <span className="text-[9px] text-slate-300">—</span>}
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold leading-tight">{t.brand}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {marketOf(t.market) && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">{t.market}</span>}
                  </div>
                  <div className="mt-1.5 text-[11.5px] leading-snug text-[var(--muted)]">{t.scope}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[11px] text-slate-400">※ 위 항목은 <b>업무 조사 기준</b>이며, 청구·계약 요청이 곧 판매 실적이나 완료를 의미하지 않습니다. 세부 범위는 브랜드별로 확인 중입니다.</p>
        </Section>
      </div>

      {/* YouTube */}
      <Section id="youtube" kicker="YouTube" title="YouTube 콘텐츠 작업"
        desc="PPL·시딩부터 브랜디드·롱폼, 쇼츠, 공동구매까지 유형별로 함께한 브랜드를 정리했습니다.">
        <div className="grid gap-3 sm:grid-cols-2">
          {REFER_YOUTUBE.map((c) => (
            <div key={c.category} className="rounded-xl border border-[var(--border)] bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-black">{c.category}</span>
                <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent)]">{c.brands.length} 브랜드</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {c.brands.map((b) => (
                  <span key={b} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{b}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 콘텐츠 썸네일 */}
        <div className="mt-8">
          <div className="mb-3 text-[13px] font-bold">콘텐츠 예시</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {REFER_YT_THUMBS.map((src, i) => (
              <div key={i} className="overflow-hidden rounded-xl border border-[var(--border)] bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`YouTube 콘텐츠 예시 ${i + 1}`} className="aspect-video w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-400">※ 실제 작업 콘텐츠 화면입니다. 조회수·영상 링크는 확인된 자료만 추후 연결됩니다.</p>
        </div>
      </Section>

      {/* 글로벌 콘텐츠 사례 */}
      <div className="border-t border-[var(--border)] bg-slate-900 text-white">
        <Section id="global" kicker="Global" title="글로벌 콘텐츠 사례"
          desc="해외에서 확산된 콘텐츠 사례입니다.">
          <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold">Instagram Reel</span>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/70">@{REFER_REEL.account}</span>
                <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-1 text-[11px] font-bold text-amber-200">Credit · {REFER_REEL.credit}</span>
              </div>
              <p className="mt-3 text-[14px] leading-relaxed text-white/80">
                글로벌 채널에서 확산된 콘텐츠 사례입니다. 원문 제작 크레딧(<b className="text-white">{REFER_REEL.credit}</b>)을 그대로 유지해 소개하며,
                디노스튜디오의 세부 수행 역할은 확인 후 업데이트됩니다.
              </p>
              {REFER_REEL.role && <p className="mt-2 text-[13px] font-semibold text-amber-200">수행 역할: {REFER_REEL.role}</p>}
            </div>
            <a href={REFER_REEL.url} target="_blank" rel="noreferrer noopener"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-[13px] font-black text-slate-900 transition hover:bg-white/90">
              릴 보기 →
            </a>
          </div>
        </Section>
      </div>

      {/* 하단 CTA — 요구사항 6: 문구 "틱톡콘텐츠 보기", href="/" */}
      <section className="border-t border-[var(--border)] bg-gradient-to-br from-[#fdf2f8] to-white">
        <div className="mx-auto max-w-[1180px] px-5 py-20 text-center sm:px-8">
          <h2 className="text-[24px] font-black tracking-tight sm:text-[32px]">브랜드의 다음 글로벌 콘텐츠, 함께 만듭니다</h2>
          <p className="mx-auto mt-3 max-w-[560px] text-[14px] text-[var(--muted)]">틱톡샵 온보딩부터 콘텐츠 제작까지 — 디노스튜디오의 작업을 확인해 보세요.</p>
          <Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-8 py-4 text-[16px] font-black text-white shadow-lg transition hover:bg-[var(--accent-deep)]">
            틱톡콘텐츠 보기 →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

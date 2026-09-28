import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/ktrend/SiteHeader";
import SiteFooter from "@/components/ktrend/SiteFooter";
import {
  REFER_LOGOS, SIZE_ORDER, SIZE_LABEL, REFER_TIKTOK, REFER_CASES,
  type LogoSize,
} from "@/data/refer";

export const metadata: Metadata = {
  title: "브랜드 협업 레퍼런스 — 디노스튜디오",
  description: "유한양행·클리오·LG생활건강 등 대기업이 함께한 디노스튜디오의 글로벌 TikTok Shop 입점·운영·셀링 콘텐츠 레퍼런스.",
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
          <div className="text-[12px] font-extrabold tracking-[4px] text-sky-600">DINO STUDIO · TIKTOK SHOP</div>
          <h1 className="mt-3 max-w-[900px] text-[34px] font-black leading-[1.12] tracking-tight sm:text-[50px]">
            대기업이 먼저 선택한<br /><span className="text-[var(--accent)]">글로벌 틱톡샵</span> 파트너
          </h1>
          <p className="mt-4 max-w-[740px] text-[15px] leading-relaxed text-[var(--muted)] sm:text-[17px]">
            유한양행·클리오·LG생활건강·CJ제일제당·애경·농협·3M — 이미 검증된 브랜드들과 글로벌 TikTok Shop 입점·운영·콘텐츠를 함께해 왔습니다.
            디노스튜디오는 브랜드의 상황에 맞춰 진출 국가·샵 개설·운영까지 설계합니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {[["#logos", "함께한 브랜드"], ["#tiktok", "TikTok Shop 실적"], ["#content", "콘텐츠 레퍼런스"]].map(([href, label]) => (
              <a key={href} href={href} className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">{label}</a>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-x-10 gap-y-4 text-[13px] text-[var(--muted)]">
            <div><b className="text-[24px] font-black text-[var(--fg)]">{REFER_LOGOS.length}+</b> 협업 브랜드</div>
            <div><b className="text-[24px] font-black text-[var(--fg)]">{REFER_TIKTOK.length}</b> TikTok Shop 프로젝트</div>
            <div><b className="text-[24px] font-black text-[var(--fg)]">4</b>개국 <span className="text-[11px]">(미국·태국·베트남·싱가포르)</span> 진출 지원</div>
          </div>
        </div>
      </header>

      {/* 브랜드 로고 그리드 */}
      <Section id="logos" kicker="Clients" title="이미 검증된 브랜드들이 함께합니다"
        desc="제약·뷰티·식품·유통 대기업부터 성장 브랜드까지 — 디노스튜디오와 협업한 브랜드들입니다. 규모 분류는 진열용 잠정값이며, 확인 중인 브랜드는 별도 표시합니다.">
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
        <Section id="tiktok" kicker="TikTok Shop" title="글로벌 TikTok Shop 입점·운영 실적"
          desc="브랜드별 진출 국가와 확인된 수행 범위(온보딩·샵 개설·운영)입니다. 미국·동남아 현지 입점부터 샵 개설·상품 등록·GMV 연결까지 실제로 진행하고 있습니다.">
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

      {/* 콘텐츠 레퍼런스 (틱톡샵 중심) */}
      <div className="border-t border-[var(--border)] bg-slate-900 text-white">
        <Section id="content" kicker="Content" title="글로벌 셀링 콘텐츠 레퍼런스"
          desc="현지 크리에이터를 활용한 글로벌 틱톡샵 셀링 콘텐츠 사례입니다. 미국 등 해외 시장에서 K-뷰티·헬스 제품을 소개하는 실제 콘텐츠입니다.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {REFER_CASES.map((c, i) => (
              <div key={i} className="group relative block overflow-hidden rounded-xl border border-white/10 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt={c.caption || `글로벌 셀링 콘텐츠 사례 ${i + 1}`} loading="lazy"
                  className="aspect-[9/16] w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-2.5">
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-200/90">{c.credit}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-white/40">※ 콘텐츠에 표기된 제작 크레딧을 유지한 중립 소개입니다. 세부 수행 역할은 계약·확인 기준에 따릅니다.</p>
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

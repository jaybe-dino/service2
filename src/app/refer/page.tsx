import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/ktrend/SiteHeader";
import SiteFooter from "@/components/ktrend/SiteFooter";
import {
  REFER_LOGOS, SIZE_ORDER, REFER_TIKTOK, REFER_CASES, REFER_UGC, REFER_UGC_HERO,
  type LogoSize, type ReferUgc,
} from "@/data/refer";
import { sql, isConfigured as dbConfigured } from "@/lib/db";
import ReferFeed, { type FeedItem } from "@/components/ktrend/ReferFeed";
import ReferUGC, { UgcCard } from "@/components/ktrend/ReferUGC";

export const metadata: Metadata = {
  title: "브랜드 협업 레퍼런스 — 디노스튜디오",
  description: "브랜드의 진출 시장·제품에 맞춘 크리에이터 콘텐츠와 TikTok Shop 입점·운영을 연결합니다. 실제 협업 브랜드와 UGC 작업물을 확인해 보세요.",
  alternates: { canonical: "/refer" },
};

// 시장 참고 피드를 요청마다 랜덤 표시(최신 영상 풀에서 무작위) — 캐시로 고정되지 않게.
export const dynamic = "force-dynamic";

// glovek이 수집한 시장 콘텐츠(videos) — 최신 풀을 서버에서 셔플 후 ~24개 노출. 자체 제작 실적이 아닌 '시장 참고'.
async function loadMarketFeed(): Promise<FeedItem[]> {
  if (!dbConfigured()) return [];
  try {
    const { rows } = await sql<{ handle: string; brand_name: string | null; views: number; url: string | null; cover_url: string; is_shop: boolean }>`
      SELECT handle, brand_name, views, url, cover_url, is_shop
        FROM videos
       WHERE cover_url IS NOT NULL AND handle IS NOT NULL
       ORDER BY is_shop DESC NULLS LAST, posted_at DESC NULLS LAST
       LIMIT 300`;
    const pool: FeedItem[] = rows.map((r) => ({
      handle: r.handle, brand: r.brand_name, views: Number(r.views) || 0,
      url: r.url || `https://www.tiktok.com/@${r.handle}`, cover: r.cover_url, isShop: !!r.is_shop,
    }));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, 24);
  } catch { return []; }
}

// 배경이 박힌(투명 아님) 로고는 연회색 타일로 감싸 회색 박스 이질감 완화
const SOFT_BG = new Set(["닥터노바메디"]);
// 흰색 단색 원본 로고 — 밝은 타일에서 보이도록 단색(검정)으로 렌더
const INVERT_LOGO = new Set(["톤28"]);

function LogoTile({ brand, logo, isCompany }: { brand: string; logo: string; isCompany: boolean }) {
  // 공식 로고 자산이 없는 브랜드(logo === "")는 가짜 이미지 대신 브랜드명을 텍스트로 정직하게 표기.
  if (!logo) {
    return (
      <div className="group relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--border)] bg-slate-50 p-3 text-center">
        <span className="text-[13px] font-extrabold tracking-tight text-slate-600">{brand}</span>
        {isCompany && <span className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 px-1.5 py-0.5 text-[8px] font-bold text-white">회사</span>}
      </div>
    );
  }
  const soft = SOFT_BG.has(brand);
  const invert = INVERT_LOGO.has(brand);
  const tile = soft ? "border-slate-200 bg-slate-100" : "border-[var(--border)] bg-white";
  return (
    <div className={`group relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-xl border p-4 transition hover:shadow-md ${tile}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt={brand} style={invert ? { filter: "brightness(0)" } : undefined} className={`object-contain ${soft ? "max-h-[86%] max-w-[94%]" : "max-h-[66%] max-w-[84%]"}`} loading="lazy" />
      {isCompany && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 px-1.5 py-0.5 text-[8px] font-bold text-white">회사</span>
      )}
      <span className="absolute bottom-1.5 left-0 right-0 truncate px-2 text-center text-[9px] text-slate-400">{brand}</span>
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

const STEPS: { n: string; title: string; desc: string }[] = [
  { n: "01", title: "제품·타깃 정리", desc: "브랜드의 제품 특성과 진출하려는 시장·타깃을 함께 정리합니다." },
  { n: "02", title: "콘텐츠 기획·제작", desc: "현지에서 반응하는 포맷으로 크리에이터 콘텐츠를 기획하고 제작합니다." },
  { n: "03", title: "활용·운영 방향 협의", desc: "제작한 콘텐츠의 활용과 TikTok Shop 입점·운영 방향을 협의합니다." },
];

export default async function ReferPage() {
  const rank = (s: LogoSize) => { const i = SIZE_ORDER.indexOf(s); return i < 0 ? 99 : i; };
  const sortedLogos = [...REFER_LOGOS].sort((a, b) => rank(a.size) - rank(b.size));
  // 대표(간결) 브랜드 = 규모가 확인된 대형·중형. 긴 로고 벽 대신 대표 브랜드만 상단 노출.
  const repLogos = sortedLogos.filter((l) => l.size === "대형" || l.size === "중형");

  const marketOf = (m: string) => (m && m !== "미확인" ? m : null);
  const feed = await loadMarketFeed();
  const heroUgc = REFER_UGC_HERO
    .map((id) => REFER_UGC.find((u) => u.id === id))
    .filter((u): u is ReferUgc => !!u);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <SiteHeader />

      {/* 히어로 */}
      <header className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[var(--accent)] opacity-[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-24 h-72 w-72 rounded-full bg-sky-400 opacity-[0.08] blur-3xl" />
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <div className="text-[12px] font-extrabold tracking-[4px] text-sky-600">DINO STUDIO · GLOBAL UGC × TIKTOK SHOP</div>
            <h1 className="mt-3 max-w-[640px] text-[34px] font-black leading-[1.14] tracking-tight sm:text-[48px]">
              우리 브랜드를,<br /><span className="text-[var(--accent)]">현지에서 선택받는 콘텐츠</span>로.
            </h1>
            <p className="mt-4 max-w-[600px] text-[15px] leading-relaxed text-[var(--muted)] sm:text-[16.5px]">
              진출하려는 시장과 제품 특성에 맞춘 크리에이터 콘텐츠를 만들고, TikTok Shop 입점·운영까지 연결합니다.
              아래는 실제로 작업한 레퍼런스와 함께한 브랜드들입니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <Link href="/consult1" className="rounded-2xl bg-[var(--accent)] px-6 py-3.5 text-[15px] font-black text-white shadow-lg transition hover:bg-[var(--accent-deep)]">
                우리 브랜드 협업 문의 →
              </Link>
              <a href="#ugc" className="rounded-2xl border border-[var(--border)] bg-white px-6 py-3.5 text-[15px] font-bold text-[var(--fg)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                실제 작업물 보기
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-9 gap-y-4 text-[13px] text-[var(--muted)]">
              <div><b className="text-[22px] font-black text-[var(--fg)]">{REFER_LOGOS.length}+</b> 협업 브랜드</div>
              <div><b className="text-[22px] font-black text-[var(--fg)]">{REFER_TIKTOK.length}</b> TikTok Shop 진행 브랜드</div>
              <div><b className="text-[22px] font-black text-[var(--fg)]">미국·태국·베트남</b> 진출 지원</div>
            </div>
          </div>

          {/* 실제 UGC 미리보기(원본 링크 카드) — 첫 화면에서 작업물이 보이게 */}
          <div>
            <div className="grid grid-cols-3 gap-2.5">
              {heroUgc.map((it) => <UgcCard key={it.id} item={it} />)}
            </div>
            <p className="mt-2.5 text-center text-[11px] text-slate-400">실제 레퍼런스 영상 · 카드를 누르면 원본으로 이동합니다.</p>
          </div>
        </div>
      </header>

      {/* 대표 협업 브랜드(간결) */}
      <Section id="brands" kicker="Clients" title="대표 협업 브랜드"
        desc="제약·뷰티·식품·유통 분야에서 디노스튜디오와 협업한 대표 브랜드들입니다. 전체 목록과 TikTok Shop 이력은 아래에서 볼 수 있습니다.">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {repLogos.map((l) => <LogoTile key={l.brand} brand={l.brand} logo={l.logo} isCompany={l.isCompany} />)}
        </div>
      </Section>

      {/* 실제 UGC 작업물 — 주요 섹션 */}
      <div className="border-y border-[var(--border)] bg-slate-50/70">
        <Section id="ugc" kicker="Our Work" title="실제 UGC 작업물"
          desc="협업 네트워크가 실제로 제작한 크리에이터 콘텐츠입니다. 각 카드는 실제 영상 원본으로 연결됩니다. 대표 사례를 먼저 보여드리고, 전체는 '사례 더 보기'에서 확인할 수 있습니다.">
          <ReferUGC items={REFER_UGC} />
          <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
            영상은 각 크리에이터의 원본 페이지에서 확인할 수 있습니다.
          </p>
        </Section>
      </div>

      {/* 전체 협업 브랜드 & TikTok Shop 이력 */}
      <Section id="all-brands" kicker="Network" title="전체 협업 브랜드 & TikTok Shop 이력"
        desc="디노스튜디오가 콘텐츠·입점·운영 등으로 협업한 전체 브랜드입니다. 로고는 각 브랜드의 표기를 따릅니다(모든 브랜드가 TikTok Shop 고객인 것은 아닙니다).">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {sortedLogos.map((l) => <LogoTile key={l.brand} brand={l.brand} logo={l.logo} isCompany={l.isCompany} />)}
        </div>
        <p className="mt-6 text-[11px] text-slate-400">※ &lsquo;회사&rsquo; 표기는 제품 브랜드가 아닌 회사(법인) 단위입니다.</p>

        <div className="mt-12">
          <h3 id="tiktok" className="scroll-mt-8 text-[18px] font-black tracking-tight">TikTok Shop 입점·운영 브랜드</h3>
          <p className="mt-1.5 text-[13.5px] text-[var(--muted)]">미국·동남아 등 현지 TikTok Shop 입점·운영을 함께한 브랜드들입니다.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {REFER_TIKTOK.map((t) => (
              <div key={t.brand} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border p-1.5 ${/닥터노바메디/.test(t.brand) ? "border-slate-200 bg-slate-100" : "border-[var(--border)] bg-white"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {t.logo ? <img src={t.logo} alt={t.brand} className="max-h-full max-w-full object-contain" loading="lazy" /> : <span className="text-[9px] text-slate-300">—</span>}
                </div>
                <div className="min-w-0">
                  <div className="text-[13.5px] font-bold leading-tight">{t.brand}</div>
                  {marketOf(t.market) && <span className="mt-1 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">{t.market}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 진행 방식 3단계 */}
      <div className="border-t border-[var(--border)] bg-white">
        <Section kicker="How it works" title="진행 방식"
          desc="브랜드의 상황에 맞춰 아래 흐름으로 함께 진행합니다.">
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-[var(--border)] bg-slate-50/60 p-6">
                <div className="text-[13px] font-black text-[var(--accent)]">{s.n}</div>
                <div className="mt-2 text-[17px] font-black tracking-tight">{s.title}</div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* 시장 콘텐츠 참고(자체 제작 아님) — 별도 하단 섹션, 피드는 접기/펼치기 */}
      <div className="border-t border-[var(--border)] bg-slate-100/70">
        <Section kicker="Market Reference" title="시장 콘텐츠 참고"
          desc="아래는 시장 트렌드 리서치용으로 수집한 외부·시장 콘텐츠입니다. 디노스튜디오의 자체 제작 작업물이 아니며, 위의 ‘실제 UGC 작업물’과 구분됩니다.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {REFER_CASES.map((c, i) => (
              <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                className="group relative block overflow-hidden rounded-xl border border-[var(--border)] bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt={c.caption || `시장 참고 콘텐츠 ${i + 1}`} loading="lazy"
                  className="aspect-[9/16] w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end bg-gradient-to-t from-black/70 to-transparent p-2.5">
                  <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-200/90">{c.credit}</span>
                </div>
              </a>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">※ 콘텐츠에 표기된 제작 크레딧을 유지한 중립 소개입니다(자체 제작 실적 아님).</p>

          {feed.length > 0 && (
            <details className="mt-6 rounded-2xl border border-[var(--border)] bg-white/70 p-4">
              <summary className="cursor-pointer select-none text-[13.5px] font-bold text-[var(--fg)]">
                최신 시장 틱톡 콘텐츠 더 보기 (무작위 {feed.length}개)
              </summary>
              <div className="mt-4">
                <ReferFeed items={feed} />
                <p className="mt-3 text-[11px] text-slate-500">※ glovek이 수집한 공개 틱톡 영상입니다(SHOP 뱃지 = 틱톡샵 연동). 디노스튜디오 자체 제작물이 아닙니다.</p>
              </div>
            </details>
          )}
        </Section>
      </div>

      {/* 최종 문의 CTA */}
      <section className="border-t border-[var(--border)] bg-gradient-to-br from-[#fdf2f8] to-white">
        <div className="mx-auto max-w-[1180px] px-5 py-20 text-center sm:px-8">
          <h2 className="text-[24px] font-black tracking-tight sm:text-[32px]">우리 브랜드의 다음 글로벌 콘텐츠, 함께 만듭니다</h2>
          <p className="mx-auto mt-3 max-w-[560px] text-[14px] text-[var(--muted)]">진출 시장·제품에 맞는 콘텐츠와 TikTok Shop 운영 방향을 함께 설계해 드립니다.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/consult1" className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent)] px-8 py-4 text-[16px] font-black text-white shadow-lg transition hover:bg-[var(--accent-deep)]">
              우리 브랜드 협업 문의 →
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-white px-7 py-4 text-[15px] font-bold text-[var(--fg)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
              틱톡콘텐츠 보기
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

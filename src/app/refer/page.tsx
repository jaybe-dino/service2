import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/ktrend/SiteHeader";
import SiteFooter from "@/components/ktrend/SiteFooter";
import {
  REFER_LOGOS, SIZE_ORDER, REFER_TIKTOK, REFER_CASES,
  type LogoSize,
} from "@/data/refer";
import { sql, isConfigured as dbConfigured } from "@/lib/db";
import ReferFeed, { type FeedItem } from "@/components/ktrend/ReferFeed";

export const metadata: Metadata = {
  title: "브랜드 협업 레퍼런스 — 디노스튜디오",
  description: "유한양행·클리오·LG생활건강 등 대기업이 함께한 디노스튜디오의 글로벌 TikTok Shop 입점·운영·셀링 콘텐츠 레퍼런스.",
  alternates: { canonical: "/refer" },
};

// 콘텐츠 피드를 요청마다 랜덤 표시(최신 영상 풀에서 무작위) — 캐시로 고정되지 않게.
export const dynamic = "force-dynamic";

// glovek 콘텐츠 레퍼런스(videos) — 샵(is_shop) 콘텐츠 우선 + 최신 풀을 서버에서 셔플 후 ~40개 노출.
async function loadContentFeed(): Promise<FeedItem[]> {
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
    return pool.slice(0, 40);
  } catch { return []; }
}

// 다크 타일 로고 없음(검정 배경 브랜드 제거) — 호환 위해 빈 셋 유지
const DARK_BG = new Set<string>();
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

export default async function ReferPage() {
  // 브랜드 규모 순으로 정렬해 단일 로고 월로 진열(미확정 분류 라벨은 노출하지 않음)
  const rank = (s: LogoSize) => { const i = SIZE_ORDER.indexOf(s); return i < 0 ? 99 : i; };
  const sortedLogos = [...REFER_LOGOS].sort((a, b) => rank(a.size) - rank(b.size));

  const marketOf = (m: string) => (m && m !== "미확인" ? m : null);
  const feed = await loadContentFeed();

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
            유한양행·클리오·LG생활건강·CJ제일제당·애경·농협·톤28·블리블리 — 이미 검증된 브랜드들과 글로벌 TikTok Shop 입점·운영·콘텐츠를 함께해 왔습니다.
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
        desc="제약·뷰티·식품·유통 대기업부터 성장 브랜드까지 — 디노스튜디오와 협업한 브랜드들입니다.">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {sortedLogos.map((l) => <LogoTile key={l.brand} brand={l.brand} logo={l.logo} isCompany={l.isCompany} />)}
        </div>
        <p className="mt-6 text-[11px] text-slate-400">※ &lsquo;회사&rsquo; 표기는 제품 브랜드가 아닌 회사(법인) 로고입니다.</p>
      </Section>

      {/* TikTok Shop */}
      <div className="border-y border-[var(--border)] bg-slate-50/60">
        <Section id="tiktok" kicker="TikTok Shop" title="글로벌 TikTok Shop 입점·운영 실적"
          desc="미국·동남아 등 현지 TikTok Shop 입점·운영을 함께한 브랜드들입니다.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        </Section>
      </div>

      {/* 콘텐츠 레퍼런스 (틱톡샵 중심) */}
      <div className="border-t border-[var(--border)] bg-slate-900 text-white">
        <Section id="content" kicker="Content" title="글로벌 콘텐츠 레퍼런스"
          desc="glovek이 수집·분석한 최신 글로벌 틱톡 콘텐츠 레퍼런스입니다. 새로고침할 때마다 무작위로 노출됩니다.">
          {feed.length > 0 ? (
            <>
              <ReferFeed items={feed} />
              <p className="mt-4 text-[11px] text-white/40">※ glovek 콘텐츠 레퍼런스 DB의 공개 틱톡 영상입니다(무작위 {feed.length}개, SHOP 뱃지 = 틱톡샵 연동). 썸네일 클릭 시 원본으로 이동합니다.</p>
            </>
          ) : (
            <>
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
            </>
          )}
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

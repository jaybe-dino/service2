import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/ktrend/SiteHeader";
import SiteFooter from "@/components/ktrend/SiteFooter";
import {
  REFER_LOGOS, SIZE_ORDER, REFER_TIKTOK, REFER_CURATED,
  type LogoSize,
} from "@/data/refer";
import ReferCurated from "@/components/ktrend/ReferCurated";

export const metadata: Metadata = {
  title: "브랜드 협업 레퍼런스 — 디노스튜디오",
  description: "브랜드의 진출 시장·제품에 맞춘 크리에이터 콘텐츠와 TikTok Shop 입점·운영을 연결합니다. 함께한 브랜드와 참고할 글로벌 콘텐츠 사례를 확인해 보세요.",
  alternates: { canonical: "/refer" },
};

// 콘텐츠 레퍼런스를 새로고침마다 다른 10개 조합으로 노출 — 요청마다 서버 렌더(정적/CDN 캐시로 고정 방지).
export const dynamic = "force-dynamic";
export const revalidate = 0;

// 풀에서 매 요청마다 10개 샘플: Fisher-Yates 셔플 후 브랜드 중복 없이 우선 선택(모자라면 나머지로 채움), 중복 ID 없음.
// 서버 컴포넌트에서 1회 실행 → HTML로 직렬화되므로 수화 불일치/초기 깜빡임 없음.
function sampleCurated<T extends { id: string; brand: string }>(pool: T[], n: number): T[] {
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const seen = new Set<string>();
  const uniq: T[] = [], dup: T[] = [];
  for (const it of a) {
    const k = it.brand.trim().toLowerCase();
    if (seen.has(k)) dup.push(it); else { seen.add(k); uniq.push(it); }
  }
  return [...uniq, ...dup].slice(0, n);
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
    <div className={`group relative flex aspect-[3/2] items-center justify-center overflow-hidden rounded-xl border px-4 pb-5 pt-4 transition hover:shadow-md ${tile}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt={brand} style={invert ? { filter: "brightness(0)" } : undefined} className={`object-contain ${soft ? "max-h-[88%] max-w-[94%]" : "max-h-[74%] max-w-[92%]"}`} loading="lazy" />
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

export default function ReferPage() {
  const rank = (s: LogoSize) => { const i = SIZE_ORDER.indexOf(s); return i < 0 ? 99 : i; };
  const sortedLogos = [...REFER_LOGOS].sort((a, b) => rank(a.size) - rank(b.size));
  // 대표(간결) 브랜드 = 규모가 확인된 대형·중형. 긴 로고 벽 대신 대표 브랜드만 상단 노출.
  const repLogos = sortedLogos.filter((l) => l.size === "대형" || l.size === "중형");

  const marketOf = (m: string) => (m && m !== "미확인" ? m : null);
  // 새로고침마다 다른 10개 조합(중복 ID 없음, 가능하면 브랜드 중복 없이).
  const curated = sampleCurated(REFER_CURATED, 10);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <SiteHeader />

      {/* 히어로 — 단일 열(레퍼런스 미리보기는 하단 섹션으로 이동) */}
      <header className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[var(--accent)] opacity-[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-24 h-72 w-72 rounded-full bg-sky-400 opacity-[0.08] blur-3xl" />
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 sm:py-24">
          <div className="text-[12px] font-extrabold tracking-[4px] text-sky-600">DINO STUDIO · GLOBAL UGC × TIKTOK SHOP</div>
          <h1 className="mt-3 max-w-[760px] break-keep text-[34px] font-black leading-[1.14] tracking-tight sm:text-[50px]">
            우리 브랜드를,<br /><span className="text-[var(--accent)]">현지에서 선택받는 콘텐츠</span>로.
          </h1>
          <p className="mt-4 max-w-[640px] text-[15px] leading-relaxed text-[var(--muted)] sm:text-[16.5px]">
            진출하려는 시장과 제품 특성에 맞춘 크리에이터 콘텐츠를 만들고, TikTok Shop 입점·운영까지 연결합니다.
            함께한 브랜드와 콘텐츠 기획에 참고할 글로벌 사례를 아래에서 확인해 보세요.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link href="/consult1" className="rounded-2xl bg-[var(--accent)] px-6 py-3.5 text-[15px] font-black text-white shadow-lg transition hover:bg-[var(--accent-deep)]">
              우리 브랜드 협업 문의 →
            </Link>
            <a href="#ugc" className="rounded-2xl border border-[var(--border)] bg-white px-6 py-3.5 text-[15px] font-bold text-[var(--fg)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
              콘텐츠 레퍼런스 보기
            </a>
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

      {/* 전체 협업 브랜드 & TikTok Shop 이력 */}
      <div className="border-t border-[var(--border)] bg-slate-50/70">
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
      </div>

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

      {/* 문의 CTA */}
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

      {/* 브랜드 콘텐츠 레퍼런스 10 — 고정 선별(외부 크리에이터 콘텐츠 참고 사례), Footer 직전 하단 */}
      <div className="border-t border-[var(--border)] bg-slate-50/70">
        <Section id="ugc" kicker="Selected References" title="틱톡 세일즈 콘텐츠 예시">
          <ReferCurated items={curated} />
          <p className="mt-5 text-[11px] leading-relaxed text-slate-400">
            외부 크리에이터 콘텐츠 참고 사례이며, 디노스튜디오의 직접 제작 실적을 뜻하지 않습니다.
          </p>
          <div className="mt-6">
            <a href="/explorer" className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-5 py-2.5 text-[13px] font-bold text-[var(--fg)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
              Glovek에서 더 많은 콘텐츠 보기 →
            </a>
          </div>
        </Section>
      </div>

      <SiteFooter />
    </div>
  );
}

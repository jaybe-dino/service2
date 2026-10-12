import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import LeadGate from "@/components/ktrend/LeadGate";
import GateComplete from "@/components/ktrend/GateComplete";
import { verifyAccessToken, accessCookieName, utmFromSearch, seminarSession } from "@/lib/leadgate";

// 비공개 자료 — 색인 차단. 열람은 리드 게이트 통과자만.
export const metadata: Metadata = {
  title: "글로벌 유통채널 바이어 리서치 DB",
  description: "브랜드사 대상 설명자료 (비공개)",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const CONSULT = "/consult1";

// 조사 운영 요약(구글시트 '조사 운영' 시트 기준)
const COUNTRY: { c: string; biz: number; email: number; store: number }[] = [
  { c: "미국", biz: 48, email: 40, store: 4576 },
  { c: "베트남", biz: 59, email: 53, store: 524 },
  { c: "태국", biz: 32, email: 27, store: 761 },
  { c: "필리핀", biz: 35, email: 30, store: 582 },
  { c: "말레이시아", biz: 39, email: 34, store: 2065 },
  { c: "싱가포르", biz: 42, email: 38, store: 186 },
  { c: "일본", biz: 54, email: 34, store: 1273 },
];
const TOTAL = { biz: 309, email: 256, store: 9967, records: 10276 };

// 주요 조사 업체(구글시트 '유통채널 조사' 시트) — 내부 셀(이메일·근거URL·메모·발송상태 등)은 제외, 공개 가능 필드만.
const SAMPLE: { c: string; name: string; form: string; items: string }[] = [
  { c: "미국", name: "StyleKorean / Silicon2", form: "도매·D2C·현지 물류", items: "K뷰티 다브랜드" },
  { c: "미국", name: "Landing International", form: "리테일 진출·브랜드 성장 지원", items: "뷰티·K뷰티" },
  { c: "베트남", name: "COSLIFE Vietnam", form: "도매·리테일 공급", items: "한국 화장품" },
  { c: "베트남", name: "Hasaki", form: "온라인·오프라인 뷰티 리테일", items: "화장품·뷰티" },
  { c: "태국", name: "Karmarts", form: "도매·매장·온라인 판매", items: "뷰티·퍼스널케어" },
  { c: "태국", name: "BEAUTRIUM", form: "뷰티 온라인 리테일·매장망", items: "뷰티·화장품" },
  { c: "필리핀", name: "Glam.ph", form: "온라인 뷰티 리테일·브랜드 파트너", items: "뷰티·메이크업" },
  { c: "필리핀", name: "Watsons Philippines", form: "온라인·오프라인 헬스뷰티 리테일", items: "뷰티·퍼스널케어" },
  { c: "말레이시아", name: "HERMO", form: "뷰티 온라인몰·브랜드 입점", items: "뷰티·화장품" },
  { c: "말레이시아", name: "Luxor Beauty World", form: "유통·리테일·전자상거래", items: "스킨케어·헤어케어" },
];

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
      <div className="text-[28px] font-black leading-none tracking-tight text-[var(--fg)]">{n}</div>
      <div className="mt-1.5 text-[12px] font-semibold text-[var(--muted)]">{label}</div>
    </div>
  );
}

function ConsultLink({ small }: { small?: boolean }) {
  return (
    <Link href={CONSULT}
      className={`inline-flex items-center justify-center rounded-lg bg-[var(--accent)] font-bold text-white transition hover:bg-[var(--accent-deep)] ${small ? "px-3 py-1.5 text-[11px]" : "px-5 py-2.5 text-[13px]"}`}>
      상담 문의
    </Link>
  );
}

export default async function RetailPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) ?? {};
  const c = await cookies();
  if (!verifyAccessToken("retail", c.get(accessCookieName("retail"))?.value)) {
    return <LeadGate kind="retail" semKo={seminarSession().ko} utm={utmFromSearch(sp)} err={sp.gerr === "1"} />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <GateComplete fireReg={sp.reg === "1"} kind="retail" />

      {/* 상단 바 */}
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="text-[15px] font-black tracking-tight">Glovek <span className="text-[var(--accent)]">Retail</span></div>
          <ConsultLink small />
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8 sm:py-14">
        {/* 히어로 */}
        <div className="text-[11px] font-extrabold uppercase tracking-[3px] text-sky-600">Global Retail Buyer Research</div>
        <h1 className="mt-2 text-[28px] font-black leading-tight tracking-tight sm:text-[38px]">글로벌 유통채널 바이어 리서치 DB</h1>
        <p className="mt-3 max-w-[720px] text-[14px] leading-relaxed text-[var(--muted)]">
          미국·베트남·태국·필리핀·말레이시아·싱가포르·일본 <b>7개국</b>의 유통사·리테일 바이어와 오프라인 매장망을 직접 조사·정리한 자료입니다.
          디노스튜디오는 이 바이어 네트워크를 기반으로 브랜드의 현지 입점·유통을 연결합니다.
        </p>

        {/* 핵심 지표 */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat n="7개국" label="조사 대상 국가" />
          <Stat n={`${TOTAL.biz}개`} label="고유 유통·리테일 업체" />
          <Stat n={TOTAL.store.toLocaleString()} label="적격 오프라인 매장" />
          <Stat n={TOTAL.records.toLocaleString()} label="합산 레코드" />
        </div>

        {/* 국가별 */}
        <section className="mt-12">
          <h2 className="text-[20px] font-black tracking-tight sm:text-[24px]">국가별 조사 현황</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50 text-left text-[11.5px] font-bold text-[var(--muted)]">
                  <th className="px-4 py-3">국가</th>
                  <th className="px-4 py-3 text-right">유통·리테일 업체</th>
                  <th className="px-4 py-3 text-right">연락 경로 확보</th>
                  <th className="px-4 py-3 text-right">적격 매장</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {COUNTRY.map((r) => (
                  <tr key={r.c} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold">{r.c}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.biz}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--muted)]">{r.email}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.store.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-black">
                  <td className="px-4 py-3">합계</td>
                  <td className="px-4 py-3 text-right tabular-nums">{TOTAL.biz}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{TOTAL.email}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{TOTAL.store.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 주요 업체 */}
        <section className="mt-12">
          <h2 className="text-[20px] font-black tracking-tight sm:text-[24px]">주요 조사 업체</h2>
          <p className="mt-1.5 text-[12.5px] text-[var(--muted)]">
            전체 {TOTAL.biz}개 업체 중 일부입니다. 바이어 연락처·제안 창구 등 상세 정보는 보안을 위해 비공개이며, <b>상담 문의</b>를 통해 안내드립니다.
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--border)] bg-white">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50 text-left text-[11.5px] font-bold text-[var(--muted)]">
                  <th className="px-4 py-3">국가</th>
                  <th className="px-4 py-3">업체명</th>
                  <th className="px-4 py-3">유통 형태</th>
                  <th className="px-4 py-3">취급 품목</th>
                  <th className="px-4 py-3 text-right">연락</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {SAMPLE.map((r) => (
                  <tr key={r.name} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{r.c}</td>
                    <td className="px-4 py-3 font-bold">{r.name}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{r.form}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted)]">{r.items}</td>
                    <td className="px-4 py-3 text-right"><ConsultLink small /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-slate-400">※ 연락처·제안 포인트·매장 상세는 내부 조사 자료로 공개하지 않으며, 수행 범위는 계약·확인 기준에 따릅니다.</p>
        </section>

        {/* CTA */}
        <section className="mt-14 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#fdf2f8] to-white p-8 text-center">
          <h2 className="text-[20px] font-black tracking-tight sm:text-[26px]">이 바이어 네트워크로 브랜드를 연결합니다</h2>
          <p className="mx-auto mt-2 max-w-[520px] text-[13px] text-[var(--muted)]">현지 유통·리테일 입점과 틱톡샵 운영까지 — 상담으로 맞춤 제안을 받아보세요.</p>
          <div className="mt-5"><ConsultLink /></div>
        </section>

        <footer className="mt-12 border-t border-[var(--border)] pt-6 text-center text-[12px] text-slate-400">
          본 자료는 디노스튜디오 내부 조사(2026-09~10)를 정리한 비공개 자료입니다.
        </footer>
      </main>
    </div>
  );
}

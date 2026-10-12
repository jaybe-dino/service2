import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import LeadGate from "@/components/ktrend/LeadGate";
import GateComplete from "@/components/ktrend/GateComplete";
import { verifyAccessToken, accessCookieName, utmFromSearch, seminarSession } from "@/lib/leadgate";
import { RETAIL_COS } from "@/data/retail";

// 비공개 자료 — 색인 차단. 열람은 리드 게이트 통과자만.
export const metadata: Metadata = {
  title: "글로벌 유통채널 바이어 리서치 DB",
  description: "브랜드사 대상 설명자료 (비공개)",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const CONSULT = "/consult1";
const ORDER = ["미국", "베트남", "태국", "필리핀", "말레이시아", "싱가포르", "일본"] as const;
// 조사 운영 시트 기준 적격 오프라인 매장 수
const STORES: Record<string, number> = { 미국: 4576, 베트남: 524, 태국: 761, 필리핀: 582, 말레이시아: 2065, 싱가포르: 186, 일본: 1273 };
const TOTAL_STORE = 9967, TOTAL_RECORDS = 10276;

function ConsultLink({ small }: { small?: boolean }) {
  return (
    <Link href={CONSULT}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-[var(--accent)] font-bold text-white transition hover:bg-[var(--accent-deep)] ${small ? "px-3 py-1.5 text-[11px]" : "px-5 py-2.5 text-[13px]"}`}>
      상담 문의
    </Link>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
      <div className="text-[26px] font-black leading-none tracking-tight text-[var(--fg)] sm:text-[28px]">{n}</div>
      <div className="mt-1.5 text-[12px] font-semibold text-[var(--muted)]">{label}</div>
    </div>
  );
}

export default async function RetailPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) ?? {};
  const c = await cookies();
  if (!verifyAccessToken("retail", c.get(accessCookieName("retail"))?.value)) {
    return <LeadGate kind="retail" semKo={seminarSession().ko} utm={utmFromSearch(sp)} err={sp.gerr === "1"} />;
  }

  const byCountry = ORDER.map((c) => ({ c, items: RETAIL_COS.filter((x) => x.c === c) })).filter((g) => g.items.length);
  const total = RETAIL_COS.length;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <GateComplete fireReg={sp.reg === "1"} kind="retail" />

      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="text-[15px] font-black tracking-tight">Glovek <span className="text-[var(--accent)]">Retail</span></div>
          <ConsultLink small />
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-10 sm:px-8 sm:py-14">
        <div className="text-[11px] font-extrabold uppercase tracking-[3px] text-sky-600">Global Retail Buyer Research</div>
        <h1 className="mt-2 text-[28px] font-black leading-tight tracking-tight sm:text-[38px]">글로벌 유통채널 바이어 리서치 DB</h1>
        <p className="mt-3 max-w-[720px] text-[14px] leading-relaxed text-[var(--muted)]">
          미국·베트남·태국·필리핀·말레이시아·싱가포르·일본 <b>7개국</b>의 유통사·리테일 바이어와 오프라인 매장망을 직접 조사·정리한 자료입니다.
          디노스튜디오는 이 바이어 네트워크를 기반으로 브랜드의 현지 입점·유통을 연결합니다.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat n="7개국" label="조사 대상 국가" />
          <Stat n={`${total}개`} label="유통·리테일 업체" />
          <Stat n={TOTAL_STORE.toLocaleString()} label="적격 오프라인 매장" />
          <Stat n={TOTAL_RECORDS.toLocaleString()} label="합산 레코드" />
        </div>

        {/* 국가별 요약 */}
        <section className="mt-12">
          <h2 className="text-[20px] font-black tracking-tight sm:text-[24px]">국가별 조사 현황</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50 text-left text-[11.5px] font-bold text-[var(--muted)]">
                  <th className="px-4 py-3">국가</th>
                  <th className="px-4 py-3 text-right">유통·리테일 업체</th>
                  <th className="px-4 py-3 text-right">적격 매장</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {byCountry.map((g) => (
                  <tr key={g.c} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold">{g.c}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{g.items.length}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{(STORES[g.c] ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-black">
                  <td className="px-4 py-3">합계</td>
                  <td className="px-4 py-3 text-right tabular-nums">{total}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{TOTAL_STORE.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 전체 업체 리스트 (국가별) */}
        <section className="mt-12">
          <h2 className="text-[20px] font-black tracking-tight sm:text-[24px]">전체 조사 업체 <span className="text-[14px] font-bold text-[var(--muted)]">{total}곳</span></h2>
          <p className="mt-1.5 text-[12.5px] text-[var(--muted)]">
            바이어 이메일·제안 창구 등 상세 연락 정보는 보안을 위해 비공개이며, <b>상담 문의</b>를 통해 안내드립니다.
          </p>

          <div className="mt-5 space-y-8">
            {byCountry.map((g) => (
              <div key={g.c}>
                <div className="mb-2 flex items-baseline gap-2">
                  <h3 className="text-[15px] font-black">{g.c}</h3>
                  <span className="text-[12px] text-[var(--muted)]">{g.items.length}곳</span>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white">
                  <table className="w-full min-w-[720px] text-[13px]">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-slate-50 text-left text-[11.5px] font-bold text-[var(--muted)]">
                        <th className="px-4 py-2.5">업체명</th>
                        <th className="px-4 py-2.5">유통 형태</th>
                        <th className="px-4 py-2.5">취급 품목</th>
                        <th className="px-4 py-2.5">사이트</th>
                        <th className="px-4 py-2.5 text-right">연락</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {g.items.map((x, i) => (
                        <tr key={`${x.name}-${i}`} className="align-top hover:bg-slate-50/60">
                          <td className="px-4 py-2.5 font-bold">{x.name}</td>
                          <td className="px-4 py-2.5 text-[var(--muted)]">{x.form || "—"}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-[var(--muted)]">{x.items || "—"}</td>
                          <td className="whitespace-nowrap px-4 py-2.5">
                            {x.url
                              ? <a href={x.url} target="_blank" rel="noopener noreferrer" className="text-sky-600 underline-offset-2 hover:underline">사이트 ↗</a>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right"><ConsultLink small /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-slate-400">※ 연락처·제안 포인트·매장 상세는 내부 조사 자료로 공개하지 않으며, 수행 범위는 계약·확인 기준에 따릅니다.</p>
        </section>

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

import { Fragment } from "react";
import type { Metadata } from "next";
import ScrollSpy from "./ScrollSpy";

// 검색엔진 색인 차단(비공개 자료). robots.ts에도 disallow 추가됨.
export const metadata: Metadata = {
  title: "TikTok Shop 온보딩·마케팅 가이드",
  description: "브랜드사 대상 설명자료",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

const CY = "text-sky-600";
const PK = "text-[var(--accent)]";
const card = "rounded-2xl border border-[var(--border)] bg-white p-5";
const kick = "text-[11px] font-extrabold uppercase tracking-[3px]";

// 벤치마크 표 데이터 (Beauty & Personal Care)
const TIERS = ["T1", "T2", "T3", "T4", "T5", "Beyond*"];
const TIER_SUB = ["<$12.5K", "$12.5K+", "$65K+", "$200K+", "$600K+", "$1.7M+"];
const BENCH: { group: string; rows: [string, string[]][] }[] = [
  { group: "Assortment", rows: [
    ["Hero Products", ["0", "0", "2", "3", "9", "39"]],
    ["% GMV w/ Free Shipping", ["92%", "80%", "88%", "86%", "94%", "91%"]],
    ["% Affiliate GMV", ["48%", "65%", "73%", "76%", "82%", "83%"]],
  ] },
  { group: "Content & Affiliates", rows: [
    ["Seller Content", ["2", "6", "6", "13", "28", "29"]],
    ["Creator Content", ["204", "992", "2,776", "6,327", "22,470", "82,509"]],
    ["Free Samples Delivered", ["25", "109", "507", "877", "2,834", "12,286"]],
  ] },
  { group: "L3+ Affiliates", rows: [
    ["L3+ New Content", ["15", "104", "276", "772", "2,426", "11,194"]],
    ["L3+ Samples Delivered", ["1", "10", "40", "121", "297", "1,604"]],
    ["L3+ Creators w/ New Content", ["5", "31", "72", "181", "—", "1,526"]],
  ] },
  { group: "Shop Ads", rows: [
    ["Shop Ads $ Spend", ["$1,411", "$14,164", "$30,544", "$137,714", "$438,150", "$4,637,137"]],
    ["% GMV from Shop Ads", ["92%", "80%", "88%", "86%", "94%", "91%"]],
  ] },
];

const NAV = [
  { g: "개념", items: [["s1", "1. 기본 구조 (2축)"], ["s2", "2. 핵심 로직 플로우"], ["s3", "3. 티어 시스템"], ["s3b", "3-B. 벤치마크"], ["s4", "4. 성장 로드맵"]] },
  { g: "운영", items: [["s5", "5. 매출 메커니즘"], ["s6", "6. 바텀업/탑다운"], ["s7", "7. 상품 구성"], ["s8", "8. 크리에이터·국가"], ["s9", "9. 예산 구조"]] },
  { g: "프로세스", items: [["s10", "10. 온보딩 플로우"], ["s11", "11. 물류"], ["s12", "12. 정산·CS·서류"]] },
  { g: "참고", items: [["faq", "FAQ"], ["gloss", "용어집"]] },
];

const FAQ: [string, string][] = [
  ["부스팅은 예산을 넓히는 건가요, 다른 방식이 있나요?", "노출을 늘리는 형태입니다. 이미 올린 콘텐츠에서 구매 전환이 확인되면, 예산을 써서 노출량을 100만·1,000만까지 확대합니다. 메타처럼 틱톡 안의 하나의 캠페인이며 어드민에서 관리·확인할 수 있습니다."],
  ["부스팅 예산 집행 효율을 별도로 확인할 수 있나요?", "가능합니다. 어드민 계정에서 모두 확인되며, 얼럿이 뜨면 담당자가 시간과 무관하게 즉시 집행합니다. ROAS가 나오면 유지, 안 나오면 즉시 끕니다."],
  ["티어가 다르면 광고 환경도 다른가요?", "실시간 CPM은 티어와 무관하며 크리에이터 콘텐츠에 따라 달라집니다. 티어에 따라 달라지는 것은 \"건수\"입니다."],
  ["물류는 아마존 FBA로 대응해도 되나요?", "가능하며 점진적으로 의견을 드립니다. 다만 틱톡은 FBT를 추천하며, FBA는 틱톡용 3자 물류로 쓸 수 없는 구조입니다. 초기에는 3PL로 시작하고 물량이 늘면 FBT 병행을 권장합니다."],
  ["콘텐츠 수량은 해시태그 기준인가요?", "아닙니다. 우리 샵·제품 링크가 연결된 콘텐츠 기준입니다. 브랜드(계정) 티어 기준이며 크리에이터 인원수 제한은 없습니다."],
  ["한국 틱톡커를 미국 샵에 직접 연결할 수 있나요?", "한국 계정은 미국 샵 어필리에이트에 연동되지 않습니다. 해당 크리에이터가 미국 어필리에이트를 별도 신청·인증받아야 하며, \"한국인으로 미국 틱톡샵 크리에이터 되기\" 같은 별도 루트가 있습니다. 물리적으로 어려우면 그 계정으로 미국 타깃 \"모집 영상\"을 만들어 우회하는 전략이 가능합니다."],
  ["반드시 틱톡샵 안에서만 크리에이터를 섭외해야 하나요?", "아닙니다. 소싱(섭외)은 외부에서 해도 되며, 등록(샵-계정 연동)만 틱톡 안에서 하면 됩니다. 브랜드와 틱톡커가 조건만 합의하면 자체 영업도 가능합니다."],
  ["무가 시딩을 했는데 크리에이터가 콘텐츠를 안 올리면?", "현재 이행률은 약 98%입니다. 안 올리면 틱톡 내 페널티가 부과되며, 초기에는 신뢰도 있는 크리에이터 위주로 진행합니다. 수량이 1,000개를 넘어가면 이행률이 80%대까지 내려갈 수 있습니다."],
  ["디파짓은 꼭 내야 하나요?", "공식적으로는 제품 등록 시 요구되지만(미국 1,500불, 동남아 100불), 현재까지 진행 팀은 모두 면제 트랙을 받아 내지 않았습니다. 담당자와 협의해 면제로 진행합니다."],
  ["가입 신청에서 떨어질 수도 있나요?", "가입 단계에서 가부(승인/거절) 결정이 나는 케이스는 없습니다. 서류·인증 절차를 밟으면 시간에 맞춰 승인됩니다. 전체 여정은 빠르면 2주, 늦으면 한 달입니다."],
  ["인증 없이 크로스보더로 판매할 수 있나요?", "베트남·태국은 제품 등록 시 인증서가 필요해 인증 없이는 불가합니다. 인증은 병렬로 준비하는 것을 권장하며(길면 12~18개월 소요), 인증 없이 진행 시 리스크가 있고 문제 시 샵이 홀드됩니다."],
  ["정산과 수출 증빙은 어떻게 되나요?", "모든 정산은 플랫폼 내에서 처리되고 셀러는 정산금만 받습니다. 어필리에이트 커미션은 틱톡이 대금 수취 후 제하고 정산합니다. 수출 신고·실적 증빙(금액 기재)은 틱톡으로부터 발급받을 수 있습니다."],
];

const GLOSS: [string, string][] = [
  ["어필리에이트 (Affiliate)", "크리에이터가 제품 콘텐츠로 판매를 연결하고 수수료를 셰어받는 프로그램. 콘텐츠 = 광고 소재."],
  ["무가 / 유가", "무가: 제품만 제공, 수수료 베이스. 유가: 제품+광고비 지급, 매출 기대."],
  ["부스팅 / 샵 에즈 / GMV Max", "전환이 나오는 콘텐츠에 광고비를 태워 노출을 확대하는 퍼포먼스 광고."],
  ["티어 (T1~T5, Beyond)", "틱톡샵 공식 샵 등급. 콘텐츠 수량·광고비·매출로 판단, 30일 단위 평가."],
  ["ROAS", "광고비 대비 매출 효율(%). 기준표에 따라 부스팅 유지/중단 결정."],
  ["GMV", "Gross Merchandise Value, 총 거래액(매출)."],
  ["바텀업 / 탑다운", "바텀업: 무가→분석→유가/메가. 탑다운: 메가→라이선스→재활용."],
  ["시딩 (Seeding)", "크리에이터에게 제품을 배포해 콘텐츠(소재)를 확보하는 활동."],
  ["번들 / 세트", "번들: 사용법 기반 묶음. 세트: 제품 여러 개 묶음. 어필리에이트 단가↑ 목적."],
  ["FBT / 3PL / FBA", "FBT: 틱톡 자체 물류. 3PL: 일반 3자 물류. FBA: 아마존 물류."],
  ["크로스보더 (CBT)", "국경 간 거래. 영종도 아레나스 창고 경유로 동남아·일본 배송."],
  ["디파짓 (Deposit)", "제품 등록 시 요구되는 보증금(미국 1,500불/동남아 100불). 면제 트랙 협의 가능."],
  ["KYC", "본인/소유 인증 절차(Know Your Customer)."],
  ["샵 헬스 (Shop Health)", "샵의 건전성 지표. CS·부정 댓글 대응 등이 영향."],
];

function Kick({ children, pink }: { children: React.ReactNode; pink?: boolean }) {
  return <div className={`${kick} ${pink ? PK : CY}`}>{children}</div>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-1.5 mb-1.5 text-[24px] font-extrabold tracking-tight sm:text-[28px]">{children}</h2>;
}
function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mb-6 max-w-[900px] text-[14px] leading-relaxed text-[var(--muted)] sm:text-[15px]">{children}</p>;
}
function Call({ children, pink }: { children: React.ReactNode; pink?: boolean }) {
  return (
    <div className={`my-4 rounded-lg border-l-[3px] px-4 py-3 text-[13.5px] leading-relaxed ${pink ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-sky-400 bg-sky-50"}`}>
      {children}
    </div>
  );
}

export default function TiktokMarketingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <div className="mx-auto flex max-w-[1400px]">
        {/* 사이드바 */}
        <nav data-spy className="sticky top-0 hidden h-screen w-[240px] shrink-0 overflow-y-auto border-r border-[var(--border)] bg-slate-50/60 p-5 lg:block">
          <div className="text-[12px] font-extrabold tracking-[3px] text-sky-600">TIKTOK <b className="text-[var(--accent)]">SHOP</b></div>
          <h1 className="mb-5 mt-2 text-[16px] font-black leading-tight">온보딩 · 마케팅 가이드</h1>
          {NAV.map((sec) => (
            <div key={sec.g}>
              <div className="mx-2 mb-1.5 mt-4 text-[10px] uppercase tracking-[1px] text-slate-400">{sec.g}</div>
              {sec.items.map(([id, label]) => (
                <a key={id} href={`#${id}`} className="spy-link mb-0.5 block rounded-lg border-l-2 border-transparent px-3 py-1.5 text-[13px] text-[var(--muted)] hover:bg-white hover:text-[var(--fg)]">{label}</a>
              ))}
            </div>
          ))}
        </nav>

        {/* 본문 */}
        <main className="min-w-0 flex-1 px-5 pb-28 sm:px-10">
          {/* 히어로 */}
          <header className="relative overflow-hidden border-b border-[var(--border)] py-14">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[var(--accent)] opacity-[0.07] blur-2xl" />
            <div className="pointer-events-none absolute -bottom-24 right-40 h-64 w-64 rounded-full bg-sky-400 opacity-[0.08] blur-2xl" />
            <div className="text-[13px] font-extrabold tracking-[5px] text-sky-600">TIKTOK SHOP</div>
            <h1 className="mt-3 text-[38px] font-black leading-[1.1] tracking-tight sm:text-[48px]">온보딩 · 마케팅 가이드</h1>
            <p className="mt-2 text-[17px] text-[var(--muted)] sm:text-[19px]">브랜드사 대상 설명자료 — 구조도 &amp; 플로우 중심</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["어필리에이트", "부스팅(샵 에즈)", "티어 T1~T5", "벤치마크", "매출 메커니즘", "물류·크로스보더", "온보딩 프로세스", "FAQ"].map((c) => (
                <span key={c} className="rounded-full border border-[var(--border)] bg-white px-3.5 py-1.5 text-[12px] text-[var(--muted)]">{c}</span>
              ))}
            </div>
          </header>

          {/* 시스템 맵 배너 */}
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-slate-50 p-5">
            <div className="mb-2.5 text-[11px] font-bold tracking-[2px] text-slate-400">SYSTEM MAP · 한눈에 보는 전체 구조</div>
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
              {[["시딩(무가·유가)", CY], ["콘텐츠 다량 생산", ""], ["잭팟 콘텐츠 포착", PK], ["부스팅(샵 에즈)", PK], ["ROAS 판정", ""], ["티어 상승 (T1→T2→…)", CY]].map(([t, c], i, arr) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <span className={`rounded-full bg-white px-2.5 py-1 ring-1 ring-[var(--border)] ${c}`}>{t}</span>
                  {i < arr.length - 1 && <span className="text-slate-300">→</span>}
                </span>
              ))}
            </div>
          </div>

          {/* 1. 기본 구조 */}
          <section id="s1" className="scroll-mt-8 pt-14">
            <Kick>Big Picture</Kick>
            <H2>1. 틱톡샵 마케팅은 두 개의 축으로 돌아갑니다</H2>
            <Lead>다른 방법도 있지만 현재는 대부분 이 두 가지로만 진행합니다. 「인플루언서로 콘텐츠(소재)를 만드는 것」 + 「잘 되는 콘텐츠에 메타식 광고를 태우는 것」이 하나로 묶인 구조입니다.</Lead>
            <div className="grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
              <div className={card}>
                <span className="inline-block rounded-full bg-sky-500 px-4 py-1.5 text-[12px] font-extrabold text-white">① AFFILIATE</span>
                <h4 className="mb-2 mt-3 text-[22px] font-extrabold">어필리에이트</h4>
                <p className="text-[13.5px] text-slate-600">크리에이터가 제품 콘텐츠로 판매를 연결하는 프로그램. 콘텐츠 자체가 곧 광고 &quot;소재&quot;가 됩니다.</p>
                <div className={`mt-3 text-[13px] font-semibold italic ${CY}`}>≈ 한국의 인플루언서 마케팅</div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3"><h5 className={`text-[13px] font-bold ${CY}`}>무가 (무상)</h5><p className="mt-0.5 text-[12px] text-[var(--muted)]">제품(현물)만 제공, 수수료 베이스. <b className={CY}>소재 발굴</b>이 목적. 비중 80~90%</p></div>
                  <div className="rounded-lg bg-slate-50 p-3"><h5 className={`text-[13px] font-bold ${PK}`}>유가 (유상)</h5><p className="mt-0.5 text-[12px] text-[var(--muted)]">제품+광고비 지급(100만~500만). 매출(GMV) 기대·레퍼런스. 비중 10~20%</p></div>
                </div>
              </div>
              <div className="flex items-center justify-center md:w-16"><span className="grid h-12 w-12 place-items-center rounded-full border border-[var(--border)] bg-white text-[22px] font-extrabold">+</span></div>
              <div className={card}>
                <span className="inline-block rounded-full bg-[var(--accent)] px-4 py-1.5 text-[12px] font-extrabold text-white">② BOOSTING</span>
                <h4 className="mb-2 mt-3 text-[22px] font-extrabold">부스팅 (샵 에즈)</h4>
                <p className="text-[13.5px] text-slate-600">전환이 나오는 콘텐츠에 광고비를 태워 노출을 확대하는 퍼포먼스 광고. 어드민에서 하나의 캠페인으로 관리합니다.</p>
                <div className={`mt-3 text-[13px] font-semibold italic ${PK}`}>≈ 한국의 메타(페북/인스타) 광고</div>
                <Call pink><b className={PK}>노출 확대</b> — 이미 올라간 콘텐츠에서 구매 전환이 확인되면, 예산을 써서 조회수를 100만·1,000만까지 밀어 올립니다.</Call>
              </div>
            </div>
          </section>

          {/* 2. 핵심 로직 */}
          <section id="s2" className="scroll-mt-8 pt-14">
            <Kick>Core Logic Flow</Kick>
            <H2>2. 소재를 뿌리고, 터진 것에 태운다</H2>
            <Lead>메타에서 소재 10~20개 중 전환 나오는 것에 광고비를 태우던 방식 그대로 — 틱톡에선 &quot;소재 = 인플루언서 콘텐츠&quot;입니다.</Lead>
            <div className="flex flex-wrap items-stretch gap-2">
              {[["1", "시딩", "무가·유가로 콘텐츠 다량 확보", false], ["2", "포착", "조회수 터지고 전환되는 소재 발견", false], ["3", "부스팅", "그 소재에 광고비 태워 노출↑", true], ["4", "판정", "ROAS 충족 유지 · 미달 시 즉시 중단", true], ["5", "분석", "왜 터졌나→후킹 가설을 다음에 반영", false]].map(([n, t, d, pk], i, arr) => (
                <div key={n as string} className="flex items-stretch">
                  <div className={`${card} min-w-[140px] flex-1 text-center`}>
                    <div className={`mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full text-[16px] font-extrabold text-white ${pk ? "bg-[var(--accent)]" : "bg-sky-500"}`}>{n}</div>
                    <h4 className="text-[15px] font-bold">{t}</h4>
                    <p className="mt-1 text-[12px] text-[var(--muted)]">{d}</p>
                  </div>
                  {i < arr.length - 1 && <div className="flex w-7 items-center justify-center text-[22px] font-extrabold text-slate-300">›</div>}
                </div>
              ))}
            </div>
            <Call><b className={CY}>핵심</b> — 틱톡은 팔로워가 아니라 <b>콘텐츠 기반</b> 플랫폼. 팔로워 1만이어도 100만 조회가 터질 수 있어, 다량 시딩으로 잭팟 확률을 높이는 것이 관건입니다.</Call>
          </section>

          {/* 3. 티어 */}
          <section id="s3" className="scroll-mt-8 pt-14">
            <Kick>Tier System</Kick>
            <H2>3. 틱톡 티어(Tier) — 샵 공식 등급</H2>
            <Lead>스마트스토어 등급처럼 T1~T5 + Beyond 총 6등급. 30일 단위 평가. 마케팅 목표 = &quot;티어를 얼마나 빨리 올리느냐&quot;. 판단 기준은 <b className="text-[var(--fg)]">콘텐츠 수량 · 광고비 · 매출(ROAS)</b> 세 가지입니다.</Lead>
            <div className="mb-4 flex items-end gap-3" style={{ height: 210 }}>
              {[["T1", "시작점", 42, CY], ["T2", "1차 목표", 56, CY], ["T3", "중견 타깃", 70, "text-sky-500"], ["T4", "전담 담당자", 84, "text-sky-500"], ["T5", "국내 18개사", 100, PK]].map(([t, s, h, c]) => (
                <div key={t as string} className={`relative flex flex-1 flex-col items-center rounded-t-xl border border-b-0 pt-3 ${t === "T5" ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)] bg-slate-50"}`} style={{ height: `${h}%` }}>
                  <div className={`text-[22px] font-extrabold ${c}`}>{t}</div>
                  <small className="absolute -bottom-6 left-0 right-0 text-center text-[11px] text-[var(--muted)]">{s}</small>
                </div>
              ))}
            </div>
            <div className="h-8" />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse overflow-hidden rounded-xl text-[13px]">
                <thead>
                  <tr>
                    {["구분", "T1", "T2", "T3", "T4~T5"].map((h, i) => (
                      <th key={h} className={`border border-[var(--border)] p-2.5 font-bold ${i === 0 ? "bg-slate-100 text-left" : i === 4 ? "bg-[var(--accent)] text-white" : "bg-sky-500 text-white"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[["월 콘텐츠 수", "약 200개", "약 900~1,000", "2,000~3,000", "대폭 확대"], ["월 광고비", "150~200만", "약 2,000만", "4,000~4,500만", "상황별"], ["ROAS 기준", "측정 어려움", "150%(목표 200%)", "150~200%→250~300%", "T5 400% 사례"], ["도달 기간", "시작점", "약 6개월", "6개월~1년", "T4 약 2년"], ["담당자 관리", "—", "1인당 ~1,000", "1인당 ~50", "T4 5 / T5 1"]].map((row) => (
                    <tr key={row[0]}>
                      {row.map((c, i) => <td key={i} className={`border border-[var(--border)] p-2.5 text-center ${i === 0 ? "bg-slate-50 text-left font-bold text-sky-700" : "bg-white"}`}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Call><b className={CY}>콘텐츠 수량 기준</b> — 해시태그가 아니라 &quot;우리 샵·제품 링크가 연결된&quot; 콘텐츠 기준. 브랜드(계정) 티어이며 크리에이터 인원수 제한은 없고, 표의 수치는 평균치(유가·무가·자발적 리뷰 포함)입니다.</Call>
          </section>

          {/* 3-B. 벤치마크 (이미지 표) */}
          <section id="s3b" className="scroll-mt-8 pt-14">
            <Kick pink>Benchmark</Kick>
            <H2>3-B. 벤치마크 (Beauty &amp; Personal Care)</H2>
            <Lead>30-Day Key Milestones · Avg. for Beauty Sellers (2026). 티어별 GMV 구간에서 뷰티 셀러가 도달하는 30일 평균 지표입니다.</Lead>
            <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 border border-[var(--border)] bg-slate-100 p-2.5 text-left font-bold">지표</th>
                    {TIERS.map((t, i) => (
                      <th key={t} className={`border border-[var(--border)] p-2.5 text-center font-bold ${i >= 4 ? "bg-[var(--accent)] text-white" : "bg-sky-500 text-white"}`}>
                        <div>{t}</div><div className="text-[10px] font-medium opacity-90">{TIER_SUB[i]}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BENCH.map((grp) => (
                    <Fragment key={grp.group}>
                      <tr>
                        <td colSpan={7} className="border border-[var(--border)] bg-slate-50 p-2 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{grp.group}</td>
                      </tr>
                      {grp.rows.map(([label, vals]) => (
                        <tr key={label}>
                          <td className="sticky left-0 z-10 border border-[var(--border)] bg-white p-2.5 text-left font-semibold text-[var(--fg)]">{label}</td>
                          {vals.map((v, i) => <td key={i} className="border border-[var(--border)] bg-white p-2.5 text-center tabular-nums">{v}</td>)}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] italic text-[var(--muted)]">*상위 75th percentile 셀러의 GMV 티어별·월별 중앙값을 3개월 평균한 벤치마크입니다. (원본 이미지 기준 · &quot;L3+ Creators w/ New Content&quot;의 T5 셀은 원본에서 불명확하여 —로 표기 — 확인 후 갱신 필요)</p>
          </section>

          {/* 4. 로드맵 */}
          <section id="s4" className="scroll-mt-8 pt-14">
            <Kick>Roadmap</Kick>
            <H2>4. 성장 로드맵 — 1차 목표는 T2</H2>
            <Lead>모든 기업은 T1에서 출발. 처음부터 T3보다 T2를 1차 목표로 두고 단계적으로 확장하는 것을 권장합니다.</Lead>
            <div className="grid gap-3 sm:grid-cols-4">
              {[["T2", "1차 목표", "약 6개월 · 매출 약 3천", false], ["T3", "2차", "보통 1년 (예: 클리오 월 1억)", false], ["T4", "3차", "약 2년 · 전담 담당자 배치", true], ["T5", "최종", "\"잭팟\" 필요 · 국내 18개사", true]].map(([t, b, p, pk]) => (
                <div key={t as string} className={card}>
                  <div className={`mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full text-[15px] font-extrabold text-white ${pk ? "bg-[var(--accent)]" : "bg-sky-500"}`}>{t}</div>
                  <b className={`block text-center ${pk ? PK : CY}`}>{b}</b>
                  <p className="mt-1 text-center text-[12.5px] text-[var(--muted)]">{p}</p>
                </div>
              ))}
            </div>
            <Call pink><b className={PK}>⚠ 깔딱고개</b> — T3→T4 구간이 숫자가 보이기 시작하지만 가장 힘든 구간. 이 구간을 넘는 제안은 틱톡 전담 담당자와 함께 설계합니다. (T3 넘어가면 ROAS 200%+ 안정 궤도)</Call>
          </section>

          {/* 5. 매출 메커니즘 */}
          <section id="s5" className="scroll-mt-8 pt-14">
            <Kick>How Sales Happen</Kick>
            <H2>5. 매출 메커니즘 — 시딩 → 잭팟</H2>
            <Lead>시딩 50~100개 중 대부분은 예상 범주(5천~1만 조회). 그런데 한두 개가 하루 만에 폭발하고 구매 전환이 발생합니다.</Lead>
            <div className="grid gap-4 md:grid-cols-2">
              <div className={card}>
                <div className="mb-3 text-[13px] font-bold text-[var(--muted)]">대부분의 콘텐츠 (예상 범주)</div>
                {[["5천 조회", 28], ["1만 조회", 40], ["8천 조회", 34], ["6천 조회", 24]].map(([l, w]) => (
                  <div key={l as string} className="mb-2.5 flex items-center gap-3">
                    <div className="h-6 rounded bg-slate-200" style={{ width: `${w}%` }} />
                    <span className="text-[12.5px] text-[var(--muted)]">{l}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-[var(--accent)] bg-gradient-to-b from-[var(--accent-light)] to-white p-5">
                <div className={`mb-2.5 font-extrabold ${PK}`}>한두 개의 잭팟</div>
                <div className="text-[42px] font-extrabold leading-none">30만</div>
                <small className="mb-3 block text-[12.5px] text-[var(--muted)]">하루 만에 조회수 폭발</small>
                <div className={`text-[42px] font-extrabold leading-none ${CY}`}>100만+</div>
                <small className="block text-[12.5px] text-[var(--muted)]">이틀 만에 + 구매 전환 발생 → 부스팅 대상</small>
              </div>
            </div>
            <h3 className="mb-3 mt-7 text-[17px] font-bold">24시간 모니터링 &amp; 실시간 부스팅</h3>
            <div className="space-y-3">
              {[["1", "실시간 포착", "콘텐츠는 새벽에도 터집니다. 조회수만이 아니라 구매 전환·노출 건수를 계산해 실시간으로 의사결정합니다.", false], ["2", "즉시 부스팅", "얼럿이 뜨면 담당자가 시간과 무관하게 즉시 집행. ROAS 기준표 충족 시 유지·증액, 미달 시 즉시 홀드(중단).", true], ["3", "원인 분석", "왜 터졌나 → 후킹 포인트를 가설화 → 유가 크리에이터·다음 캠페인에 반영합니다.", false]].map(([n, t, d, pk]) => (
                <div key={n as string} className="flex items-start gap-4 rounded-xl border border-[var(--border)] bg-white p-4">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] font-extrabold text-white ${pk ? "bg-[var(--accent)]" : "bg-sky-500"}`}>{n}</div>
                  <div><h4 className="text-[15px] font-bold">{t}</h4><p className="mt-0.5 text-[13.5px] text-slate-600">{d}</p></div>
                </div>
              ))}
            </div>
            <Call>CPM은 티어와 무관 — 크리에이터 콘텐츠에 따라 달라집니다. 티어가 바꾸는 것은 &quot;건수&quot;입니다.</Call>
          </section>

          {/* 6. 바텀업/탑다운 */}
          <section id="s6" className="scroll-mt-8 pt-14">
            <Kick>Strategy</Kick>
            <H2>6. 바텀업 vs 탑다운</H2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className={card}>
                <h4 className={`mb-3 text-[19px] font-bold ${CY}`}>바텀업 (Bottom-up)</h4>
                {[["1", "무가 다량 진행"], ["2", "잭팟 콘텐츠 분석"], ["3", "유가·메가로 확장"]].map(([n, t]) => (
                  <div key={n} className="mb-2 flex items-center gap-2.5"><span className="grid h-6 w-6 place-items-center rounded-full bg-sky-500 text-[11px] font-bold text-white">{n}</span>{t}</div>
                ))}
                <p className="mt-3 text-[12.5px] italic text-[var(--muted)]">소형·중형 기업 진입 시 주로 권장</p>
              </div>
              <div className={card}>
                <h4 className={`mb-3 text-[19px] font-bold ${PK}`}>탑다운 (Top-down)</h4>
                {[["1", "메가 크리에이터 캠페인"], ["2", "콘텐츠 라이선스 확보"], ["3", "소스 재활용·리뷰"]].map(([n, t]) => (
                  <div key={n} className="mb-2 flex items-center gap-2.5"><span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">{n}</span>{t}</div>
                ))}
                <p className="mt-3 text-[12.5px] italic text-[var(--muted)]">메가에서 아래로 내려오는 방식</p>
              </div>
            </div>
            <Call><b className={CY}>밸런스가 관건</b> — 무가:유가 = 7:3 ~ 9:1. 바텀업·탑다운을 상황(예산·오프라인 행사·팝업)에 맞게 오가는 것이 가장 이상적입니다.</Call>
          </section>

          {/* 7. 상품 구성 */}
          <section id="s7" className="scroll-mt-8 pt-14">
            <Kick>Product Strategy</Kick>
            <H2>7. 상품 구성 전략 — 번들 / 세트</H2>
            <Call pink><b className={PK}>크리에이터의 선호</b> — &quot;개별 단가는 싼 것&quot;을, &quot;어필리에이트 판매 상품은 단가 높은 것&quot;을 선호합니다. 예: 개별 3~4만원 → 판매 구성은 25~29만원 (수수료를 더 많이 가져가기 위함).</Call>
            <div className="grid gap-4 md:grid-cols-2">
              <div className={card}><h4 className={`mb-2 text-[18px] font-bold ${CY}`}>세트 구성</h4><p className="text-[13.5px] text-slate-600">제품 여러 개를 묶는 방식(예: 루틴 세트). 색조는 색조대로, 기초는 기초대로 각각의 세트 전략이 존재합니다.</p></div>
              <div className={card}><h4 className={`mb-2 text-[18px] font-bold ${PK}`}>번들 구성</h4><p className="text-[13.5px] text-slate-600">사용법에 맞춰 번들 세트를 함께 구성하는 방식입니다.</p></div>
            </div>
            <p className="mt-3.5 text-[13px] italic text-[var(--muted)]">물류 연계: 총량 입고 후 현지에서 두세 박스로 인가공(FBT는 약간 조율 가능, 3PL은 협의). 인기 없을 때 재해체 비용을 줄이는 방식이 베스트.</p>
          </section>

          {/* 8. 크리에이터·국가 */}
          <section id="s8" className="scroll-mt-8 pt-14">
            <Kick>Creators &amp; Accounts</Kick>
            <H2>8. 크리에이터 모집 &amp; 국가·계정 구조</H2>
            <h3 className="mb-3 mt-6 text-[17px] font-bold">크리에이터 모집 3루트</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {[["1 디스코드 접수", "국가별 디스코드 망(미국 약 2만 명). \"리뷰할 사람 손들어\" → 레벨·GMV 보고 수락.", false], ["2 아웃리치", "틱톡 크리에이터 창에 직접 오퍼 발송. 시스템상 월 500개가 맥스.", false], ["3 메가", "개별 협상 — 에이전시와 협의해 링크 연결.", true]].map(([t, d, pk]) => (
                <div key={t as string} className={card}>
                  <div className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold text-white ${pk ? "bg-[var(--accent)]" : "bg-sky-500"}`}>{t}</div>
                  <p className="mt-2.5 text-[13px] text-slate-600">{d}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4"><div className={`text-[42px] font-extrabold ${CY}`}>98%</div><div><b>무가 시딩 이행률</b><p className="text-[12.5px] text-[var(--muted)]">안 올리면 틱톡 페널티. 초기엔 신뢰도 높은 크리에이터 위주. (1,000개 초과 시 80%대)</p></div></div>
              <div className={card}><b className={PK}>수량은 제품 공급에 달렸다</b><p className="mt-1.5 text-[13px] text-slate-600">계약서상 20~30개 개런티지만, 제품 100개 주시면 최대한 모아 드립니다. 무가는 제품 허용만 하면 수량 제한 없음.</p></div>
            </div>
            <h3 className="mb-3 mt-6 text-[17px] font-bold">국가 · 계정 구조 (꼭 이해)</h3>
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <table className="w-full border-collapse text-[13px]">
                <tbody>
                  {[["미국 샵 커버 국가", "미국(북미)만. 캐나다 불가"], ["한국 틱톡커 → 미국 샵", "연동 불가. 미국 어필리에이트 별도 신청·인증 필요"], ["한국인이 미국 샵을 하려면", "\"한국인으로 미국 틱톡샵 크리에이터 되기\" 등 별도 루트"], ["소싱 vs 등록", "소싱(섭외)은 외부 가능 / 등록·연동은 틱톡 안에서"]].map(([k, v]) => (
                    <tr key={k}><td className="border border-[var(--border)] bg-slate-50 p-2.5 text-left font-bold text-sky-700">{k}</td><td className="border border-[var(--border)] bg-white p-2.5 text-left">{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Call pink><b className={PK}>자체 영업 가능</b> — 브랜드와 틱톡커가 조건만 합의하면 크리에이터 코드 발행·연동으로 직접 섭외할 수 있습니다. (계정은 국가별 1:1 매칭, 전 세계 공용 아님)</Call>
          </section>

          {/* 9. 예산 */}
          <section id="s9" className="scroll-mt-8 pt-14">
            <Kick>Budget</Kick>
            <H2>9. 예산 구조 — 제안은 두 가지 매트릭스</H2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className={card}>
                <span className="inline-block rounded-2xl bg-sky-500 px-3.5 py-1.5 text-[12px] font-extrabold text-white">① 어필리에이트 예산</span>
                <h4 className="mt-3.5 text-[15px] font-bold">무가 운영 예산</h4>
                <p className="mb-3 text-[13px] text-slate-600">예: 100~200명 모집·진행 오퍼레이션 비용(현물이어도 운영비 발생)</p>
                <h4 className="text-[15px] font-bold">유가 시딩 비용</h4>
                <p className="text-[13px] text-slate-600">한국 인플루언서 시딩처럼 지급(100만~500만) + 어필리에이트</p>
              </div>
              <div className={card}>
                <span className="inline-block rounded-2xl bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-extrabold text-white">② 부스팅 예산</span>
                <p className="my-3 font-bold">에이전시에 주는 게 아니라 틱톡에 카드(한도)를 연결해 &quot;스탠바이&quot;</p>
                <ul className="space-y-1.5 text-[13px] text-slate-600">
                  <li>• 성과가 났을 때만 집행 (잡아두면 유리)</li>
                  <li>• 실시간성(주로 새벽) → 예비 예산으로</li>
                  <li>• ROAS 기준표 사전 제공 → 충족 시 증액, 미달 시 홀드</li>
                </ul>
              </div>
            </div>
            <p className="mt-3.5 text-[13px] italic text-[var(--muted)]">+ 바우처: 틱톡 내에서 당겨오는 광고 상품을 시기에 맞춰 프로모션에 활용</p>
          </section>

          {/* 10. 온보딩 */}
          <section id="s10" className="scroll-mt-8 pt-14">
            <Kick>Onboarding Flow</Kick>
            <H2>10. 온보딩 프로세스 (가입 → 제품 등록)</H2>
            <Lead>가입 단계에 &quot;가부(승인/거절) 결정&quot;은 없음 — 절차를 밟으면 시간에 맞춰 승인됩니다.</Lead>
            <div className="flex flex-wrap items-stretch gap-2">
              {[["1", "가입 신청", "인바이트 링크·서류 → 신청 완료", "sky"], ["2", "3단계", "KYC 인증 / 물류 서류 / 인증 체크", "sky"], ["3", "디파짓", "미국 1,500불·동남아 100불 · 면제 트랙 협의", "cyan"], ["4", "제품 등록", "1개씩 검수(초기 ~10개) · 제품당 하루 소요", "cyan"], ["5", "스탠바이", "입고 완료 → 시딩 준비", "pink"]].map(([n, t, d, c], i, arr) => (
                <div key={n as string} className="flex items-stretch">
                  <div className={`${card} min-w-[140px] flex-1 text-center`}>
                    <div className={`mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full text-[16px] font-extrabold text-white ${c === "pink" ? "bg-[var(--accent)]" : c === "cyan" ? "bg-sky-400" : "bg-sky-500"}`}>{n}</div>
                    <h4 className="text-[15px] font-bold">{t}</h4>
                    <p className="mt-1 text-[12px] text-[var(--muted)]">{d}</p>
                  </div>
                  {i < arr.length - 1 && <div className="flex w-7 items-center justify-center text-[22px] font-extrabold text-slate-300">›</div>}
                </div>
              ))}
            </div>
            <Call><b className={CY}>전체 일정: 빠르면 2주 이내, 늦으면 약 한 달.</b> 디파짓은 현재까지 모든 팀이 면제 트랙으로 진행 · 제품 등록은 10개 넘어가면 대량 가능.</Call>
          </section>

          {/* 11. 물류 */}
          <section id="s11" className="scroll-mt-8 pt-14">
            <Kick>Logistics</Kick>
            <H2>11. 물류 — FBT · 3PL · 크로스보더</H2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className={card}><h4 className={`mb-2 text-[19px] font-bold ${CY}`}>FBT</h4><p className="text-[13px] text-slate-600">틱톡 자체 물류(미국 26개 지역). 하자 처리 수월. 물량 차오르면 권장. 단 3자 물류는 안 받음.</p></div>
              <div className={card}><h4 className="mb-2 text-[19px] font-bold text-sky-500">3PL</h4><p className="text-[13px] text-slate-600">일반 3자 물류. 초기엔 3PL로 시작, 물량 늘면 FBT 병행(투트랙) 권장.</p></div>
              <div className={card}><h4 className="mb-2 text-[19px] font-bold text-slate-400">FBA</h4><p className="text-[13px] text-slate-600">아마존 물류. 산정은 해주나 틱톡용 3자 물류로는 사용 불가.</p></div>
            </div>
            <div className="mt-4 rounded-2xl border border-sky-300 bg-white p-5">
              <h4 className={`mb-3 text-[18px] font-bold ${CY}`}>크로스보더 (동남아 5개국 + 일본)</h4>
              <div className="mb-3.5 flex flex-wrap items-stretch gap-2">
                {[["브랜드 창고", "또는 3PL 입고"], ["영종도 아레나스", "틱톡 물류창고"], ["각국 고객", "틱톡 도어투도어 (D3 목표·D5 맥스)"]].map(([t, d], i, arr) => (
                  <div key={t} className="flex items-stretch">
                    <div className="min-w-[130px] rounded-xl border border-[var(--border)] bg-slate-50 p-3 text-center"><h4 className="text-[14px] font-bold">{t}</h4><p className="mt-0.5 text-[12px] text-[var(--muted)]">{d}</p></div>
                    {i < arr.length - 1 && <div className="flex w-7 items-center justify-center text-[20px] font-extrabold text-slate-300">›</div>}
                  </div>
                ))}
              </div>
              <ul className="space-y-1.5 text-[13px] text-slate-700">
                <li>• <b>대상</b>: 베트남·필리핀·말레이시아·싱가포르·태국 + 일본</li>
                <li>• <b>인증</b>: 베트남·태국은 등록 시 인증서 필수(없으면 불가) · 준비는 병렬로(길면 12~18개월)</li>
                <li>• <b>정산</b>: 크로스보더 매출도 한국 본사로 직접 정산</li>
              </ul>
            </div>
            <Call pink><b className={PK}>그레이존 &amp; 리스크</b> — 통관은 틱톡이 책임지지만, 인증 없이 진행하면 크리에이터 손해·세무조사 등 리스크. 문제 시 샵이 홀드(잠김)되며 이후 해제 가능.</Call>
          </section>

          {/* 12. 정산/CS/서류 */}
          <section id="s12" className="scroll-mt-8 pt-14">
            <Kick>Settlement &amp; CS</Kick>
            <H2>12. 정산 · CS · 서류</H2>
            <div className="space-y-3">
              {[["1", "플랫폼 정산", "모든 정산은 플랫폼 내에서 처리, 셀러는 정산금만 받음. 어필리에이트 커미션은 틱톡이 대금 수취 후 제하고 정산(커미션은 국가·인플루언서별 상이, 예 15~30%).", false], ["2", "샵 CS", "제품 환불·문제·질의를 실시간 대응. 샵 헬스(Shop Health)에 가장 큰 영향 → 부정 댓글 대응 포함. 크리에이터 문의는 별도 웹폼으로 접수 가능.", true], ["3", "수출 서류", "수출 신고·실적 증빙(금액 기재)은 틱톡으로부터 발급.", false]].map(([n, t, d, pk]) => (
                <div key={n as string} className="flex items-start gap-4 rounded-xl border border-[var(--border)] bg-white p-4">
                  <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] font-extrabold text-white ${pk ? "bg-[var(--accent)]" : "bg-sky-500"}`}>{n}</div>
                  <div><h4 className="text-[15px] font-bold">{t}</h4><p className="mt-0.5 text-[13.5px] text-slate-600">{d}</p></div>
                </div>
              ))}
            </div>
            <Call>온보딩 이후: <b>샵 오픈(2~3주 내) → 설문지 제출(맞춤 전략의 핵심) → 마케팅 회의(전략 수립) → 실무 진행</b>. 온보딩 완료 시 콘텐츠 레퍼런스 사이트의 프로 계정 권한도 제공됩니다.</Call>
          </section>

          {/* FAQ */}
          <section id="faq" className="scroll-mt-8 pt-14">
            <Kick pink>FAQ</Kick>
            <H2>자주 묻는 질문</H2>
            <Lead>온보딩 설명 회의에서 실제로 나온 Q&amp;A입니다.</Lead>
            <div className="space-y-2.5">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group overflow-hidden rounded-xl border border-[var(--border)] bg-white">
                  <summary className="flex cursor-pointer list-none items-start gap-2.5 p-4 text-[14.5px] font-semibold marker:hidden">
                    <span className={`font-extrabold ${PK}`}>Q</span> {q}
                  </summary>
                  <div className="px-4 pb-4 pl-10 text-[13.5px] leading-relaxed text-slate-600">{a}</div>
                </details>
              ))}
            </div>
          </section>

          {/* 용어집 */}
          <section id="gloss" className="scroll-mt-8 pt-14">
            <Kick>Glossary</Kick>
            <H2>핵심 용어집</H2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {GLOSS.map(([t, d]) => (
                <div key={t} className="rounded-xl border border-[var(--border)] bg-white p-3.5"><b className={`text-[13.5px] ${CY}`}>{t}</b><p className="mt-0.5 text-[12.5px] text-[var(--muted)]">{d}</p></div>
              ))}
            </div>
            <footer className="mt-16 border-t border-[var(--border)] pt-6 text-center text-[12.5px] text-slate-400">본 자료는 2026.08.07 온보딩 설명 회의 내용을 바탕으로 정리되었습니다. · 브랜드사 대상 설명자료 (비공개)</footer>
          </section>
        </main>
      </div>
      <ScrollSpy />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <style dangerouslySetInnerHTML={{ __html: `.spy-active{background:#fff;color:var(--accent)!important;border-left-color:var(--accent)!important}` }} />
    </div>
  );
}

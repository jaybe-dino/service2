import type { Metadata } from "next";
import Protect from "./protect";

// 온라인 열람 전용 E-book — 파일 다운로드 없음(콘텐츠는 페이지에만 존재).
// 검색·AI 비노출: noindex + robots.ts disallow + 미들웨어 AI 봇 403.
export const metadata: Metadata = {
  title: "Glovek 가이드북 — 대량 메일 발송 운영",
  robots: { index: false, follow: false },
};

function Chapter({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10" id={`ch${no}`}>
      <div className="text-[11px] font-black tracking-[3px] text-violet-500">CHAPTER {no}</div>
      <h2 className="mt-1.5 text-[22px] font-black tracking-tight">{title}</h2>
      <div className="mt-5 space-y-3 text-[14px] leading-relaxed text-slate-700">{children}</div>
    </section>
  );
}
const Th = ({ children }: { children: React.ReactNode }) => <th className="border-b border-slate-200 bg-slate-50 p-2.5 text-left text-[11px] font-bold uppercase text-slate-500">{children}</th>;
const Td = ({ children, strong }: { children: React.ReactNode; strong?: boolean }) => <td className={`border-b border-slate-100 p-2.5 text-[13px] ${strong ? "font-bold" : ""}`}>{children}</td>;

const TOC = [
  ["0", "하루 운영 루틴"], ["1", "발송 전 1회 세팅"], ["2", "계정·한도 정책"], ["3", "리스트 품질"],
  ["4", "콘텐츠 규칙"], ["5", "발송 운영"], ["6", "지표 기준선"], ["7", "사고 대응"], ["8", "Instagram DM"],
];

export default function GuidebookPage() {
  return (
    <Protect>
      <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 pb-24">
        {/* 커버 */}
        <div className="bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#1A56DB] px-6 py-20 text-center text-white">
          <div className="text-[11px] font-black uppercase tracking-[4px] text-violet-300">Glovek Operations Guidebook</div>
          <h1 className="mx-auto mt-4 max-w-2xl text-[34px] font-black leading-tight sm:text-[42px]">대량 메일 발송<br />운영 가이드북</h1>
          <p className="mx-auto mt-4 max-w-xl text-[14px] text-white/80">
            글로벌 크리에이터 아웃리치를 스팸함에 넣지 않고 운영하는 규율 — 도구가 막아주는 것과 사람이 지켜야 하는 것.
          </p>
          <div className="mt-6 text-[11px] text-white/60">v1.1 · 2026.09 · 온라인 열람 전용 (다운로드·인쇄·복사 불가)</div>
        </div>

        {/* 목차 */}
        <div className="mx-auto -mt-10 max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="text-[11px] font-black tracking-[3px] text-slate-400">CONTENTS</div>
          <div className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            {TOC.map(([no, t]) => (
              <a key={no} href={`#ch${no}`} className="flex items-baseline gap-2 rounded px-1 py-1 text-[13.5px] font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-700">
                <span className="w-5 text-right font-black text-violet-400">{no}</span> {t}
              </a>
            ))}
          </div>
        </div>

        <Chapter no="0" title="하루 운영 루틴 — 한 장 요약">
          <ol className="list-decimal space-y-2 pl-5">
            <li>어드민 대시보드에서 <b>어제 성과·반송률·발신함 상태</b> 확인</li>
            <li>회신함 <b>동기화 → 신규 회신 초안 일괄 생성</b> → 초안 검토·발송</li>
            <li>신규 캠페인은 <b>스팸 점검 &ldquo;주의&rdquo; 이하</b> + <b>본인 메일 테스트 발송</b>(스팸함 확인) 후에만 생성</li>
            <li>발송 배치 실행 — 워밍업·한도는 시스템이 자동 통제</li>
            <li>반송·수신거부 숫자에 이상 징후가 보이면 발송을 멈추고 원인부터 확인</li>
          </ol>
        </Chapter>

        <Chapter no="1" title="발송 전 1회 세팅 (신규 도메인·계정)">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[520px]">
              <thead><tr><Th>항목</Th><Th>기준</Th></tr></thead>
              <tbody>
                <tr><Td strong>도메인 인증</Td><Td>SPF·DKIM·DMARC 3종 모두 통과 (어드민 DNS 점검 탭)</Td></tr>
                <tr><Td strong>발송 도메인 분리</Td><Td>메인 도메인으로 대량발송 금지 — 발송 전용 도메인/서브도메인 사용 (평판 오염에서 메인 보호)</Td></tr>
                <tr><Td strong>Workspace 결제</Td><Td>평가판 500통/일 · 정식 2,000통/일 — 대량발송 전 정식 전환</Td></tr>
                <tr><Td strong>계정 나이</Td><Td>생성 2주 미만 계정은 수십 통 수준으로 스로틀 — 일반 메일로 먼저 숙성</Td></tr>
                <tr><Td strong>수신거부</Td><Td>List-Unsubscribe 헤더·링크 자동 삽입 (Gmail/Yahoo 필수요건 — 시스템 자동)</Td></tr>
              </tbody>
            </table>
          </div>
        </Chapter>

        <Chapter no="2" title="계정·한도 정책">
          <p><b>구글이 정하는 한도(우리가 못 늘림):</b> 정식 2,000/일 · 평가판 500/일 · 신규 계정 수십~수백 통. 한도 도달 시 24시간 후 자동 회복 — 시스템이 미발송분을 큐에 유지하므로 다음 날 발송만 재실행.</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>신규 발신함: <b>일일 한도 100 이하 + 워밍업 ON</b> (30→40→60→80→120→160→220→300→400→500, 10일 커브)</li>
            <li>숙성 발신함(4주+, 반송 안정): 300~500</li>
            <li>물량 확장은 한도 상향이 아니라 <b>발신함 추가 로테이션</b>으로 (3~5개 복수 선택 시 자동 분산)</li>
            <li>반송률 7일 2% 초과 → 시스템이 발신함 <b>자동 일시정지</b>. 원인 해소 전 재활성 금지, 재활성 시 워밍업 재시작</li>
          </ul>
        </Chapter>

        <Chapter no="3" title="리스트 품질 규칙">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>세그먼트는 <b>M1(실적+컨택) 우선</b> — 콜드풀(M3)은 워밍업 완료 발신함으로만</li>
            <li>제외목록(수신거부·반송)은 절대 우회하지 않는다 — 시스템이 발송 전 자동 스킵</li>
            <li>같은 수신자 30일 내 중복 캠페인 금지 (제품이 달라도 피로도는 누적)</li>
            <li>오래된 리스트(6개월+)는 반송 폭탄 — 50통 파일럿으로 반송률 측정 후 확장</li>
          </ul>
        </Chapter>

        <Chapter no="4" title="콘텐츠 규칙">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>발송 전 <b>스팸 점검 필수</b> — &ldquo;위험&rdquo;은 수정 전 발송 금지</li>
            <li>개인화 변수 <b>최소 1개</b> — 전달률에 가장 효과 큰 단일 요소</li>
            <li>링크 1~2개, 단축 URL 금지 · 제목 50자 이내, 느낌표·대문자 남발 금지, 가짜 Re: 금지</li>
            <li>신규 템플릿은 <b>테스트 발송으로 받은편지함/스팸함 도착 위치 확인</b> 후 캠페인 생성</li>
            <li>AI 오프닝(L2)은 워밍업 끝난 발신함 + 상위 타깃에 사용</li>
          </ul>
        </Chapter>

        <Chapter no="5" title="발송 운영 규칙">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>배치 30통 단위 — 시스템이 무작위 간격으로 발송(패턴 제거)</li>
            <li>발송 시간대는 <b>수신자 국가 기준 평일 오전 9~11시</b> (US는 한국 밤~새벽)</li>
            <li>캠페인+답장+테스트가 구글 카운터에는 전부 합산됨을 감안</li>
            <li>첫 캠페인은 항상 <b>50~100명 파일럿</b> → 지표 확인 → 본 발송</li>
          </ul>
        </Chapter>

        <Chapter no="6" title="지표 기준선 — 이탈 시 발송 중단">
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[560px]">
              <thead><tr><Th>지표</Th><Th>정상</Th><Th>경고</Th><Th>조치</Th></tr></thead>
              <tbody>
                <tr><Td strong>오픈율</Td><Td>30%+</Td><Td>&lt;20%</Td><Td>제목·평판 점검, 테스트 발송으로 스팸함 확인</Td></tr>
                <tr><Td strong>회신율</Td><Td>3~5%</Td><Td>&lt;1%</Td><Td>타깃·템플릿 재검토(개인화 강화)</Td></tr>
                <tr><Td strong>반송률</Td><Td>&lt;1%</Td><Td>2%+</Td><Td>자동 일시정지 발동 — 리스트 품질 점검</Td></tr>
                <tr><Td strong>수신거부율</Td><Td>&lt;0.3%</Td><Td>0.5%+</Td><Td>타깃 미스매치 — 세그먼트 좁히기</Td></tr>
                <tr><Td strong>스팸 신고율</Td><Td>&lt;0.1%</Td><Td>0.1%+</Td><Td>즉시 발송 중단 — Gmail 요건 위반선</Td></tr>
              </tbody>
            </table>
          </div>
        </Chapter>

        <Chapter no="7" title="사고 대응 플레이북">
          <ul className="list-disc space-y-1.5 pl-5">
            <li><b>&ldquo;Gmail 한도 도달&rdquo;</b>: 정상 동작 — 미발송분 큐 유지, 다음 날 재실행. 반복되면 2장 계정 상태 확인</li>
            <li><b>발신함 자동 일시정지</b>: 사유 확인 → 리스트 정리 → 재활성 + 워밍업 ON</li>
            <li><b>오픈율 급락(스팸함 의심)</b>: 즉시 중단 → 테스트 발송 확인 → 물량 절반 감축 + 1주 관찰</li>
            <li><b>DMARC 인증 실패</b>: DNS 재점검, 위임(DWD) scope 재승인</li>
          </ul>
        </Chapter>

        <Chapter no="8" title="Instagram DM 채널 (참고)">
          <p>현재 시스템은 이메일 전용. DM 채널 확장 시 핵심 규칙:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>숙성된(건강한) 계정만 대량 DM 가능 — 좋은 컨디션 기준 일 200통 수준</li>
            <li>웜업·발송은 모바일 환경이 PC보다 한도가 높음</li>
            <li><b>대량 발송 + 무회신 누적 = 계정 제한 직행</b> — 회신 가능성 높은 타깃(M1)에게 소량부터</li>
            <li>이메일과 같은 원리: 웜업 → 소량 → 반응 보며 증량. 반응 없는 밀어내기가 가장 빠른 정지 사유</li>
          </ul>
          <p className="text-[13px] text-slate-500">도입 시 수동 운영(추천 목록 + DM 문구 생성 지원) 또는 검증된 도구 연동이 현실적 — 비공식 자동화 자체 구축은 비권장.</p>
        </Chapter>

        <div className="mx-auto mt-10 max-w-3xl px-6 text-center text-[11px] text-slate-400">
          © Glovek · 본 가이드북은 온라인 열람 전용이며 무단 복제·배포를 금합니다.
        </div>
      </div>
    </Protect>
  );
}

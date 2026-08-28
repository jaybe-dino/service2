import type { Metadata } from "next";
import PageShell from "@/components/ktrend/PageShell";

export const metadata: Metadata = {
  title: "취소 및 환불 정책 — Glovek",
  description: "Glovek 플랫폼 구독 및 틱톡샵 멀티몰 입점 서비스의 결제 취소·계약 해지·환불 규정.",
  alternates: { canonical: "/refund" },
};

// 나이스페이 심사 대응 — 상품 상세(결제) 페이지에서 링크되는 취소·환불 규정 전문.
// 원문: GloveK 취소 및 환불 정책 (시행일 2026-08-01)

function Article({ no, title, children }: { no: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[15px] font-black">제{no}조 ({title})</h2>
      <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-[var(--fg)]">{children}</div>
    </section>
  );
}

export default function RefundPolicyPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl pb-16">
        <h1 className="text-[24px] font-black tracking-tight">취소 및 환불 정책</h1>
        <p className="mt-1 text-[12px] text-[var(--muted)]">시행일: 2026년 8월 1일</p>

        <Article no={1} title="목적 및 적용범위">
          <p>
            본 정책은 주식회사 디노스튜디오(이하 &ldquo;회사&rdquo;)가 홈페이지(https://glovek.space)를 통해 제공하는 아래 서비스의
            결제 취소, 계약 해지 및 환불에 관한 사항을 정합니다.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li><b>GloveK 플랫폼 구독 서비스</b> — Pro 요금제(월 89,000원), Advance 요금제(월 159,000원)</li>
            <li><b>틱톡샵 멀티몰 입점 서비스</b> — Live Focus Track(월 490,000원), Onboarding Track(별도 협의)</li>
          </ul>
          <p className="text-[11px] text-[var(--muted)]">
            ※ 표시 금액은 부가가치세 포함 기준입니다.<br />
            ※ 개별 계약서 또는 별도 약정이 있는 경우 해당 약정이 본 정책에 우선합니다.
          </p>
        </Article>

        <Article no={2} title="결제 및 자동갱신">
          <ol className="list-decimal space-y-1 pl-5">
            <li>모든 서비스는 월 단위 정기결제(자동갱신) 방식으로 제공되며, 이용기간은 결제일로부터 1개월입니다.</li>
            <li>이용자가 해지 신청을 하지 않는 한, 매 결제주기 만료일에 등록된 결제수단으로 동일 금액이 자동 청구됩니다.</li>
            <li>회사는 자동결제 예정일 최소 7일 전까지 이용자에게 결제 예정 사실, 금액, 해지 방법을 이메일 등으로 고지합니다.</li>
          </ol>
        </Article>

        <Article no={3} title="해지 신청 및 효력">
          <ol className="list-decimal space-y-1 pl-5">
            <li>이용자는 서비스 내 [설정 &gt; 구독관리] 또는 고객센터를 통해 언제든지 해지를 신청할 수 있습니다.</li>
            <li>
              <b>차기 결제 중단만을 원하는 경우:</b> 다음 결제일 24시간 전까지 신청하면 추가 청구 없이 종료되며,
              이미 결제한 기간의 만료일까지는 서비스를 정상 이용할 수 있습니다. 이 경우 별도 환불은 발생하지 않습니다.
            </li>
            <li>
              <b>이용기간 중 즉시 해지(중도해지)를 원하는 경우:</b> 제4조 또는 제5조에 따라 환불이 처리되며,
              환불 처리와 동시에 서비스 이용이 종료됩니다.
            </li>
          </ol>
        </Article>

        <Article no={4} title="GloveK 플랫폼 구독의 청약철회 및 환불">
          <ol className="list-decimal space-y-1 pl-5">
            <li><b>전액 환불</b> — 결제일로부터 7일 이내이고, 해당 결제주기의 유료 기능을 전혀 이용하지 않은 경우 전액 환불합니다.</li>
            <li>
              <b>부분 환불(중도해지)</b> — 이용을 개시한 후 해지하는 경우, 아래 산식에 따라 환불합니다.
              <div className="mt-1.5 rounded-lg bg-slate-50 px-4 py-3 text-[12px]">
                환불액 = 결제금액 − (일할 이용요금 × 이용일수) − 위약금(결제금액의 10%)
                <div className="mt-1 text-[11px] text-[var(--muted)]">※ 일할 이용요금 = 결제금액 ÷ 해당 월의 총 일수, 이용일수는 이용 개시일 포함</div>
              </div>
            </li>
            <li>산정 결과 환불액이 0원 이하인 경우 환불금은 발생하지 않습니다.</li>
            <li>무료체험 기간 중 해지 시 청구되지 않으며, 무료체험 종료 후 유료 전환된 건은 본 조 제1항·제2항을 따릅니다.</li>
          </ol>
        </Article>

        <Article no={5} title="틱톡샵 멀티몰 입점 서비스의 환불">
          <p>본 서비스는 회사의 인력·운영 리소스가 투입되는 용역이므로, 업무 착수 여부를 기준으로 다음과 같이 처리합니다.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-slate-50 text-left text-[11px] text-[var(--muted)]">
                  <th className="p-2.5">구분</th>
                  <th className="p-2.5">환불 기준</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border)]"><td className="p-2.5">결제 후 업무 착수 전 (계정 세팅·상품 등록·라이브 편성 등 개시 전)</td><td className="p-2.5 font-bold">전액 환불</td></tr>
                <tr className="border-b border-[var(--border)]"><td className="p-2.5">업무 착수 후 ~ 이용기간 1/3 경과 이전</td><td className="p-2.5 font-bold">결제금액의 60% 환불</td></tr>
                <tr className="border-b border-[var(--border)]"><td className="p-2.5">이용기간 1/3 경과 후 ~ 1/2 경과 이전</td><td className="p-2.5 font-bold">결제금액의 30% 환불</td></tr>
                <tr><td className="p-2.5">이용기간 1/2 경과 후</td><td className="p-2.5 font-bold">환불 불가</td></tr>
              </tbody>
            </table>
          </div>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Onboarding Track은 견적·범위가 개별 협의되는 맞춤형 용역이므로, 환불 기준은 개별 계약서에 따릅니다. 별도 정함이 없는 경우 본 조의 기준을 준용합니다.</li>
            <li>이용자가 제공한 자료의 미제출·지연, 셀러 계정 정지, 플랫폼 정책 위반 등 이용자 귀책 사유로 업무가 지연·중단된 기간은 이용기간에 산입되며 환불 대상에서 제외됩니다.</li>
          </ol>
        </Article>

        <Article no={6} title="환불이 제한되는 경우">
          <ul className="list-disc space-y-1 pl-5">
            <li>이용자가 이용약관을 위반하여 이용이 정지·해지된 경우</li>
            <li>이용자의 부정한 방법(계정 공유·크롤링·리셀링 등)이 확인된 경우</li>
            <li>프로모션·이벤트로 무상 제공되었거나 별도 환불불가 조건이 사전 고지된 상품</li>
            <li>제3자 플랫폼(TikTok Shop 등)의 정책 변경·계정 제재 등 회사의 귀책이 아닌 사유로 이용자가 서비스를 활용하지 못한 경우</li>
          </ul>
        </Article>

        <Article no={7} title="회사 귀책에 따른 환불">
          <ol className="list-decimal space-y-1 pl-5">
            <li>회사의 귀책으로 서비스가 연속 24시간 이상 또는 월 누적 72시간 이상 중단된 경우, 이용자는 해당 결제주기 요금의 잔여분에 대해 위약금 공제 없이 환불을 요청할 수 있습니다.</li>
            <li>정기 점검 등 사전 고지된 중단 시간은 산입하지 않습니다.</li>
          </ol>
        </Article>

        <Article no={8} title="환불 절차 및 처리기간">
          <ol className="list-decimal space-y-1 pl-5">
            <li>환불은 원칙적으로 결제 시 사용한 수단으로 원거래 취소 방식으로 처리합니다.</li>
            <li>회사는 환불 사유를 확인한 날로부터 3영업일 이내에 환불 또는 결제취소 요청을 진행합니다.</li>
            <li>카드사·PG사 사정에 따라 실제 입금·취소 반영까지 영업일 기준 3~7일이 추가 소요될 수 있으며, 이는 회사의 책임 범위를 벗어납니다.</li>
            <li>계좌 환불이 불가피한 경우 예금주명이 결제자와 동일해야 하며, 송금 수수료는 회사가 부담합니다.</li>
            <li>세금계산서·현금영수증이 발행된 건은 환불 시 수정발행 처리됩니다.</li>
            <li>프로모션 할인·쿠폰이 적용된 결제는 실제 결제금액을 기준으로 환불액을 산정합니다.</li>
          </ol>
        </Article>

        <Article no={9} title="문의처">
          <ul className="space-y-0.5 text-[12.5px]">
            <li>상호: 주식회사 디노스튜디오 / 대표자: 허정발</li>
            <li>사업자등록번호: 688-87-01213 / 통신판매업신고번호: 제2021–서울서초2493호</li>
            <li>주소: 서울특별시 서초구 사임당로 26, 8층 802호</li>
            <li>이메일: chief@dinostudio.kr / 전화: 010-5663-1273 / 운영시간: 평일 09:00~18:00</li>
          </ul>
        </Article>

        <Article no={10} title="정책의 변경">
          <p>
            본 정책이 변경되는 경우 회사는 적용일자 및 변경사유를 명시하여 적용일 7일 전(이용자에게 불리한 변경은 30일 전)부터
            홈페이지에 공지합니다. 이미 결제된 건에는 결제 시점의 정책이 적용됩니다.
          </p>
        </Article>
      </div>
    </PageShell>
  );
}

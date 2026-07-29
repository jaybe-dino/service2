import type { Metadata } from "next";
import PageShell from "@/components/ktrend/PageShell";

export const metadata: Metadata = {
  title: "개인정보처리방침 — Glovek",
  description: "Glovek 개인정보 수집·이용에 대한 처리방침.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-[24px] font-black tracking-tight">개인정보처리방침</h1>
        <p className="mt-1 text-[12px] text-[var(--muted)]">시행일: 2026년 6월 10일</p>

        <p className="mt-6 text-[12px] leading-relaxed text-[var(--muted)]">
          디노스튜디오(이하 &quot;회사&quot;)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를
          다음과 같이 수집·이용·보관합니다.
        </p>

        <div className="mt-6 space-y-6">
          <Section h="1. 수집하는 개인정보 항목">
            <Table
              rows={[
                ["회원가입", "이름, 이메일, 비밀번호(암호화), 담당 브랜드, 직무"],
                ["유료결제", "결제 승인정보, 주문번호, 결제수단 식별값(빌링키) — 카드번호는 회사가 저장하지 않음"],
                ["문의·제안", "이메일, 문의 내용, 회사/브랜드명"],
                ["자동수집", "접속 로그, 쿠키(세션), 서비스 이용 기록"],
              ]}
            />
          </Section>

          <Section h="2. 개인정보의 수집·이용 목적">
            <List items={[
              "회원 식별 및 가입·로그인, 서비스 제공",
              "유료서비스 결제·정기결제 및 정산, 환불 처리",
              "문의·마케팅 상담·틱톡샵 온보딩 등 요청 응대",
              "서비스 개선, 부정이용 방지 및 통계 분석",
            ]} />
          </Section>

          <Section h="3. 보유 및 이용 기간">
            <List items={[
              "회원정보: 회원 탈퇴 시까지 (관련 법령에 따른 보존 의무가 있는 경우 해당 기간)",
              "전자상거래 관련 기록: 「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 계약·결제·청약철회 기록 5년, 소비자 불만·분쟁처리 기록 3년",
              "접속 로그: 「통신비밀보호법」에 따라 3개월",
            ]} />
          </Section>

          <Section h="4. 개인정보의 제3자 제공 및 처리위탁">
            <List items={[
              "회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.",
              "결제 처리를 위해 결제대행사(나이스페이먼츠)에 결제 정보가 위탁·전달될 수 있습니다.",
              "클라우드 인프라(호스팅·데이터베이스) 운영을 위한 위탁이 있을 수 있으며, 위탁 시 관련 법령에 따라 안전하게 관리합니다.",
            ]} />
          </Section>

          <Section h="5. 이용자의 권리">
            <List items={[
              "이용자는 언제든 본인의 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다.",
              "회원 탈퇴 및 개인정보 관련 요청은 chief@dinostudio.kr 로 접수할 수 있습니다.",
            ]} />
          </Section>

          <Section h="6. 개인정보의 안전성 확보 조치">
            <List items={[
              "비밀번호는 일방향 암호화(bcrypt)하여 저장합니다.",
              "세션은 httpOnly 쿠키로 관리하며, 통신은 HTTPS로 암호화합니다.",
              "카드 정보는 회사가 직접 저장하지 않고 PG사 빌링키 방식으로 처리합니다.",
            ]} />
          </Section>

          <Section h="7. 개인정보 보호책임자">
            <p className="text-[12px] leading-relaxed text-[var(--muted)]">
              개인정보 보호책임자: 디노스튜디오 대표 허정발<br />
              연락처: chief@dinostudio.kr · 010-5663-1273<br />
              주소: 서울특별시 서초구 사임당로 26, 8층 802호
            </p>
          </Section>
        </div>
      </div>
    </PageShell>
  );
}

function Section({ h, children }: { h: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[14px] font-bold">{h}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-[12px] leading-relaxed text-[var(--muted)]">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}
function Table({ rows }: { rows: [string, string][] }) {
  return (
    <div className="overflow-hidden rounded-md border border-[var(--border)]">
      <table className="w-full text-[12px]">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-[var(--border)] last:border-0">
              <td className="w-28 bg-[var(--accent-light)]/40 p-2 font-semibold align-top">{k}</td>
              <td className="p-2 text-[var(--muted)]">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

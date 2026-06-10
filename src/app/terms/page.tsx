import type { Metadata } from "next";
import PageShell from "@/components/ktrend/PageShell";

export const metadata: Metadata = {
  title: "이용약관 — Glovek",
  description: "Glovek 서비스 이용약관.",
  alternates: { canonical: "/terms" },
};

const SECTIONS: { h: string; b: string[] }[] = [
  { h: "제1조 (목적)", b: ["본 약관은 디노스튜디오(이하 \"회사\")가 제공하는 Glovek(이하 \"서비스\")의 이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다."] },
  { h: "제2조 (정의)", b: [
    "\"서비스\"란 회사가 제공하는 틱톡 K-뷰티 콘텐츠·브랜드·인플루언서 분석 SaaS를 말합니다.",
    "\"이용자\"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.",
    "\"유료서비스(Pro/Enterprise)\"란 회사가 유료로 제공하는 기능 및 콘텐츠를 말합니다.",
  ] },
  { h: "제3조 (약관의 효력 및 변경)", b: [
    "본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.",
    "회사는 관련 법령을 위배하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일자 및 사유를 명시하여 사전 공지합니다.",
  ] },
  { h: "제4조 (회원가입 및 계정)", b: [
    "이용자는 회사가 정한 절차에 따라 정확한 정보를 제공하여 회원가입을 신청합니다.",
    "이용자는 계정 정보를 직접 관리할 책임이 있으며, 타인에게 이용을 허락할 수 없습니다.",
  ] },
  { h: "제5조 (유료서비스 및 정기결제)", b: [
    "Pro 요금제는 카드 등록 후 7일 무료 체험 제공 후 매월 자동결제(정기결제)됩니다.",
    "이용자는 마이페이지에서 언제든 정기결제를 해지할 수 있으며, 해지 시 남은 이용기간 종료까지 서비스가 유지됩니다.",
    "이미 결제된 기간에 대한 환불은 관련 법령 및 회사의 환불정책에 따릅니다.",
  ] },
  { h: "제6조 (서비스 데이터)", b: [
    "서비스가 제공하는 조회수·참여율·추정 ROAS·추정 매출 등 일부 지표는 공개 데이터 및 예측 모델 기반의 추정치를 포함할 수 있습니다.",
    "추정 지표는 참고용이며, 회사는 그 정확성·완전성을 보증하지 않습니다.",
  ] },
  { h: "제7조 (금지행위)", b: [
    "이용자는 서비스 데이터를 무단 크롤링·복제·재판매하거나 자동화 수단으로 대량 수집해서는 안 됩니다.",
    "이용자는 서비스의 정상 운영을 방해하는 행위를 해서는 안 됩니다.",
  ] },
  { h: "제8조 (책임의 제한)", b: [
    "회사는 천재지변, 제3자 플랫폼(틱톡 등)의 정책 변경 등 불가항력으로 인한 서비스 중단에 대해 책임을 지지 않습니다.",
  ] },
  { h: "제9조 (준거법 및 관할)", b: [
    "본 약관은 대한민국 법령에 따라 해석되며, 분쟁 발생 시 회사 소재지를 관할하는 법원을 제1심 관할법원으로 합니다.",
  ] },
];

export default function TermsPage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-[24px] font-black tracking-tight">이용약관</h1>
        <p className="mt-1 text-[12px] text-[var(--muted)]">시행일: 2026년 6월 10일</p>
        <div className="mt-6 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-[14px] font-bold">{s.h}</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[12px] leading-relaxed text-[var(--muted)]">
                {s.b.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-8 text-[11px] text-[var(--muted)]">
          문의: 디노스튜디오 · chief@dinostudio.kr
        </p>
      </div>
    </PageShell>
  );
}

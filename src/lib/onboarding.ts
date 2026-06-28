// 틱톡샵 온보딩 플로우 공용 로직 (자가체크 등급 산출 + 다국가/약정 동적 요금 계산).
// 클라이언트(실시간 표시)와 서버(결제 금액 권위 계산)에서 동일하게 사용한다.
import { MALL_TRACK_MAP, type MallTrackId } from "@/data/ktrend/meta";

// ── PHASE 1: 판매 경험 5대 지표 ──
export const SELF_CHECK_QUESTIONS: { id: string; label: string }[] = [
  { id: "q1", label: "아마존·쇼피파이 등 해외 온라인 플랫폼에서 월 매출 1,000만 원 이상 발생한 적 있다" },
  { id: "q2", label: "수출 인증(원산지증명서 등) 또는 해외 현지 물류 계약을 보유하고 있다" },
  { id: "q3", label: "직접 수출(B2B 또는 B2C)을 6개월 이상 진행한 이력이 있다" },
  { id: "q4", label: "해외 팝업스토어·전시회·박람회에 참가한 이력이 있다" },
  { id: "q5", label: "인플루언서에게 제품을 시딩하여 콘텐츠를 10회 이상 제작한 이력이 있다" },
];

// ── PHASE 1: 진출 국가 & 국가별 인증 항목 ──
export interface OnbCountry {
  id: string; nameKo: string; flag: string;
  certs: { id: string; label: string; options: string[]; tip?: string }[];
}
export const ONB_COUNTRIES: OnbCountry[] = [
  { id: "US", nameKo: "미국", flag: "🇺🇸", certs: [
    { id: "us_fda", label: "FDA 등록 완료 여부", options: ["있음", "없음", "모름"], tip: "미국 화장품 판매를 위한 FDA Cosmetic Registration." },
    { id: "us_label", label: "영문 성분표·라벨링 준비 여부", options: ["있음", "없음"], tip: "FD&C Act 기준 영문 라벨링." },
  ] },
  { id: "VN", nameKo: "베트남", flag: "🇻🇳", certs: [
    { id: "vn_notify", label: "보건부 화장품 신고 여부", options: ["있음", "없음", "모름"] },
  ] },
  { id: "TH", nameKo: "태국", flag: "🇹🇭", certs: [
    { id: "th_fda", label: "태국 FDA 화장품 등록 여부", options: ["있음", "없음", "모름"] },
  ] },
  { id: "MY", nameKo: "말레이시아", flag: "🇲🇾", certs: [
    { id: "my_halal", label: "할랄 인증서 보유 여부", options: ["있음", "없음", "진행 중"], tip: "JAKIM 할랄 인증." },
  ] },
  { id: "SG", nameKo: "싱가포르", flag: "🇸🇬", certs: [
    { id: "sg_hsa", label: "HSA 등록 여부", options: ["있음", "없음", "모름"] },
  ] },
];
export const ONB_COUNTRY_MAP: Record<string, OnbCountry> = Object.fromEntries(ONB_COUNTRIES.map((c) => [c.id, c]));
// 전 국가 공통 인증
export const COMMON_CERT = { id: "origin", label: "원산지증명서 발급 가능 여부", options: ["가능", "불가", "모름"] };

// ── 등급 산출 & 추천 트랙 ──
export type Grade = "S" | "A" | "B" | "C";
export interface GradeInfo { grade: Grade; label: string; recommended: MallTrackId; }
export function gradeFromChecks(yesCount: number): GradeInfo {
  if (yesCount >= 5) return { grade: "S", label: "S등급 (즉시 스케일업 가능)", recommended: "onboarding" };
  if (yesCount >= 4) return { grade: "A", label: "A등급 (성장 가속 단계)", recommended: "onboarding" };
  if (yesCount >= 2) return { grade: "B", label: "B등급 (진출 계획 단계)", recommended: "live" };
  return { grade: "C", label: "C등급 (입문 단계)", recommended: "ready" };
}

// 인증 응답에서 미비 항목(없음/모름/불가) 도출 → PHASE 5 가이드 발송 대상
export function missingCerts(countries: string[], certAnswers: Record<string, string>): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const c of countries) {
    const country = ONB_COUNTRY_MAP[c];
    if (!country) continue;
    for (const cert of country.certs) {
      const v = certAnswers[cert.id];
      if (v === "없음" || v === "모름") out.push({ id: cert.id, label: `${country.flag} ${country.nameKo} — ${cert.label}` });
    }
  }
  const origin = certAnswers[COMMON_CERT.id];
  if (origin === "불가" || origin === "모름") out.push({ id: COMMON_CERT.id, label: `전 국가 공통 — ${COMMON_CERT.label}` });
  return out;
}

// ── PHASE 3: 동적 요금 계산 ──
export type SubTerm = "monthly" | "6month";
export function multiCountryDiscount(n: number): number {
  if (n >= 5) return 0.15;
  if (n >= 3) return 0.10;
  if (n === 2) return 0.05;
  return 0;
}
export function termDiscount(term: SubTerm): number {
  return term === "6month" ? 0.10 : 0;
}

export interface Quote {
  trackId: MallTrackId; unitPrice: number; countryCount: number;
  base: number; multiRate: number; multiDiscount: number;
  termRate: number; termDiscountAmount: number;
  final: number; vat: number;
}
// 최종 월 납부액 = 트랙료 × 국가수 × (1-다국가할인) × (1-약정할인). VAT 별도(10%).
export function computeQuote(trackId: MallTrackId, countryCount: number, term: SubTerm): Quote {
  const unitPrice = MALL_TRACK_MAP[trackId]?.price ?? 0;
  const n = Math.max(1, countryCount);
  const base = unitPrice * n;
  const multiRate = multiCountryDiscount(n);
  const termRate = termDiscount(term);
  const afterMulti = base * (1 - multiRate);
  const final = Math.round(afterMulti * (1 - termRate));
  const multiDiscount = Math.round(base * multiRate);
  const termDiscountAmount = Math.round(afterMulti * termRate);
  const vat = Math.round(final * 0.1);
  return { trackId, unitPrice, countryCount: n, base, multiRate, multiDiscount, termRate, termDiscountAmount, final, vat };
}

// ── 온보딩 전체 타임라인 (완료 화면 안내용) ──
export const ONB_TIMELINE: { d: string; label: string }[] = [
  { d: "D+0", label: "신청 완료 (오늘)" },
  { d: "D+3~5", label: "1:1 온보딩 미팅" },
  { d: "D+15", label: "현지화 번역·스토어 세팅 완료" },
  { d: "D+20", label: "재고 현지 입고 완료" },
  { d: "D+23~", label: "시딩·런칭·첫 판매 시작" },
];

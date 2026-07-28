// 데이터 익스포트 ZIP에 포함되는 정적 문서 — 핵심 로직 원문 + ENV/연동 가이드.
// ⚠️ 원문 스냅샷: src/lib/onboarding.ts / src/lib/payments.ts 수정 시 이 파일도 갱신할 것.

export const LOGIC_SOURCE_MD = `# logic_source.md — 핵심 로직 원문 (스냅샷)

> 출처: \`src/lib/onboarding.ts\`, \`src/lib/payments.ts\` (glovek.space 저장소)

## src/lib/onboarding.ts — 자가체크·등급·요금 엔진

\`\`\`ts
// ── PHASE 1: 판매 경험 5대 지표 ──
export const SELF_CHECK_QUESTIONS: { id: string; label: string }[] = [
  { id: "q1", label: "아마존·쇼피파이 등 해외 온라인 플랫폼에서 월 매출 1,000만 원 이상 발생한 적 있다" },
  { id: "q2", label: "수출 인증(원산지증명서 등) 또는 해외 현지 물류 계약을 보유하고 있다" },
  { id: "q3", label: "직접 수출(B2B 또는 B2C)을 6개월 이상 진행한 이력이 있다" },
  { id: "q4", label: "해외 팝업스토어·전시회·박람회에 참가한 이력이 있다" },
  { id: "q5", label: "인플루언서에게 제품을 시딩하여 콘텐츠를 10회 이상 제작한 이력이 있다" },
];

// ── PHASE 1: 진출 국가 & 국가별 인증 항목 ──
export const ONB_COUNTRIES: OnbCountry[] = [
  { id: "US", nameKo: "미국", flag: "🇺🇸", certs: [
    { id: "us_fda", label: "FDA 등록 완료 여부", options: ["있음", "없음", "모름"] },
    { id: "us_label", label: "영문 성분표·라벨링 준비 여부", options: ["있음", "없음"] },
  ] },
  { id: "VN", nameKo: "베트남", flag: "🇻🇳", certs: [
    { id: "vn_notify", label: "보건부 화장품 신고 여부", options: ["있음", "없음", "모름"] },
  ] },
  { id: "TH", nameKo: "태국", flag: "🇹🇭", certs: [
    { id: "th_fda", label: "태국 FDA 화장품 등록 여부", options: ["있음", "없음", "모름"] },
  ] },
  { id: "MY", nameKo: "말레이시아", flag: "🇲🇾", certs: [
    { id: "my_halal", label: "할랄 인증서 보유 여부", options: ["있음", "없음", "진행 중"] },
  ] },
  { id: "SG", nameKo: "싱가포르", flag: "🇸🇬", certs: [
    { id: "sg_hsa", label: "HSA 등록 여부", options: ["있음", "없음", "모름"] },
  ] },
];
export const COMMON_CERT = { id: "origin", label: "원산지증명서 발급 가능 여부", options: ["가능", "불가", "모름"] };

// ── 등급 산출 & 추천 트랙 ──
export function gradeFromChecks(yesCount: number): GradeInfo {
  if (yesCount >= 5) return { grade: "S", label: "S등급 (즉시 스케일업 가능)", recommended: "onboarding" };
  if (yesCount >= 4) return { grade: "A", label: "A등급 (성장 가속 단계)", recommended: "onboarding" };
  if (yesCount >= 2) return { grade: "B", label: "B등급 (진출 계획 단계)", recommended: "live" };
  return { grade: "C", label: "C등급 (입문 단계)", recommended: "live" };
}

// 인증 응답에서 미비 항목(없음/모름/불가) 도출
export function missingCerts(countries: string[], certAnswers: Record<string, string>): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (const c of countries) {
    const country = ONB_COUNTRY_MAP[c];
    if (!country) continue;
    for (const cert of country.certs) {
      const v = certAnswers[cert.id];
      if (v === "없음" || v === "모름") out.push({ id: cert.id, label: country.flag + " " + country.nameKo + " — " + cert.label });
    }
  }
  const origin = certAnswers[COMMON_CERT.id];
  if (origin === "불가" || origin === "모름") out.push({ id: COMMON_CERT.id, label: "전 국가 공통 — " + COMMON_CERT.label });
  return out;
}

// ── PHASE 3: 동적 요금 계산 ──
export type SubTerm = "monthly" | "6month";
export const TERM_MONTHS: Record<SubTerm, number> = { monthly: 1, "6month": 6 };
// 다국가 동시 진출 할인: 2개국 10% / 3~4개국 15% / 5개국 20%
export function multiCountryDiscount(n: number): number {
  if (n >= 5) return 0.20;
  if (n >= 3) return 0.15;
  if (n === 2) return 0.10;
  return 0;
}
// 약정 할인: 6개월 약정 20% (월 구독 0%)
export function termDiscount(term: SubTerm): number {
  return term === "6month" ? 0.20 : 0;
}
// 월 환산액 = 트랙료 × 국가수 × (1-다국가할인) × (1-약정할인). 표기가는 모두 VAT 포함.
// 6개월 약정은 6개월 합계(월환산 × 6)를 한 번에 결제.
export function computeQuote(trackId: MallTrackId, countryCount: number, term: SubTerm): Quote {
  const unitPrice = MALL_TRACK_MAP[trackId]?.price ?? 0;
  const n = Math.max(1, countryCount);
  const base = unitPrice * n;
  const multiRate = multiCountryDiscount(n);
  const termRate = termDiscount(term);
  const afterMulti = base * (1 - multiRate);
  const monthly = Math.round(afterMulti * (1 - termRate));
  const months = TERM_MONTHS[term];
  const payable = monthly * months;
  const multiDiscount = Math.round(base * multiRate);
  const termDiscountAmount = Math.round(afterMulti * termRate);
  const vat = Math.round(payable * 10 / 110);
  return { trackId, unitPrice, countryCount: n, base, multiRate, multiDiscount, termRate, termDiscountAmount, monthly, months, payable, vat };
}
\`\`\`

## src/lib/payments.ts — 결제 플랜 정의

\`\`\`ts
export const PAY_PLANS: Record<string, { amount: number; goodsName: string; planInitial: string; periodDays: number; trialDays: number }> = {
  // 금액은 결제 테스트 모드(PAY_TEST_MODE)면 ₩1,000으로 강제됨 (meta.ts에서 토글)
  pro: { amount: testPrice(89000), goodsName: "Glovek Pro (월간)", planInitial: "Pro", periodDays: 30, trialDays: 0 },
  live: { amount: testPrice(490_000), goodsName: "Glovek Live Focus Track (월간)", planInitial: "Live", periodDays: 30, trialDays: 0 },
  onboarding: { amount: testPrice(3_000_000), goodsName: "Glovek Onboarding Track (월간)", planInitial: "Onb", periodDays: 30, trialDays: 0 },
};
export const MALL_PLAN_KEYS = ["live", "onboarding"] as const;
\`\`\`

## 트랙 정가 (src/data/ktrend/meta.ts MALL_TRACKS)
- live (Live Focus Track): ₩490,000/월 · 판매수수료 10% · 사이트 내 구독 결제
- onboarding (Onboarding Track): ₩3,000,000 정가·\"가격 문의\"(inquiry:true, 사이트 내 결제 차단)
- Guarantee Track(₩1,000,000/월): /consult1 마케팅 카드로만 존재, 결제 로직 없음
`;

export function glovekEnvMd(): string {
  return `# glovek_ENV.md — 환경변수·연동 가이드 (값 미포함, 이름만)

## 환경변수 (Vercel)
### DB
POSTGRES_URL, DATABASE_URL, POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING, DATABASE_URL_UNPOOLED
### 인증/세션
SESSION_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_EMAILS
### 결제(NICEPAY)
NICEPAY_CLIENT_KEY, NICEPAY_SECRET_KEY, NICEPAY_API_BASE, NICEPAY_ENC_MODE, NICEPAY_WEBHOOK_SECRET, SERVICE_ORDER_PREFIX, PAY_TEST_TOKEN
### 수집(Apify)
SCRAPER_API_KEY, SCRAPER_PROVIDER, APIFY_ACTOR, SHOP_ACTOR, SHOP_ACTOR_INPUT, SHOP_COUNTRIES, SHOP_MAX_BRANDS, SHOP_MAX_ITEMS, SHOP_MAX_POLL, SHOP_MAX_RUNNING, SHOP_RETRY_DAYS, SHOP_JOB_TIMEOUT_MIN, COLLECT_* (REGIONS/INITIAL_LIMIT/REFRESH_LIMIT/MAX_PENDING/MAX_REFRESH/MAX_POLL/BACKFILL_DAYS/TAG_SUFFIXES/JOB_TIMEOUT_MIN)
### 크론/웹훅/알림
CRON_SECRET, INGEST_SECRET, SLACK_WEBHOOK_URL
### 운영 어드민(tiktokadmin) 연동
ADMIN_INGEST_URL, ADMIN_INGEST_SECRET (미설정 시 INGEST_SECRET 폴백), FILE_API_TOKEN (파일 접근 API 전용 — 신규)
### 공개(NEXT_PUBLIC_*)
NEXT_PUBLIC_META_PIXEL_ID, NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_BASE_PATH, NEXT_PUBLIC_GLOVEK_DECK_URL, NEXT_PUBLIC_GLOVEK_MEETING_URL, NEXT_PUBLIC_ONBOARDING_APPLY_URL
### AI/리메이크(실험)
ANTHROPIC_API_KEY, GEMINI_API_KEY(+GEMINI_*), HF_CREDENTIALS(+HF_*), REMAKE_*

## 파일 접근 API (어드민 연동용, FILE_API_TOKEN 필요)
1) 파일 스트림
   GET https://glovek.space/api/partner/files/{file_id}
   Header: X-File-Token: {FILE_API_TOKEN}
   → 파일 바이너리(Content-Type=원본 mime). 404=없음, 401=토큰 불일치, 503=토큰 env 미설정.
2) 15분 서명 URL 발급
   GET https://glovek.space/api/partner/files/{file_id}/url
   Header: X-File-Token: {FILE_API_TOKEN}
   → { "url": "https://glovek.space/api/partner/files/{file_id}?exp=...&sig=...", "expires_at": "ISO8601" }
   서명 URL은 헤더 없이 만료 전까지 GET 가능(HMAC-SHA256, exp epoch초).
3) 고객별 파일 메타 목록
   GET https://glovek.space/api/partner/files?user_id={users.id}   (또는 ?email={email})
   Header: X-File-Token: {FILE_API_TOKEN}
   → { files: [{ id, user_id, kind(biz_reg|product_cert|product_photo), product_index, filename, mime, size, created_at }] }

## 인제스트 송신 (glovek → tiktokadmin)
POST {ADMIN_INGEST_URL}/api/ingest/{lead|diagnosis|payment}
Header: X-Ingest-Secret, X-Idempotency-Key. 실패 1회 재시도, 400/401/404 즉시 중단.
(참고: /api/ingest/onboarding 로 온보딩 전체 스냅샷도 송신 중 — admin 쪽 수신 추가 시 활성)

## schema.sql 참고
서버리스에서 pg_dump 실행이 불가해 information_schema 인트로스펙션으로 생성한 DDL 근사본입니다
(컬럼/타입/NULL/기본값/PK 포함, 인덱스·시퀀스 세부는 생략). 원본 스키마 정의: src/lib/db.ts ensureSchema().
`;
}

// 개발 현황/가이드 — 공개 개발문서(/dev-docs)의 정적 콘텐츠.
// ⚠️ 유지관리: 큰 기능이 추가되면 이 파일을 갱신(+ DEV_UPDATED_AT). 일자별 자동 로그는 dev_changelog(크론).

export const DEV_UPDATED_AT = "2026-08-02";

export interface DocSection { id: string; title: string; items: { h: string; d: string }[] }

export const DEV_STATUS: DocSection[] = [
  {
    id: "stack", title: "기술 스택",
    items: [
      { h: "프레임워크", d: "Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4" },
      { h: "DB", d: "PostgreSQL (Neon, Launch 플랜) · @vercel/postgres (raw SQL, ORM 없음). 스키마 단일 출처: src/lib/db.ts ensureSchema()" },
      { h: "호스팅", d: "Vercel (Serverless, 60s) · Cron: 구독청구(일1)·샵수집(매시)·영상수집(매시30분)·개발로그(자정 KST)" },
      { h: "인증", d: "JWT 쿠키 세션(jose) — 사용자/관리자/추천인 3종 분리. 시크릿은 배포 env에서 결정적 파생(다중 인스턴스 안정)" },
      { h: "결제", d: "NICEPAY V2 빌링키 정기결제 (카드 즉시 암호화, 저장/로그 금지)" },
      { h: "수집", d: "Apify (TikTok / TikTok Shop actor) — 비동기 run + 폴링 회수 파이프라인" },
      { h: "영상 리메이크", d: "Gemini(Veo 3.1 / Omni Flash) · Higgsfield — 멀티 프로바이더 추상화 + 비용 티어" },
    ],
  },
  {
    id: "features", title: "구현 기능 (도메인별)",
    items: [
      { h: "데이터 분석(kalodata형)", d: "제품/샵/크리에이터/영상 랭킹 + 상세, 카테고리 자동분류, 판매추이·급상승(스냅샷), 국가별, 제품↔영상↔크리에이터 매칭" },
      { h: "브랜드 수집", d: "전 브랜드 자동수집(크론) + 지정 브랜드 심층 크롤링(즉시·필터: 범위·기간·깊이·국가·해시태그) · 스톨 리퍼·백프레셔·중복방지" },
      { h: "TikTok Shop 입점(온보딩)", d: "자가진단(등급 S/A/B/C) → 트랙선택 → 결제 → 마이페이지 기본정보/제품 서류(인증서·라벨/실물사진·라벨체크·연락처)" },
      { h: "결제/구독", d: "Pro(89k) · 멀티몰 Live Focus(490k)·Guarantee(1,000k) 정기결제. 다국가/약정 동적요금, 프로모, 자동청구 크론(멱등)" },
      { h: "상담/문의", d: "소개서 받기(/consult)·상담(/consult1)·문의 모달 → DB + Slack + 입력 퍼널 추적(UTM 소스별 완료율)" },
      { h: "리메이크 스튜디오", d: "레퍼런스 4-Layer 분해(SALES 보존·STYLE/PRODUCT 교체) → 5단계 파이프라인(분석→설계→키프레임→영상화→합성)" },
      { h: "어드민", d: "회원 상세관리·결제·문의·상담 퍼널·수집·CSV/ZIP 익스포트·회원별 파일열람·개발문서 메모" },
    ],
  },
  {
    id: "integration", title: "외부 연동 (운영 어드민 tiktokadmin)",
    items: [
      { h: "이벤트 송신", d: "POST {ADMIN_INGEST_URL}/api/ingest/{lead|diagnosis|payment|onboarding} · X-Ingest-Secret + X-Idempotency-Key · fire-and-forget, 1회 재시도" },
      { h: "발신 지점", d: "상담·문의·추천가입(lead) / 자가진단(diagnosis) / 첫결제·갱신·해지(payment) / 입점 전체 스냅샷(onboarding)" },
      { h: "파일 API", d: "GET /api/partner/files(목록) · /{id}(스트림) · /{id}/url(15분 서명URL) — 헤더 X-File-Token(FILE_API_TOKEN)" },
      { h: "데이터 공유", d: "읽기전용 DB 롤(GLOVEK_DB_URL_RO) + 통합 ZIP/CSV 익스포트(어드민). 어드민은 glovek DB에 쓰지 않음(무충돌)" },
      { h: "정본 문서", d: "docs/integration/ (glovek.space.md · README · RESULT-구현결과)" },
    ],
  },
  {
    id: "env", title: "환경변수 (이름만 · 값 금지)",
    items: [
      { h: "DB/세션", d: "POSTGRES_URL(계열) · SESSION_SECRET · ADMIN_USERNAME · ADMIN_PASSWORD · ADMIN_EMAILS" },
      { h: "결제", d: "NICEPAY_CLIENT_KEY · NICEPAY_SECRET_KEY · NICEPAY_API_BASE · NICEPAY_WEBHOOK_SECRET · PAY_TEST_TOKEN" },
      { h: "수집", d: "SCRAPER_API_KEY · APIFY_ACTOR · SHOP_ACTOR · SHOP_COUNTRIES · COLLECT_* · CRON_SECRET · INGEST_SECRET" },
      { h: "연동/파일", d: "ADMIN_INGEST_URL · ADMIN_INGEST_SECRET · FILE_API_TOKEN" },
      { h: "결제", d: "심사모드 ON(2026-08-28, 나이스페이 정식 오픈) — 연간·6개월·Guarantee 숨김, 취소·환불 정책(/refund) 노출. 심사 후 전체 결제 복원: NEXT_PUBLIC_PAY_REVIEW=0 또는 pay-review.ts DEFAULT_REVIEW=false" },
      { h: "분석/공개", d: "NEXT_PUBLIC_META_PIXEL_ID · NEXT_PUBLIC_SITE_URL · NEXT_PUBLIC_GLOVEK_DECK_URL 등" },
    ],
  },
];

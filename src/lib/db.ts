import { sql } from "@vercel/postgres";

// Vercel/Neon이 prefix에 따라 POSTGRES_URL 외 다른 이름으로 주입해도 동작하도록 보정.
// (@vercel/postgres는 POSTGRES_URL을 읽음)
if (!process.env.POSTGRES_URL) {
  const alt =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL_UNPOOLED;
  if (alt) process.env.POSTGRES_URL = alt;
}

// Postgres 스키마 초기화 (최초 호출 시 1회). Vercel Postgres / Neon / Supabase 호환.
let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS users (
        id text PRIMARY KEY,
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        name text NOT NULL,
        brand text,
        role text,
        plan text NOT NULL DEFAULT 'basic',
        pro_until bigint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS invites (
        id serial PRIMARY KEY,
        inviter_email text NOT NULL,
        invitee_email text NOT NULL,
        brand_domain text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS bookmarks (
        user_id text NOT NULL,
        type text NOT NULL,
        item_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, type, item_id)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS inquiries (
        id serial PRIMARY KEY,
        kind text NOT NULL,
        user_email text,
        payload jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 제안/문의 상태 관리 + 관리자 답변 (마이페이지 노출)
      await sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'`;
      await sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS response text`;
      await sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`;
      // 결제(NICEpay) — 주문/원장
      await sql`CREATE TABLE IF NOT EXISTS orders (
        order_id text PRIMARY KEY,
        user_id text NOT NULL,
        plan text NOT NULL,
        amount integer NOT NULL,
        goods_name text,
        status text NOT NULL DEFAULT 'created',
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 결제 종류: once(단건) | subscribe(정기/빌링키 등록) | mall(몰 입점 구독)
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'once'`;
      // 몰 입점: 빌링키 등록 후 실제 월 청구 금액(다국가/약정 할인 반영). 인증금액(amount)=0과 별개.
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS charge_amount integer`;
      // payment_id(tid) UNIQUE = 멱등성. raw 7년 보관(audit).
      await sql`CREATE TABLE IF NOT EXISTS payments (
        payment_id text PRIMARY KEY,
        order_id text,
        amount integer,
        raw jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 어드민 설정(크롤링 규칙 등) key-value
      await sql`CREATE TABLE IF NOT EXISTS admin_settings (
        key text PRIMARY KEY,
        value jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 신규 브랜드 발굴 요청 큐 (유저/어드민이 추가)
      await sql`CREATE TABLE IF NOT EXISTS brand_requests (
        id serial PRIMARY KEY,
        brand_name text NOT NULL,
        handle text,
        hashtags text,
        requested_by text,
        source text NOT NULL DEFAULT 'user',
        status text NOT NULL DEFAULT 'pending',
        note text,
        collected int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 재시도 횟수 (기존 테이블에도 보강) — N회 초과 시 'failed'로 격리해 무한 재시도 방지
      await sql`ALTER TABLE brand_requests ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0`;
      // 수집된 영상 (틱톡 video_id UNIQUE = 멱등/중복방지, 증분 수집)
      await sql`CREATE TABLE IF NOT EXISTS videos (
        video_id text PRIMARY KEY,
        brand_name text,
        handle text,
        views bigint DEFAULT 0,
        likes bigint DEFAULT 0,
        comments bigint DEFAULT 0,
        shares bigint DEFAULT 0,
        is_ad boolean DEFAULT false,
        is_shop boolean DEFAULT false,
        posted_at text,
        url text,
        collected_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 콘텐츠 타겟 국가 (현재 전량 US, 추후 확장) — 기존 테이블 보강
      await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US'`;
      // 브랜드별 수집 주기/추적 관리
      await sql`CREATE TABLE IF NOT EXISTS brand_tracking (
        brand_name text PRIMARY KEY,
        tracked boolean NOT NULL DEFAULT true,
        interval_hours int NOT NULL DEFAULT 24,
        hashtags text,
        last_collected_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 틱톡 핸들(프로파일 타겟 수집용) — 기존 테이블에도 보강
      await sql`ALTER TABLE brand_tracking ADD COLUMN IF NOT EXISTS handle text`;
      // 수집 영상에서 집계된 인플루언서(크리에이터)
      await sql`CREATE TABLE IF NOT EXISTS creators (
        handle text PRIMARY KEY,
        videos int NOT NULL DEFAULT 0,
        total_views bigint NOT NULL DEFAULT 0,
        avg_views bigint NOT NULL DEFAULT 0,
        brands text[] DEFAULT '{}',
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 수집 영상에서 재계산된 브랜드 통계
      await sql`CREATE TABLE IF NOT EXISTS brand_stats (
        brand_name text PRIMARY KEY,
        videos int NOT NULL DEFAULT 0,
        influencers int NOT NULL DEFAULT 0,
        total_views bigint NOT NULL DEFAULT 0,
        avg_views bigint NOT NULL DEFAULT 0,
        max_views bigint NOT NULL DEFAULT 0,
        shop_count int NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 블락리스트: 잘못 태깅된 인플루언서(handle)/브랜드(brand) 수집·노출 차단
      await sql`CREATE TABLE IF NOT EXISTS blocklist (
        kind text NOT NULL,
        value text NOT NULL,
        reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (kind, value)
      )`;
      // 수집 실행 로그
      await sql`CREATE TABLE IF NOT EXISTS collection_runs (
        id serial PRIMARY KEY,
        kind text NOT NULL,
        target text,
        status text NOT NULL,
        collected int NOT NULL DEFAULT 0,
        error text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 프로모션 코드 (가입 시 입력 → N일 무료 Pro 체험)
      await sql`CREATE TABLE IF NOT EXISTS promo_codes (
        code text PRIMARY KEY,
        plan text NOT NULL DEFAULT 'pro',
        trial_days int NOT NULL DEFAULT 3,
        max_uses int NOT NULL DEFAULT 0,
        used_count int NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS promo_redemptions (
        code text NOT NULL,
        user_id text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (code, user_id)
      )`;
      // 정기결제 구독 (NICEpay 빌링키) — 7일 체험 후 매월 자동청구
      await sql`CREATE TABLE IF NOT EXISTS subscriptions (
        user_id text PRIMARY KEY,
        bid text,
        plan text NOT NULL DEFAULT 'pro',
        amount int NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'trial',
        next_charge_at bigint NOT NULL DEFAULT 0,
        failures int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // UTM 유입 추적 (방문/가입) — 캠페인 효과 측정용
      await sql`CREATE TABLE IF NOT EXISTS utm_events (
        id serial PRIMARY KEY,
        kind text NOT NULL DEFAULT 'visit',
        source text,
        medium text,
        campaign text,
        content text,
        term text,
        landing_path text,
        referrer text,
        user_id text,
        user_email text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 동시 접속자 표기용 하트비트 (TEST1 — 롤백 가능)
      await sql`CREATE TABLE IF NOT EXISTS presence (
        sid text PRIMARY KEY,
        last_seen timestamptz NOT NULL DEFAULT now()
      )`;
      // 비동기 수집 작업 추적 (Apify run) — webhook 차단 환경 대비 폴링(pull)용
      await sql`CREATE TABLE IF NOT EXISTS collect_jobs (
        run_id text PRIMARY KEY,
        brand_name text NOT NULL,
        since_date text,
        status text NOT NULL DEFAULT 'running',
        collected int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 수집 종류: video(영상) | shop(틱톡샵 상품)
      await sql`ALTER TABLE collect_jobs ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'video'`;
      // 틱톡샵 상품 (A안: 실 커미션율 + 가격×판매수 매출 추정)
      await sql`CREATE TABLE IF NOT EXISTS products (
        product_id text PRIMARY KEY,
        brand_name text,
        title text,
        price numeric,
        currency text,
        sold_count bigint DEFAULT 0,
        commission_rate numeric,
        url text,
        collected_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 브랜드별 틱톡샵 집계 (실 커미션율 평균 + 추정 GMV)
      await sql`CREATE TABLE IF NOT EXISTS brand_shop_stats (
        brand_name text PRIMARY KEY,
        products int NOT NULL DEFAULT 0,
        avg_commission numeric,
        total_sold bigint NOT NULL DEFAULT 0,
        est_gmv numeric NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 틱톡샵 온보딩 신청 (롤백 가능 트랙) — 최소 정보 + 결제 상태 추적
      await sql`CREATE TABLE IF NOT EXISTS onboarding_applications (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        name text,
        brand text,
        contact text,
        email text,
        category text,
        note text,
        status text NOT NULL DEFAULT 'submitted',
        order_id text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 선택한 입점 트랙(ready/live/onboarding)
      await sql`ALTER TABLE onboarding_applications ADD COLUMN IF NOT EXISTS track text`;
      // 5-PHASE 온보딩 상세 (자가체크·등급·국가·약정·요금·상세정보 전체 페이로드)
      await sql`ALTER TABLE onboarding_applications ADD COLUMN IF NOT EXISTS grade text`;
      await sql`ALTER TABLE onboarding_applications ADD COLUMN IF NOT EXISTS recommended_track text`;
      await sql`ALTER TABLE onboarding_applications ADD COLUMN IF NOT EXISTS countries text`;
      await sql`ALTER TABLE onboarding_applications ADD COLUMN IF NOT EXISTS term text`;
      await sql`ALTER TABLE onboarding_applications ADD COLUMN IF NOT EXISTS amount integer`;
      await sql`ALTER TABLE onboarding_applications ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'self_check'`;
      await sql`ALTER TABLE onboarding_applications ADD COLUMN IF NOT EXISTS referral_code text`;
      await sql`ALTER TABLE onboarding_applications ADD COLUMN IF NOT EXISTS dino_linked boolean NOT NULL DEFAULT false`;
      await sql`ALTER TABLE onboarding_applications ADD COLUMN IF NOT EXISTS payload jsonb`;
      // 몰 입점 정기결제 구독 (Pro SaaS 구독과 분리) — 브랜드당 1개 트랙
      await sql`CREATE TABLE IF NOT EXISTS mall_subscriptions (
        user_id text PRIMARY KEY,
        track text NOT NULL,
        bid text,
        amount integer NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'active',
        next_charge_at bigint NOT NULL DEFAULT 0,
        failures int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 데모/관리자 계정 시드 (bcrypt("ktrend2026")) — 서버 세션 로그인 가능하도록
      const DEMO_HASH = "$2b$10$mLc7sBm3zK4a83l6/Tg9NOoDGLLYsfp4SXRfZcls4.LTw6Tsy/8Oy";
      await sql`INSERT INTO users (id, email, password_hash, name, brand, role, plan) VALUES
        ('admin-demo', 'admin@ktrend.demo', ${DEMO_HASH}, '관리자', 'K-Trend Analytics', '관리자', 'enterprise'),
        ('pro-demo', 'pro@ktrend.demo', ${DEMO_HASH}, '프로 테스터', '글로우랩', '마케터', 'pro'),
        ('advance-demo', 'advance@ktrend.demo', ${DEMO_HASH}, '어드밴스 테스터', '글로우랩 에이전시', '마케터', 'enterprise'),
        ('basic-demo', 'basic@ktrend.demo', ${DEMO_HASH}, '베이직 테스터', '스타트업 코스메틱', '마케터', 'basic')
        ON CONFLICT (email) DO NOTHING`;
      // 기존 DB 보정(테스트2): 데모 계정 플랜을 Pro/Advance로 정렬 (멱등)
      await sql`UPDATE users SET plan='pro' WHERE email='pro@ktrend.demo'`;
      await sql`UPDATE users SET plan='enterprise' WHERE email='advance@ktrend.demo'`;
    })();
  }
  return schemaReady;
}

export { sql } from "@vercel/postgres";

export interface DbUser {
  id: string;
  email: string;
  name: string;
  brand: string | null;
  role: string | null;
  plan: string;
  pro_until: number;
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL_UNPOOLED,
  );
}

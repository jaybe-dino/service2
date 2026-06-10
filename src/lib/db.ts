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
      // 브랜드별 수집 주기/추적 관리
      await sql`CREATE TABLE IF NOT EXISTS brand_tracking (
        brand_name text PRIMARY KEY,
        tracked boolean NOT NULL DEFAULT true,
        interval_hours int NOT NULL DEFAULT 24,
        hashtags text,
        last_collected_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
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
      // 데모/관리자 계정 시드 (bcrypt("ktrend2026")) — 서버 세션 로그인 가능하도록
      const DEMO_HASH = "$2b$10$mLc7sBm3zK4a83l6/Tg9NOoDGLLYsfp4SXRfZcls4.LTw6Tsy/8Oy";
      await sql`INSERT INTO users (id, email, password_hash, name, brand, role, plan) VALUES
        ('admin-demo', 'admin@ktrend.demo', ${DEMO_HASH}, '관리자', 'K-Trend Analytics', '관리자', 'enterprise'),
        ('enterprise-demo', 'pro@ktrend.demo', ${DEMO_HASH}, '프로 테스터', '글로우랩', '마케터', 'enterprise'),
        ('basic-demo', 'basic@ktrend.demo', ${DEMO_HASH}, '베이직 테스터', '스타트업 코스메틱', '마케터', 'basic')
        ON CONFLICT (email) DO NOTHING`;
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

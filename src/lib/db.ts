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
      // 몰 입점: 빌링키 등록 후 실제 청구 금액(다국가/약정 할인 반영).
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS charge_amount integer`;
      // 다음 자동청구까지 기간(일). 월구독 30, 6개월 약정 180.
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS period_days integer NOT NULL DEFAULT 30`;
      // NicePay 거래ID(tid) — 결제 성공 시 orders에 먼저 기록해 payments 원장 유실 시 복구 근거.
      await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tid text`;
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
      // 크리에이터 티어(mega|macro|micro) — 팔로워 기반(수집 소스 제공 시). 없으면 조회수로 근사.
      await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS tier text`;
      // 영상이 태그한 TikTok Shop 상품ID(있으면 제품↔영상 정밀 매칭). 인덱스로 조회 가속.
      await sql`ALTER TABLE videos ADD COLUMN IF NOT EXISTS product_ref text`;
      await sql`CREATE INDEX IF NOT EXISTS idx_videos_product_ref ON videos(product_ref)`;
      // 영상 일별 스냅샷 (바이럴 급상승/조회수 증분 산출용). 하루 1행/영상.
      await sql`CREATE TABLE IF NOT EXISTS video_snapshots (
        video_id text NOT NULL,
        snap_date date NOT NULL,
        views bigint NOT NULL DEFAULT 0,
        PRIMARY KEY (video_id, snap_date)
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
      // 정기결제 구독 (NICEpay 빌링키) — 카드 등록 후 주기마다 자동청구
      await sql`CREATE TABLE IF NOT EXISTS subscriptions (
        user_id text PRIMARY KEY,
        bid text,
        plan text NOT NULL DEFAULT 'pro',
        amount int NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'trial',
        next_charge_at bigint NOT NULL DEFAULT 0,
        failures int NOT NULL DEFAULT 0,
        period_days int NOT NULL DEFAULT 30,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 청구 주기 영속화(6개월 약정=180) — 기존 테이블 보강. cron이 이 값으로 다음 청구일 계산.
      await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS period_days int NOT NULL DEFAULT 30`;
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
      // 수집 지역(국가코드) — 결과 영상을 이 국가로 태깅. 기본 US.
      await sql`ALTER TABLE collect_jobs ADD COLUMN IF NOT EXISTS region text NOT NULL DEFAULT 'US'`;
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
      // 다국가: 제품별 수집 국가(기본 US). product_id는 국가 프리픽스(US:...)로 저장돼 국가별 구분.
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'US'`;
      // 제품 썸네일(수집 시 확보되면 저장). 없으면 브랜드 컬러 플레이스홀더 노출.
      await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text`;
      // 브랜드별 틱톡샵 집계 (실 커미션율 평균 + 추정 GMV)
      await sql`CREATE TABLE IF NOT EXISTS brand_shop_stats (
        brand_name text PRIMARY KEY,
        products int NOT NULL DEFAULT 0,
        avg_commission numeric,
        total_sold bigint NOT NULL DEFAULT 0,
        est_gmv numeric NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 제품 일별 스냅샷 (kalodata식 매출·판매 추이/성장률 산출용). 하루 1행/제품.
      await sql`CREATE TABLE IF NOT EXISTS product_snapshots (
        product_id text NOT NULL,
        snap_date date NOT NULL,
        sold_count bigint NOT NULL DEFAULT 0,
        price numeric,
        est_gmv numeric NOT NULL DEFAULT 0,
        PRIMARY KEY (product_id, snap_date)
      )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_product_snapshots_date ON product_snapshots(snap_date)`;
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
      // 온보딩 제출 파일(사업자등록증·제품 인증서류) — base64 저장. kind: biz_reg | product_cert
      await sql`CREATE TABLE IF NOT EXISTS onboarding_files (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        kind text NOT NULL,
        product_index int,
        filename text,
        mime text,
        size int,
        data text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 몰 입점 정기결제 구독 (Pro SaaS 구독과 분리) — 브랜드당 1개 트랙
      await sql`CREATE TABLE IF NOT EXISTS mall_subscriptions (
        user_id text PRIMARY KEY,
        track text NOT NULL,
        bid text,
        amount integer NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'active',
        next_charge_at bigint NOT NULL DEFAULT 0,
        failures int NOT NULL DEFAULT 0,
        period_days int NOT NULL DEFAULT 30,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`ALTER TABLE mall_subscriptions ADD COLUMN IF NOT EXISTS period_days int NOT NULL DEFAULT 30`;
      // 추천인(파트너): 어드민이 생성, 추천인 본인이 로그인해 자신의 추천 가입자 확인
      await sql`CREATE TABLE IF NOT EXISTS referrers (
        code text PRIMARY KEY,
        login_id text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        name text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 가입 시 입력한 추천인 코드
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by text`;
      // 열람 가능 시장(국가코드 CSV) — 관리자 승인/멤버십으로 부여. US는 코드와 무관하게 모두 허용.
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS markets text`;
      // 관리자 메모 — 회원 상세 관리(어드민 전용, 사용자 미노출)
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_note text`;
      // ── 아웃리치(크리에이터 CRM) 레이어 ──
      // 세그먼트(필터 저장) — 반복 캠페인/발굴 재사용.
      await sql`CREATE TABLE IF NOT EXISTS outreach_lists (
        id serial PRIMARY KEY,
        name text NOT NULL,
        owner text,                 -- 관리자/추천인 식별(자유). null=공용
        filter jsonb,               -- 저장된 필터 조합
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 아웃리치 대상 + 상태 파이프라인. handle 기준. list_id 없으면 파이프라인 전역 대상.
      await sql`CREATE TABLE IF NOT EXISTS outreach_targets (
        id serial PRIMARY KEY,
        handle text NOT NULL,
        list_id int,
        status text NOT NULL DEFAULT 'discovered',  -- discovered|contacted|replied|negotiating|contracted|running|done|hold|rejected
        owner text,                 -- 담당자
        score int,                  -- 등록 시점 적합도 캐시
        note text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (handle, list_id)
      )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_outreach_targets_status ON outreach_targets(status)`;
      // 활동 로그(타임라인)
      await sql`CREATE TABLE IF NOT EXISTS outreach_activity (
        id serial PRIMARY KEY,
        target_id int NOT NULL,
        actor text,
        kind text NOT NULL DEFAULT 'note',  -- note|status|message
        body text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_outreach_activity_target ON outreach_activity(target_id, created_at DESC)`;
      // 개발 변경 로그 — 공개 개발문서(/dev-docs)에 노출. 매일 자정 크론이 배포 커밋을 자동 기록.
      await sql`CREATE TABLE IF NOT EXISTS dev_changelog (
        id serial PRIMARY KEY,
        log_date date NOT NULL,
        kind text NOT NULL DEFAULT 'deploy',   -- deploy | note
        commit_sha text,
        title text,
        body text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_dev_changelog_created ON dev_changelog(created_at DESC)`;
      // 최초 시드(빈 테이블일 때 1회) — 문서 공개 시작 로그
      await sql`INSERT INTO dev_changelog (log_date, kind, title, body)
                SELECT CURRENT_DATE, 'note', '개발 문서 최초 작성',
                  '개발 현황·외부 API 문서 공개 시작. 이후 매일 자정(KST) 배포 커밋을 자동 기록합니다.'
                WHERE NOT EXISTS (SELECT 1 FROM dev_changelog)`;
      // GloveK 입점 상담 신청(랜딩 이벤트) — 별도 저장.
      await sql`CREATE TABLE IF NOT EXISTS consult_requests (
        id serial PRIMARY KEY,
        company text NOT NULL,
        brand_url text,
        category text,
        overseas text,
        manager_name text NOT NULL,
        email text NOT NULL,
        contact text NOT NULL,
        message text,
        agreed boolean NOT NULL DEFAULT false,
        source text,
        status text NOT NULL DEFAULT 'new',
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 상담 폼 입력 퍼널 추적 — 어느 필드까지 채웠는지(드롭오프 분석). PII 값은 저장하지 않고
      // '채운 필드 키'만 기록(비식별). 완료 건의 상세는 consult_requests에 존재.
      await sql`CREATE TABLE IF NOT EXISTS consult_progress (
        sid text PRIMARY KEY,
        fields jsonb NOT NULL DEFAULT '[]'::jsonb,
        last_field text,
        field_count int NOT NULL DEFAULT 0,
        category text,
        agreed boolean NOT NULL DEFAULT false,
        completed boolean NOT NULL DEFAULT false,
        ua text,
        referrer text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_consult_progress_updated ON consult_progress(updated_at DESC)`;
      // 유입(UTM) — 어떤 광고/캠페인에서 왔는지 + 랜딩 경로. 퍼널 드롭오프를 소스별로 분석.
      await sql`ALTER TABLE consult_progress ADD COLUMN IF NOT EXISTS utm_source text`;
      await sql`ALTER TABLE consult_progress ADD COLUMN IF NOT EXISTS utm_medium text`;
      await sql`ALTER TABLE consult_progress ADD COLUMN IF NOT EXISTS utm_campaign text`;
      await sql`ALTER TABLE consult_progress ADD COLUMN IF NOT EXISTS utm_content text`;
      await sql`ALTER TABLE consult_progress ADD COLUMN IF NOT EXISTS utm_term text`;
      await sql`ALTER TABLE consult_progress ADD COLUMN IF NOT EXISTS landing text`;
      // Remake Studio(프로토타입) — 업로드 제품 이미지(외부 영상모델이 가져갈 공개 URL) + 생성 잡 추적
      await sql`CREATE TABLE IF NOT EXISTS remake_assets (
        id text PRIMARY KEY,
        mime text,
        data text,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 레퍼런스 프레임 캐시 — 분석 때 추출한 프레임을 저장, 생성 때 재사용(다운로드 생략).
      await sql`CREATE TABLE IF NOT EXISTS remake_ref_frames (
        video_id text NOT NULL,
        idx int NOT NULL,
        ts numeric,
        mime text,
        data text,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (video_id, idx)
      )`;
      await sql`CREATE TABLE IF NOT EXISTS remake_jobs (
        id text PRIMARY KEY,
        provider text NOT NULL DEFAULT 'mock',
        request_id text,
        template_id text,
        variation int NOT NULL DEFAULT 0,
        score int NOT NULL DEFAULT 0,
        status text NOT NULL DEFAULT 'queued',
        video_url text,
        error text,
        fidelity text,
        spec text,
        debug text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      // 기존 DB 보정: 신규 컬럼 추가(멱등).
      await sql`ALTER TABLE remake_jobs ADD COLUMN IF NOT EXISTS fidelity text`;
      await sql`ALTER TABLE remake_jobs ADD COLUMN IF NOT EXISTS spec text`;
      await sql`ALTER TABLE remake_jobs ADD COLUMN IF NOT EXISTS debug text`;
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
  markets: string | null; // 열람 가능 시장(국가코드 CSV). US는 모두 기본 허용. 예: "TH,VN"
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

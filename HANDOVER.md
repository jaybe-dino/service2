# GloveK (glovek.space) — 인수인계 문서 (Handover)

> 목적: 외부 설계자가 이 사이트를 노션/자체 시스템과 연동하고 데이터 구조를 참고할 수 있도록.
> 본 문서는 **실제 코드 기준**으로 작성되었습니다(추측 배제). 모든 값은 코드 경로를 병기합니다.
> ⚠️ 보안: 이 문서에는 실제 시크릿/키/고객 개인정보가 없습니다. 예시는 모두 가짜 샘플값입니다.

---

## 1) 기술 스택

| 구분 | 내용 | 경로/근거 |
|---|---|---|
| 프레임워크 | **Next.js 15 (App Router)**, React 19, TypeScript | `package.json`, `src/app/**` |
| 스타일 | Tailwind CSS v4 | `CLAUDE.md`, `src/app/globals.css` |
| DB 클라이언트 | **`@vercel/postgres`** (raw SQL, ORM 없음) | `src/lib/db.ts` |
| DB 엔진 | PostgreSQL (Vercel Postgres / Neon / Supabase 호환) | `src/lib/db.ts` L1~12 |
| 인증 | JWT 쿠키 세션 (`jose`), 비밀번호 해시 `bcryptjs` | `src/lib/auth.ts`, `src/lib/admin-auth.ts` |
| 아이콘 | `lucide-react` | 전역 |
| 호스팅 | **Vercel** (Serverless Functions, 60초 제한), Cron은 `vercel.json` | `vercel.json`, 각 route `maxDuration` |
| 결제 PG | **NICEPAY V2** (빌링키 정기결제) | `src/lib/nicepay.ts` |
| 스크래핑 | **Apify** (TikTok/TikTok Shop) | `src/lib/collector.ts` |
| 알림 | **Slack Incoming Webhook** | `src/app/api/*/route.ts` (`SLACK_WEBHOOK_URL`) |
| 애널리틱스 | **Meta Pixel** (자체 픽셀 ID) + 자체 UTM/퍼널 추적 | `src/components/ktrend/MetaPixel.tsx`, `src/app/layout.tsx` |
| 영상 리메이크(실험) | Gemini / Higgsfield 등 외부 영상모델 어댑터 | `src/lib/remake/*`, `src/app/api/remake/*` |

- **스키마 단일 출처**: `src/lib/db.ts`의 `ensureSchema()`. 별도 `schema.sql`/Prisma/ORM 모델 파일은 **없음**. 모든 테이블은 앱 최초 요청 시 `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`로 멱등 생성됩니다.

---

## 2) 데이터 모델 (전체 테이블)

> 출처: `src/lib/db.ts` (`ensureSchema()`). 아래는 실제 정의를 정리한 것이며, 타입/기본값/PK는 코드와 일치합니다.

### 사용자 · 세션 · 권한
**users** — 회원
| 컬럼 | 타입 | 필수/기본 | 비고 |
|---|---|---|---|
| id | text | PK | 앱 생성 ID |
| email | text | UNIQUE, NOT NULL | 로그인 ID |
| password_hash | text | NOT NULL | bcrypt |
| name | text | NOT NULL | |
| brand | text | | |
| role | text | | 직무(자유입력) |
| plan | text | NOT NULL, default `'basic'` | basic/pro/enterprise |
| pro_until | bigint | NOT NULL, default 0 | Pro 만료 epoch(ms) |
| referred_by | text | | 추천인 코드(FK→referrers.code, 논리적) |
| markets | text | | 열람 가능 국가 CSV |
| created_at | timestamptz | default now() | |

**referrers** — 추천인(영업 파트너) 로그인 계정
| code (PK) | login_id (UNIQUE) | password_hash | name | created_at |

**subscriptions** — Pro SaaS 정기결제 (users 1:1)
| user_id(PK) | bid(빌링키) | plan | amount | status(`trial`/`active`/`past_due`/`canceled`) | next_charge_at(bigint ms) | failures | period_days | created_at | updated_at |

**mall_subscriptions** — 틱톡샵 멀티몰 입점 정기결제 (users 1:1, Pro와 분리)
| user_id(PK) | track | bid | amount | status(`active`/`canceled`/`past_due`) | next_charge_at | failures | period_days | created_at | updated_at |

### 결제
**orders** — 주문/원장 헤더
| order_id(PK) | user_id | plan | amount(int) | goods_name | status(`created`/`paid`/`failed`) | kind(`once`/`subscribe`/`mall`) | charge_amount(int) | period_days(default 30) | tid(NicePay 거래ID) | created_at |

**payments** — 결제 원장(감사용, tid=멱등키)
| payment_id(PK=tid) | order_id | amount | raw(jsonb, PG 응답 원본) | created_at |

### 문의 · 상담 · 온보딩
**inquiries** — 마케팅/제안/도입 문의 (모달)
| id(serial PK) | kind(`marketing`/`tiktokshop`/`proposal`/`sales`) | user_email | payload(jsonb) | status(default `pending`) | response | created_at | updated_at |

**consult_requests** — 입점 상담/소개서 신청 (랜딩 폼)
| id(serial PK) | company(NOT NULL) | brand_url | category | overseas | manager_name(NOT NULL) | email(NOT NULL) | contact(NOT NULL) | message | agreed(bool) | source | status(default `new`) | created_at |

**consult_progress** — 상담 폼 **입력 퍼널 추적**(비식별, PII 미저장)
| sid(PK) | fields(jsonb=채운 필드 키 배열) | last_field | field_count | category | agreed | completed | ua | referrer | utm_source | utm_medium | utm_campaign | utm_content | utm_term | landing | created_at | updated_at |

**onboarding_applications** — 틱톡샵 입점 신청(사용자당 1건, id=`onb_{user_id}`)
| id(PK) | user_id | name | brand | contact | email | category | note | status(`self_checked`/`paid`/`details_submitted`) | order_id | track | grade | recommended_track | countries(CSV) | term(`monthly`/`6month`) | amount(int) | phase(`self_check`/`track_select`/`details`/`completed`) | referral_code | dino_linked(bool) | payload(jsonb, 상세 전체) | created_at | updated_at |

**onboarding_files** — 온보딩 업로드 파일(base64 DB 저장)
| id(PK) | user_id | kind(`biz_reg`/`product_cert`/`product_photo`) | product_index(int) | filename | mime | size(int) | data(text=base64) | created_at |

### 프로모 · 초대 · 북마크 · UTM
- **promo_codes** (code PK, plan, trial_days, max_uses, used_count, active) / **promo_redemptions** (code+user_id PK)
- **invites** (id, inviter_email, invitee_email, brand_domain)
- **bookmarks** (user_id+type+item_id PK)
- **utm_events** — 방문/가입 UTM 로그 (id, kind, source, medium, campaign, content, term, landing_path, referrer, user_id, user_email, created_at)
- **presence** — 동시접속 하트비트 (sid PK, last_seen)

### 데이터(크롤링) 도메인 — kalodata형 분석
- **videos** (video_id PK, brand_name, handle, views, likes, comments, shares, is_ad, is_shop, posted_at, url, country default `US`, tier, product_ref, collected_at)
- **video_snapshots** (video_id+snap_date PK, views) — 조회수 증분/급상승
- **products** (product_id PK=`{country}:{원본상품ID}`, brand_name, title, price, currency, sold_count, commission_rate, url, country, collected_at)
- **product_snapshots** (product_id+snap_date PK, sold_count, price, est_gmv) — 판매 추이/성장률
- **creators** (handle PK, videos, total_views, avg_views, brands text[], updated_at)
- **brand_stats** (brand_name PK, videos, influencers, total_views, avg_views, max_views, shop_count)
- **brand_shop_stats** (brand_name PK, products, avg_commission, total_sold, est_gmv)
- **brand_tracking** (brand_name PK, tracked, interval_hours, hashtags, handle, last_collected_at)
- **brand_requests** (id, brand_name, handle, hashtags, requested_by, source, status, note, collected, attempts)
- **collect_jobs** (run_id PK=Apify runId, brand_name, since_date, status(`running`/`done`/`failed`), collected, kind(`video`/`shop`), region, created_at, updated_at)
- **collection_runs** (id, kind, target, status, collected, error, created_at) — 실행 로그
- **blocklist** (kind+value PK, reason) — 오태깅 차단
- **admin_settings** (key PK, value jsonb) — 크롤링 규칙/튜닝/커서 등
- **remake_assets / remake_ref_frames** — 영상 리메이크 실험용

> **관계 요약(FK는 논리적, DB 제약은 없음)**: `orders.user_id`→users, `payments.order_id`→orders, `subscriptions/mall_subscriptions.user_id`→users, `onboarding_applications.user_id`→users(+`order_id`→orders), `onboarding_files.user_id`→users, `users.referred_by`→referrers.code, `videos.product_ref`→products(국가 프리픽스 제거 후 매칭), `product_snapshots.product_id`→products.

---

## 3) 데이터 수집 폼 (모든 필드)

### (A) 입점 상담/소개서 폼 — 2종
공용 저장 API: **`POST /api/consult`** → **consult_requests** 테이블. 입력 퍼널은 **`POST /api/consult/track`** → **consult_progress**.

**1) `/consult` (소개서 받기, 2번 모델)** — `src/app/consult/page.tsx`
| 라벨 | 키 | 타입 | 필수 | 검증 |
|---|---|---|---|---|
| 회사명/브랜드명 | company | text | ✅ | 비어있지 않음 |
| 카테고리 | category | select | ✅ | 스킨케어/메이크업/헤어케어/바디·퍼스널케어/이너뷰티·건기식/패션·잡화/푸드/기타 |
| 담당자 성함 | managerName | text | ✅ | |
| 이메일 | email | email | ✅ | `^[^@\s]+@[^@\s]+\.[^@\s]+$` |
| 연락처 | contact | text | ✅ | |
| 개인정보 수집·이용 동의 | agreed | checkbox | ✅ | **기본 체크됨** |
- 제출 시 `source: "deck-landing"`. 성공 후 소개서(Deck) 링크 노출.

**2) `/consult1` (틱톡샵 상담, 1번 모델)** — `src/app/consult1/page.tsx`
- 위와 동일 + **기타 문의 내용(message, textarea, 선택)** 포함. `source: "consult-landing"`. 성공 후 1:1 미팅 예약 링크 노출.

> 두 폼 모두 진입 시 **UTM(utm_source/medium/campaign/content/term) + document.referrer + landing**을 캡처(first-touch 보존)하여 `/api/consult/track`으로 전송 → consult_progress에 기록.

### (B) 문의 모달 (1:1/제안/도입) — `src/components/ktrend/InquiryModal.tsx`
저장 API: **`POST /api/inquiry`** → **inquiries**.
- kind: `marketing`(마케팅 1:1) / `tiktokshop`(틱톡샵 온보딩) / `proposal`(인플루언서 제안) / `sales`(도입 문의)
- payload(jsonb): company, context(대상), budget(예산/단가), message, email 등 kind별 자유 필드.

### (C) 회원가입/로그인 — `src/app/signup`, `src/app/login`
- signup(`POST /api/auth/signup`): **name·email·password·brand 필수**, role 선택, 추천코드(ref) 선택(→ users.referred_by). 가입 시 UTM은 **utm_events**(kind=`signup`)에 기록. (프로모 코드는 가입이 아닌 **결제 단계**에서 적용.)

### (D) 온보딩 자가진단 — `src/app/onboarding/page.tsx` → **9)와 4) 참조**

### (E) 마이페이지 입점 정보 입력 — 결제 사용자
- **입점 기본정보** (`OnboardingBasicInfo.tsx`) → `POST /api/onboarding/apply` (stage=`basic`)
  - 필드: brandKo(브랜드 국문, 필수), brandEn, bizNo(사업자등록번호), repName(대표자), managerName(담당자), contact(필수), email, settlement{bank, acct, holder}, bizRegFile(업로드), note
- **제품별 서류·정보** (`OnboardingProductDocs.tsx`, **최대 5개**) → `POST /api/onboarding/products`
  - 제품당: nameKo, nameEn, cat, price, cert(인증서 파일), photos[](라벨/실물 사진 최소 2장), label{productName,netQuantity,directions,ingredients,contact}(체크), contact{address,phone,website}(**텍스트 입력**), realPhoto(실물사진 포함 확인)
  - 파일 업로드: `POST /api/onboarding/upload` (kind=biz_reg/product_cert/product_photo, PDF·JPG·PNG, 최대 4MB) → onboarding_files

### (F) Pro 결제 카드 폼 — `src/app/checkout` → `POST /api/payment/subscribe`
- cardNo, expMonth(MM), expYear(YY), idNo(생년월일6 또는 사업자10), cardPw(앞2자리). **카드정보는 즉시 AES 암호화(`encryptCardData`) 후 NicePay 전송, DB 저장/로그 금지.**

---

## 4) 화면 목록 & 유저 플로우

### 공개/서비스 페이지 (`src/app/**/page.tsx`)
`/`(홈), `/plans`, `/plans/mall`, `/consult`(소개서 받기), `/consult1`(입점 상담), `/onboarding`(자가진단→트랙→결제), `/onboarding/done`, `/checkout`, `/checkout/result`, `/signup`, `/login`, `/forgot`, `/mypage`, `/partner`(추천인 로그인), `/guide`, `/guide/[slug]`, `/tts/qna`, `/privacy`, `/terms`, `/explorer`, `/influencers`, `/influencer/[handle]`, `/reports`, `/saved`, `/viral`, `/remake`, `/remake/studio`

### 데이터 분석 페이지 (kalodata형, 메뉴 비노출)
`/products`, `/product/[id]`, `/shops`, `/shop/[name]`, `/creators`, `/creator/[handle]`, `/videos`, `/category`, `/live`, `/brand/[id]`

### 관리자
`/admin`(대시보드, 탭: 회원·결제/결제현황/문의·제안/1:1 상담신청/상담 입력 퍼널/프로모/틱톡샵 온보딩/추천인/브랜드 수집/인플루언서/브랜드/유입(UTM)/크롤링 규칙), `/admin-tools`(진단 버튼)

### 핵심 플로우
1. **소개서 받기**: `/consult` 진입(UTM 캡처) → 폼 입력 → `POST /api/consult` → consult_requests 저장 + Slack 알림 → 소개서 링크 노출.
2. **입점(결제) 플로우**: `/onboarding` 자가진단(선택) → 트랙 선택 → 국가 선택·카드결제(`/api/payment/subscribe-mall`) → **결제완료 화면** → **[기본정보 입력하러 가기] → `/mypage?tab=basic`** → 기본정보 저장 → 제품 서류·정보 저장.
   - 상태 전이(onboarding_applications.status): `self_checked` → (결제) `paid` → (기본정보 저장) `details_submitted`. phase: `self_check`→`track_select`→`details`→`completed`.
3. **Pro 구독**: `/checkout` 카드 등록 → `/api/payment/subscribe` → subscriptions 생성 → 이후 `/api/cron/subscribe`가 주기 청구.

---

## 5) API / 서버 액션 / 웹훅

> 모든 라우트: `src/app/api/**/route.ts`. 인증: **User**=`ktrend_session` 쿠키, **Admin**=`ktrend_admin` 쿠키, **Cron**=`CRON_SECRET`(Bearer/`?key=`/헤더), **공개**=무인증.

### 인증
| 메서드·경로 | 요청 | 인증 | 응답 |
|---|---|---|---|
| POST `/api/auth/signup` | email,password,name,brand,role,promo?,ref? | 공개 | 세션 쿠키 발급 |
| POST `/api/auth/login` | email,password | 공개 | 세션 |
| POST `/api/auth/logout` | — | User | ok |
| GET `/api/auth/me` | — | User | 현재 사용자 |
| POST `/api/auth/forgot` | email | 공개 | 재설정 처리 |

### 문의/상담
| POST `/api/consult` | company,category,managerName,email,contact,message?,agreed,source | 공개 | consult_requests 저장 + **Slack 알림** |
| POST `/api/consult/track` | sid,fields[],lastField,category,agreed,completed,utm,landing,referrer | 공개 | consult_progress upsert(비식별) |
| POST `/api/inquiry` | kind,payload… | 공개(로그인 시 이메일 연결) | inquiries 저장 + Slack |
| GET/POST `/api/proposals` | — | User | 내 제안 조회/철회 |

### 온보딩
| POST `/api/onboarding/apply` | stage=`self_check`\|`basic`\|`details` + 각 필드 | User | onboarding_applications upsert |
| POST `/api/onboarding/products` | products[] | User(+결제증빙) | payload.details.products 병합 저장 |
| POST `/api/onboarding/upload` | file,kind,productIndex | User | onboarding_files 저장, {id,filename} 반환 |
| GET `/api/onboarding/file/[id]` | — | User | 파일 다운로드 |
| GET `/api/onboarding/status` | — | User | application+mallSub+orders |
| POST `/api/onboarding/cancel` | — | User | mall 정기결제 해지 |

### 결제 (상세는 6) 참조)
`/api/payment/subscribe`(Pro), `/api/payment/subscribe-mall`(몰), `/api/payment/start`, `/api/payment/return`, `/api/payment/cancel`, **`/api/payment/webhook`(NicePay 인바운드 웹훅)**.

### 크론 (vercel.json)
| GET `/api/cron/subscribe` | `0 1 * * *` (매일) | CRON_SECRET | 정기결제 자동청구 |
| GET `/api/cron/collect-shop` | `0 * * * *` (매시) | CRON_SECRET | 틱톡샵 상품 수집 |
| `/api/cron/collect` | (수동/외부) | CRON_SECRET | 영상 수집 사이클 |

### 데이터 조회(분석 페이지용, 공개 읽기)
`/api/products`, `/api/products/[id]`, `/api/shops`, `/api/shops/[name]`, `/api/creators`, `/api/creators/[handle]`, `/api/videos`, `/api/categories`

### 수집 웹훅(인바운드) & 외부 호출(아웃바운드)
- **인바운드**: `POST /api/ingest/apify` — Apify run 완료 webhook 수신(`?secret=INGEST_SECRET`). datasetId 검증 후 videos/products 적재. `POST /api/payment/webhook` — NicePay 결제 이벤트 수신(HMAC-SHA256 서명 검증).
- **아웃바운드**: NicePay API(`https://api.nicepay.co.kr`), Apify API(`https://api.apify.com`), Slack Webhook, (리메이크) Gemini/Higgsfield.

### 관리자 API (모두 Admin 인증)
`/api/admin/overview`, `/members`, `/grant`, `/promo`, `/referrers`, `/consult`, `/consult-funnel`, `/inquiry`, `/collect*`, `/tracking`, `/utm`, `/markets`, `/block`, `/settings`, `/pay-config`, `/payment-cancel`, `/slack-test`, `/data-debug`, `/shop-jobs-debug`, `/session`, `/login`, `/logout`, `/reset-password`, `/seed-*`

---

## 6) 결제

### PG · 방식
- **NICEPAY V2 빌링키(정기결제)**. 호스팅 결제창 없이 **카드폼 → 서버에서 AES 암호화(`encryptCardData`) → 빌키 발급(`/v1/subscribe/regist`) → 빌키로 청구(`/v1/subscribe/{bid}/payments`)**. (`src/lib/nicepay.ts`)
- 카드 원문은 **저장/로그 금지**, 암호화 즉시 전송.

### 상품/플랜/금액 (`src/lib/payments.ts`, `src/data/ktrend/meta.ts`)
| 플랜 | 금액(정가) | 결제 종류 | API | 비고 |
|---|---|---|---|---|
| **Pro** (SaaS) | ₩89,000/월 | 정기(subscriptions) | `/api/payment/subscribe` | period 30일 |
| **Live Focus Track** (멀티몰) | **₩490,000/월** | 정기(mall_subscriptions) | `/api/payment/subscribe-mall` | 판매수수료 10%, 다국가/약정 할인 |
| **Onboarding Track** | ₩3,000,000 (**가격 문의**) | 결제 없음(문의) | — | `inquiry:true`, 결제 차단 |

- **다국가/약정 동적 요금**(`computeQuote`, `src/lib/onboarding.ts`): 월 기본료=트랙료×국가수, 다국가 할인(2국 10%/3~4국 15%/5국 20%), 6개월 약정 20% 추가할인. 6개월은 6개월치 일시결제(period 180일).
- **프로모**: 월간=첫 달 무료(스킵), 6개월=첫 달 제외 5개월치 청구.

### ⚠️ "49만/100만" 두 플랜 — 정확한 사실
- **49만 = Live Focus Track** → **실제 결제/구독 로직 있음**(`subscribe-mall`, mall_subscriptions).
- **100만 = Guarantee Track** → **결제 로직 없음**. `/consult1`의 **마케팅 오퍼 카드**(`GuaranteeCard`, ₩1,000,000/월 + 판매수수료 10%, 최소 6개월)로만 존재하며, **구매 플로우·DB 레코드가 코드에 없습니다.** 이 트랙은 상담을 통해 수기 처리하는 것으로 보입니다. (개런티 트랙을 직접결제화하려면 별도 구현 필요.)

### 결제 성공/실패/해지 시 DB 기록
**멀티몰 최초 결제 성공(`/api/payment/subscribe-mall`)** 시 기록:
1. **orders**: `INSERT ... status='created'` → 승인 후 `status='paid', tid=…`
2. **payments**: `INSERT (payment_id=tid, order_id, amount, raw)` (멱등)
3. **mall_subscriptions**: upsert(track, bid, amount=정기청구액, status=`active`, next_charge_at, period_days)
4. **onboarding_applications**: upsert(id=`onb_{user_id}`, status=`paid`, phase=`details`, track, term, amount, dino_linked=true)
- **실패**: orders `status='failed'`, 402 응답(구독/신청 미생성).
- **정기청구(cron)**: 성공→orders paid+payments+구독 유지, 다음 청구일 전진; 실패→failures++, 임계(3) 초과 시 `past_due`. `pg_advisory_lock`으로 중복청구 방지, next_charge_at **선점 전진** 후 청구.
- **해지**(`/api/onboarding/cancel`, `/api/payment/cancel`): 구독 `status='canceled'`(기간 종료까지 유지). *마이페이지의 사용자 해지 버튼은 현재 제거됨 — API는 유효.*
- **NicePay 웹훅**(`/api/payment/webhook`): HMAC 서명 검증 후 payments에 원본 기록.

---

## 7) 외부 연동 & 환경변수 (이름만)

### 환경변수 (값 절대 금지)
`POSTGRES_URL`, `DATABASE_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL_UNPOOLED`,
`SESSION_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAILS`,
`NICEPAY_CLIENT_KEY`, `NICEPAY_SECRET_KEY`, `NICEPAY_API_BASE`, `NICEPAY_ENC_MODE`, `NICEPAY_WEBHOOK_SECRET`, `SERVICE_ORDER_PREFIX`, `PAY_TEST_TOKEN`,
`SCRAPER_API_KEY`, `SCRAPER_PROVIDER`, `APIFY_ACTOR`, `SHOP_ACTOR`, `SHOP_ACTOR_INPUT`, `SHOP_COUNTRIES`, `SHOP_COUNTRY`, `SHOP_MAX_BRANDS`, `SHOP_MAX_ITEMS`, `SHOP_MAX_POLL`, `SHOP_MAX_RUNNING`, `SHOP_RETRY_DAYS`, `SHOP_JOB_TIMEOUT_MIN`,
`COLLECT_COUNTRY`, `COLLECT_REGIONS`, `COLLECT_INITIAL_LIMIT`, `COLLECT_REFRESH_LIMIT`, `COLLECT_MAX_PENDING`, `COLLECT_MAX_REFRESH`, `COLLECT_MAX_POLL`, `COLLECT_BACKFILL_DAYS`, `COLLECT_TAG_SUFFIXES`, `COLLECT_JOB_TIMEOUT_MIN`,
`CRON_SECRET`, `INGEST_SECRET`, `SLACK_WEBHOOK_URL`,
`NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_PATH`, `NEXT_PUBLIC_GLOVEK_DECK_URL`, `NEXT_PUBLIC_GLOVEK_MEETING_URL`, `NEXT_PUBLIC_ONBOARDING_APPLY_URL`,
`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GEMINI_BASE_URL`, `GEMINI_*_MODEL`, `GEMINI_SUBMIT_TIMEOUT_MS`, `HF_CREDENTIALS`, `HF_BASE_URL`, `HF_*_MODEL`, `REMAKE_*`(PROVIDER/TIER/COST_SAVER/FRAME_*/ASSEMBLE_WORKER_*/CAPTION_LANG/AI_MODEL), `NODE_ENV`

### 연동 서비스
- **PG**: NICEPAY (결제)
- **스크래핑**: Apify (TikTok/TikTok Shop actor)
- **알림**: Slack (Incoming Webhook)
- **애널리틱스**: Meta Pixel (자체 픽셀), 자체 UTM/퍼널 테이블
- **영상 생성(실험)**: Gemini / Higgsfield 외부 워커
- **Notion**: **연동 없음** (코드 내 Notion API/토큰/호출 전무). 연동하려면 외부에서 DB(Postgres) 직접 조회 또는 신규 API 필요 — 8/9 참조.

---

## 8) 인증 / 권한

- **사용자 세션**: `jose` JWT(HS256, `SESSION_SECRET`), httpOnly 쿠키 `ktrend_session`, 만료 30일. (`src/lib/auth.ts`)
- **관리자 세션**: 완전 분리된 쿠키 `ktrend_admin`, ID/PW(`ADMIN_USERNAME`/`ADMIN_PASSWORD`) 로그인, 만료 12h. 모든 `/api/admin/*`는 `isAdminAuthed()` 필수. (`src/lib/admin-auth.ts`)
- **추천인(영업 파트너) 세션**: referrers 테이블 기반 별도 로그인(`/api/ref/login`), 자신이 추천한 가입자만 조회.
- **역할/접근제어**: `users.plan`(basic/pro/enterprise) + `pro_until`로 Pro 기능 게이팅. `users.markets`(CSV)로 국가별 데이터 열람 제어(US 항상 허용). 관리자만 전체 데이터/결제/수집 제어.

---

## 9) 데이터 저장 위치 (최종 적재처)

| 유입 데이터 | 최종 저장 | 부가 |
|---|---|---|
| 소개서/상담 폼 | **consult_requests** | Slack 알림, 어드민 "1:1 상담신청" 탭 |
| 상담 폼 입력 진행(드롭오프) | **consult_progress** | 어드민 "상담 입력 퍼널" 탭 (UTM 소스별 완료율 포함) |
| 문의 모달 | **inquiries** | 어드민 "문의·제안" 탭 |
| 회원 | **users** (+ subscriptions) | |
| 입점 신청/기본정보/제품서류 | **onboarding_applications**(payload jsonb) + **onboarding_files** | 어드민 "틱톡샵 온보딩" 탭 상세 모달 |
| 결제 | **orders** + **payments** (+ subscriptions / mall_subscriptions) | |
| 영업(추천인) 유입 | **users.referred_by** + **referrers** + onboarding_applications.referral_code | 어드민 "추천인" 탭, `/partner` |
| 광고 유입(UTM) | **utm_events**(방문/가입) + **consult_progress**(상담 폼) | |
| 크롤링 데이터 | videos/products/creators/brand_stats/… | 분석 페이지 |

---

## 사이트 특화 정리

### (a) 1:1 문의 폼 — 수집 필드 & 데이터 흐름
- **경로**: `/consult1`(폼) 또는 문의 모달(`InquiryModal`).
- **`/consult1` 필드**: company(회사/브랜드), category, managerName, email, contact, message(선택), agreed. → `POST /api/consult` → **consult_requests**(source=`consult-landing`) → **Slack 알림**(회사·담당자·이메일·연락처·카테고리·내용) → 어드민 "1:1 상담신청" 탭에서 상태(new/contacted/done) 관리.
- **모달(`/api/inquiry`)**: kind별 payload → **inquiries** → Slack → 어드민 "문의·제안" 탭(관리자 답변 시 마이페이지 노출).
- **입력 퍼널**: 필드 blur/이탈/완료 시 `/api/consult/track` → **consult_progress**(어느 필드까지 채웠는지 + UTM). 어드민에서 "어느 광고에서 들어와 어디서 이탈했는지" 확인.

### (b) 멀티몰 직접결제 (49만 / 100만)
- **49만 = Live Focus Track**: 실제 정기결제(`/api/payment/subscribe-mall`). 결제 성공 시 **orders(paid)+payments(tid)+mall_subscriptions(active)+onboarding_applications(paid)** 생성. 두 플랜 중 **유일하게 코드에 구매 플로우가 존재**.
- **100만 = Guarantee Track**: `/consult1`의 **마케팅 카드만 존재**(₩1,000,000/월, 판매수수료 10%, 최소 6개월, "온보딩 보장"). **결제 API·DB 레코드 없음** → 상담/수기 처리. 직접결제화하려면 신규 구현 필요.
- **차이 요약**: Live Focus=자동 구독·자동청구·해지 관리 있음 / Guarantee=코드상 결제 없음(오퍼 소개만).

### (c) "영업자 통해 관리 유입 DB"
- **구조**: 어드민이 **referrers**(code, login_id, password) 발급 → 영업자가 `/partner`에서 로그인 → 자신의 추천 코드로 가입한 사용자 확인.
- **연결**: 가입 시 추천코드 입력 → **users.referred_by = code**. 입점 신청엔 **onboarding_applications.referral_code**.
- **집계**: 어드민 "추천인" 탭 / `/api/admin/referrers` → 코드별 가입자수·유료전환수·매출(orders paid 합) 자동 산출.

### (d) `/onboarding` 셀프 등급 진단 (사전분석 엔진 직결)
- **문항**(`SELF_CHECK_QUESTIONS`, `src/lib/onboarding.ts`): 5개 Y/N — ①해외 플랫폼 월매출 1천만↑ ②수출인증/현지물류 보유 ③직수출 6개월↑ ④해외 팝업/전시 이력 ⑤인플루언서 시딩 10회↑.
- **국가별 인증 문항**(`ONB_COUNTRIES`): US(FDA 등록, 영문 라벨), VN(보건부 신고), TH(태국 FDA), MY(할랄), SG(HSA) + 공통(원산지증명).
- **등급 계산**(`gradeFromChecks(yesCount)`): 5→**S**, 4→**A**, 2~3→**B**, 0~1→**C**. 추천 트랙: S/A→onboarding, B/C→live.
- **저장**: `POST /api/onboarding/apply` stage=`self_check` → onboarding_applications: 컬럼 grade/recommended_track/track/countries + **payload.checks/yes/certs/referral**. 미비 인증(`missingCerts`)은 없음/모름 응답에서 도출(가이드 발송 대상).
- **요금 연동**: 등급/국가/약정 → `computeQuote`로 실시간 금액 산출 → 결제 금액 서버 권위 계산.

### (e) Notion 등 기존 연동
- **없음.** 코드베이스에 Notion(또는 Google Sheets/CRM) 연동 코드가 전혀 없습니다. 외부 시스템 연동 시에는 (1) Postgres 직접 조회(읽기 전용 커넥션 권장), 또는 (2) 필요한 데이터별 신규 read-only API 신설을 권장합니다.

---

## 연동 시 주의점 / 현재 부족한 점 (한 단락)

스키마의 유일한 출처는 `src/lib/db.ts`의 `ensureSchema()`이며 **마이그레이션 도구·ORM·FK 제약이 없습니다** — 컬럼 추가는 코드에 `ALTER TABLE ... IF NOT EXISTS`로 반영해야 하고, 참조 무결성은 애플리케이션 로직에만 의존하므로 외부에서 쓰기 연동 시 주의가 필요합니다(가급적 **읽기 전용**으로 붙이세요). 온보딩 상세·제품 서류·자가진단 응답 등 핵심 데이터가 `onboarding_applications.payload`(jsonb)에 비정형으로 들어 있어 Notion/외부 스키마 매핑 시 payload 구조 파싱이 필요합니다. **Guarantee(100만) 트랙은 결제·레코드가 없어** 매출 집계에서 누락되며(상담/수기 처리), 직접결제화가 미구현 상태입니다. 업로드 파일이 DB에 base64로 저장(4MB 제한)되어 대용량·장기 보관에는 오브젝트 스토리지(S3 등) 이전이 권장됩니다. 정기결제 해지 버튼이 현재 UI에서 제거되어 **사용자 셀프 해지 경로가 없고**(API는 존재) 관리자/매니저 처리에 의존합니다. 마지막으로 UTM은 상담 폼(consult_progress)과 방문/가입(utm_events)에 **분리 저장**되어 있어 전체 퍼널을 한 눈에 보려면 두 테이블 조인이 필요하며, Notion 연동은 아직 없으므로 신규 설계가 요구됩니다.

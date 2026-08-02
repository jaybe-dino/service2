# glovek.space → 운영 어드민(tiktokadmin) 연동 · **구현 결과서**

> 대상: tiktokadmin(운영 어드민) 담당 — glovek 측 구현 완료분을 대조·검수하기 위한 문서.
> 정본 스펙: `docs/integration/glovek.space.md` (본 결과서는 그 스펙에 대한 **실제 구현 현황**).
> 상태 표기: ✅ 구현 완료(배포됨) · ⬜ 운영 작업 대기(코드 아님).

---

## 0. 요약 — 어드민이 해야 할 것 (체크리스트)

| # | 항목 | 담당 | 상태 |
|---|---|---|---|
| A | glovek Vercel에 env 3개 설정: `ADMIN_INGEST_URL`, `ADMIN_INGEST_SECRET`(또는 `INGEST_SECRET`), `FILE_API_TOKEN` | glovek 운영자 | ⬜ |
| B | 어드민 수신 엔드포인트에 **`onboarding` event** 추가 (정본 스펙엔 lead/diagnosis/payment만) | tiktokadmin | ⬜ |
| C | 어드민 payment enum에 **`guarantee_1000k`** plan 값 허용 추가 | tiktokadmin | ⬜ |
| D | read-only DB 롤(`GLOVEK_DB_URL_RO`) 발급·전달 | glovek 운영자 | ⬜ |
| E | 수신 테스트(아래 6장 curl) 후 dedup·매칭 정상 확인 | 양측 | ⬜ |

> **A만 하면 이벤트 송신은 즉시 동작**합니다. B·C를 안 하면 해당 이벤트만 400/404로 거부(로그만 남고 glovek 사용자 흐름엔 무영향), 나머지는 정상.

---

## 1. 발신 공통 규격 (구현됨) ✅

- **코드**: `src/lib/admin-ingest.ts` — `sendIngest(event, idemKey, body)`
- **호출**: `POST {ADMIN_INGEST_URL}/api/ingest/{event}`
- **헤더**: `X-Ingest-Secret`(= `ADMIN_INGEST_SECRET` 우선, 없으면 `INGEST_SECRET`) · `X-Idempotency-Key` · `Content-Type: application/json`
- **바디 공통**: 매 호출 `{ site:"glovek", occurred_at:<UTC ISO>, ...event별 필드 }` 자동 부착
- **비차단**: 모든 호출은 Next `after()`(응답 후 실행) 또는 cron 내 비동기 — **사용자 흐름 차단 없음(fire-and-forget)**
- **재시도**: 실패 시 1회 재시도, **400/401/404는 즉시 중단**(재시도 무의미), 그 외 실패는 로컬 로그만
- **미설정 시**: `ADMIN_INGEST_URL` 없으면 **no-op**(아무 것도 안 보냄)

---

## 2. 이벤트 발신 지점 — 전수 (구현됨) ✅

| # | 트리거 (파일) | event | 멱등키 | 상태 |
|---|---|---|---|---|
| 1 | `/api/consult` 저장 직후 (`src/app/api/consult/route.ts`) | `lead` | `consult:{id}` | ✅ |
| 2 | `/api/inquiry` 저장 직후 (`inquiry/route.ts`) | `lead` | `inq:{id}` | ✅ |
| 3 | 추천인 코드 경유 가입 (`auth/signup/route.ts`) | `lead` | `signup:{user_id}` | ✅ |
| 4 | 자가진단 저장 (`onboarding/apply` stage=self_check) | `diagnosis` | `diag:{onb_id}:{epoch}` | ✅ |
| 5 | 멀티몰 첫 결제 (`payment/subscribe-mall`) · Pro 첫 결제 (`payment/subscribe`) | `payment` | `pay:{tid}` | ✅ |
| 6 | 정기결제 갱신 성공/실패 (`cron/subscribe`) | `payment` | `pay:{tid}` / `pay:{orderId}` | ✅ |
| 7 | 해지 (`payment/cancel`, `onboarding/cancel`) | `payment` | `cancel:{user_id}:{date}` | ✅ |
| 8 | 입점 상세 저장/결제 (`onboarding-sync.ts` — 기본정보·제품·결제 시 전체 스냅샷) | `onboarding` | `onb:{onb_id}:{epoch}` | ✅ *(어드민 수신 추가 필요=항목 B)* |

### 2-1. lead — consult (`source:"glovek_consult"`)
```json
{ "site":"glovek","occurred_at":"<UTC>","email":"...","phone":"<숫자만>",
  "brand_name":"<회사/브랜드>","brand_url":"...","contact_name":"<담당자>","category":"...",
  "source":"glovek_consult","message":"<문의>",
  "utm":{"source":"","medium":"","campaign":"","content":"","term":""},
  "source_ref":"<consult_requests.id>" }
// idem: consult:{id}
```
### 2-2. lead — inquiry (`source:"glovek_inquiry"`)
```json
{ "site":"glovek","occurred_at":"...","email":"...","phone":"<숫자만>","brand_name":"...",
  "category":"<kind>","source":"glovek_inquiry","message":"<kind 포함 요약>","source_ref":"<inquiries.id>" }
// idem: inq:{id}
```
### 2-3. lead — 추천가입 (`source:"referrer"`)
```json
{ "site":"glovek","occurred_at":"...","email":"...","brand_name":"...","contact_name":"...",
  "source":"referrer","referral_code":"<ref>","message":"추천인 코드 ... 경유 가입","source_ref":"<users.id>","utm":{...} }
// idem: signup:{user_id}
```
### 2-4. diagnosis
```json
{ "site":"glovek","occurred_at":"...","email":"...","grade":"S|A|B|C","rec_track":"onboarding|live",
  "countries":["US","VN"],"checks":{"q1":true,"q2":false,"q3":true,"q4":false,"q5":true},
  "missing_certs":["🇺🇸 미국 — FDA 등록 완료 여부"],"glovek_onb_id":"<onb.id>","source_ref":"<onb.id>" }
// idem: diag:{onb_id}:{epoch}
```
### 2-5. payment
```json
// 첫 결제
{ "site":"glovek","occurred_at":"...","email":"...","pay_kind":"subscribe_first",
  "plan":"live_focus_490k | pro_89k | guarantee_1000k","amount":490000,"pg_ref":"<tid>","glovek_user_id":"<users.id>" }
// 갱신
{ "...","pay_kind":"subscribe_renew","result":"ok|fail","pg_ref":"<tid|orderId>","glovek_user_id":"<users.id>" }
// 해지
{ "...","pay_kind":"cancel","glovek_user_id":"<users.id>" }
```
> ⚠️ **plan 값 `guarantee_1000k`** 는 정본 스펙에 없던 신규 값(항목 C). 어드민 enum 추가 필요.
> 단, 현재 결제 심사 대응 모드에서 Guarantee는 노출 차단 중 → 실제 발생은 롤백 후.

### 2-6. onboarding (전체 스냅샷) — 정본 스펙 외 추가 구현
`src/lib/onboarding-sync.ts` — 기본정보 저장·제품 저장·결제 시마다 **입점 전체 스냅샷** 전송.
```jsonc
{ "site":"glovek","occurred_at":"...","email":"...","glovek_user_id":"...","glovek_onb_id":"...",
  "status":"paid","phase":"details","track":"live","grade":"A","countries":["US"],"term":"monthly","amount":490000,
  "referral_code":null,"brand_ko":"...","brand_en":"...","biz_no":"...","rep_name":"...","manager_name":"...","contact":"...",
  "settlement":{"bank":"","acct":"","holder":""},
  "bizreg_file_url":"https://glovek.space/api/onboarding/file/<id>",   // 서버간 다운로드(아래 3장)
  "note":"...",
  "products":[{ "no":1,"name_ko":"...","name_en":"...","category":"...","price":"...",
    "cert_url":".../file/<id>","photo_urls":[".../file/<id>"],
    "label_checks":{"product_name":true,"net_quantity":true,"directions":false,"ingredients":true,"contact":true},
    "contact":{"address":"","phone":"","website":""},"real_photo":true }],
  "source_ref":"<onb.id>" }
// idem: onb:{onb_id}:{epoch}
```

---

## 3. 파일 접근 API (구현됨) ✅ — 어드민이 서류/사진 다운로드

인증 헤더 **`X-File-Token: {FILE_API_TOKEN}`** (신규 env). 코드: `src/app/api/partner/files/**`

| 용도 | 메서드·경로 | 인증 |
|---|---|---|
| 고객 파일 메타 목록 | `GET /api/partner/files?user_id=` (또는 `?email=`) | `X-File-Token` |
| 파일 스트림(mime) | `GET /api/partner/files/{file_id}` | `X-File-Token` 또는 서명쿼리 |
| **15분 서명 URL 발급** | `GET /api/partner/files/{file_id}/url` → `{url, expires_at}` | `X-File-Token` |

- 서명 URL(HMAC-SHA256·15분)은 **헤더 없이** 만료 전까지 접근 가능 → 어드민 UI에서 임시 링크로 노출 가능.
- (별도) `onboarding` 이벤트의 `*_file_url`(`/api/onboarding/file/<id>`)은 **`?key={시크릿}`** 서버간 다운로드도 허용.

---

## 4. 데이터 일괄 추출 (구현됨) ✅ — 초기 이관/대조용

관리자 로그인 상태에서 다운로드. 코드: `src/app/api/admin/export/route.ts`, `export-all/route.ts`

- **통합 ZIP**: `GET /api/admin/export-all` → `glovek_export_{날짜}.zip`
  (전 테이블 CSV[해시·카드정보 제외] + `payload_schema.md` + `logic_source.md`(자가진단·요금 로직 원문) + `glovek_ENV.md` + `schema.sql` + 파일 인벤토리)
- **개별 CSV**: `GET /api/admin/export?type=` — `members · consults · inquiries · payments · shopstats · onboarding · onboarding-products · referrers`
  - 특히 **`referrers`** = 추천인코드 ↔ 영업담당 매핑(정본 4장 항목).

---

## 5. 발급/전달 필요값 (env)

```
# glovek Vercel — 이벤트 송신용
ADMIN_INGEST_URL     = https://tiktokadmin.vercel.app     # 정본 URL (하드코딩 안 함)
ADMIN_INGEST_SECRET  = <어드민과 공유 시크릿>              # 미설정 시 INGEST_SECRET로 폴백
FILE_API_TOKEN       = <파일 API 전용 토큰(긴 랜덤)>       # 어드민에 전달

# glovek → 어드민에 전달(운영 작업 D)
GLOVEK_DB_URL_RO     = postgres://glovek_ro:****@<host>/<db>?sslmode=require   # 읽기전용 롤
```
읽기전용 롤 생성 예시(Neon SQL Editor):
```sql
CREATE ROLE glovek_ro WITH LOGIN PASSWORD '<랜덤>';
GRANT CONNECT ON DATABASE <db> TO glovek_ro;
GRANT USAGE ON SCHEMA public TO glovek_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO glovek_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO glovek_ro;
```

---

## 6. 수신 테스트 (어드민에서 실행)

```bash
# lead
curl -X POST "$ADMIN_INGEST_URL/api/ingest/lead" \
 -H "X-Ingest-Secret: $INGEST_SECRET" -H "X-Idempotency-Key: consult:1" -H "Content-Type: application/json" \
 -d '{"site":"glovek","occurred_at":"2026-08-02T02:00:00Z","email":"a@b.com","phone":"01000000000","brand_name":"테스트","contact_name":"홍길동","source":"glovek_consult","message":"문의","source_ref":"1"}'
# → 200 {"ok":true,"created":true}  · 같은 키 재전송 → 200 {"ok":true,"dedup":true}

# payment
curl -X POST "$ADMIN_INGEST_URL/api/ingest/payment" \
 -H "X-Ingest-Secret: $INGEST_SECRET" -H "X-Idempotency-Key: pay:TID123" -H "Content-Type: application/json" \
 -d '{"site":"glovek","occurred_at":"2026-08-02T02:05:00Z","email":"a@b.com","pay_kind":"subscribe_first","plan":"live_focus_490k","amount":490000,"pg_ref":"TID123","glovek_user_id":"u1"}'

# 파일 API (FILE_API_TOKEN 설정 후)
curl "https://glovek.space/api/partner/files?email=a@b.com" -H "X-File-Token: $FILE_API_TOKEN"
```

**실제 유입 확인**: glovek `/consult`에서 폼 1건 제출 → 어드민 수신 로그 확인. 실패 시 glovek Vercel 함수 로그에 `[ingest] 거부`(400/401/404) 또는 `[ingest] 실패`(네트워크)로 원인이 남습니다.

---

## 7. 기존 시스템 무충돌 (정본 규칙 준수) ✅
- 어드민은 glovek DB에 **쓰지 않음** — 읽기전용 롤 + 이벤트 수신만. glovek 스키마 변경 없이 연동.
- 상태·게이트·정산 판정은 **사이트가 계산/전송 안 함** — 이벤트(event)만 통보.
- 카드번호·비밀번호 등 **민감정보 미전송** — 요약 + 파일 URL(토큰 인증)만.

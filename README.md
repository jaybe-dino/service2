# K-Trend Analytics (v6.0)

글로벌 틱톡(TikTok) K-뷰티 콘텐츠 조회·분석 전문 B2B SaaS.
실제 K-뷰티 브랜드의 틱톡 영상을 **브랜드 · 콘텐츠 · 인플루언서별**로 분석합니다.

> **동적 서버 앱** (Next.js App Router + API Routes + Postgres). 배포: **Vercel**.

## 주요 화면

| 경로 | 설명 |
| --- | --- |
| `/` | 랜딩 |
| `/explorer` | 콘텐츠 탐색기 (브랜드/카테고리/티어/Shop·#ad 필터, 열람권) |
| `/influencers` | 인플루언서 DB |
| `/reports` | 브랜드 성장 리포트 |
| `/viral` | 실시간 바이럴 감지 |
| `/plans` | 요금제 |
| `/login` · `/signup` | 로그인 / 회원가입(브랜드 정보 필수) |

## 유료화 모델
- 콘텐츠 성과 지표는 **전체 공개**.
- **열람권(하루 5건)** — 콘텐츠 링크 열람 + 계정 이름 공개 공통 차감. 비로그인은 로그인 유도.
- **회원가입 후 동료 3명 초대(같은 브랜드 이메일 도메인) → Pro 7일** 자동 개방.
- Pro/Enterprise: 무제한.

## 서버 / API
- 인증: bcrypt 비밀번호 + jose JWT httpOnly 세션 쿠키.
- DB: `@vercel/postgres` (Vercel Postgres / Neon / Supabase). 스키마 자동 생성.
- API 라우트: `/api/auth/{signup,login,logout,me}`, `/api/invite`, `/api/bookmarks`, `/api/admin/members`, `/api/inquiry`.
- DB 미설정 시: 클라이언트 **데모 모드**(localStorage)로 폴백되어 UI는 그대로 동작.

## Vercel 배포 (3단계)
1. **Import**: Vercel에서 이 GitHub 레포를 Import (프레임워크 자동 인식: Next.js).
2. **Postgres 연결**: Vercel 프로젝트 → Storage → Create **Postgres** (또는 Neon/Supabase). `POSTGRES_URL`이 자동 주입됩니다.
3. **환경변수**: `.env.example` 참고하여 설정
   - `SESSION_SECRET` (긴 무작위 문자열, 필수)
   - `ADMIN_EMAILS` (관리자 이메일, 쉼표 구분)
   - (선택) `RESEND_API_KEY`/`EMAIL_FROM` 이메일 발송, `STRIPE_*` 결제

배포 후 첫 요청 시 테이블이 자동 생성됩니다.

## 로컬 개발
```bash
npm install
cp .env.example .env.local   # POSTGRES_URL, SESSION_SECRET 입력
npm run dev                  # http://localhost:3000
npm run build && npm start   # 프로덕션
```
POSTGRES_URL 없이도 `npm run dev`로 데모 모드 UI 확인 가능.

## 데이터 출처
- 브랜드/영상/인플루언서: `brands_1to100_MASTER.xlsx` 실데이터 (`src/data/ktrend/`, `public/data/videos.json`).
- 수수료율·ROAS·매출은 조회·참여·Shop 기반 **추정치(AI 예측, "추정" 라벨)**.

## 기술 스택
Next.js 15 (App Router, 동적) · React 19 · TypeScript · Tailwind v4 · @vercel/postgres · bcryptjs · jose · lucide-react

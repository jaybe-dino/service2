# 인플루언서 리스팅 · 아웃리치 고도화 — 기획 · 방향 · 개발사항

> 목적: "발견 → 판단 → 컨택 → 성사"를 한 흐름으로 묶는 **크리에이터 아웃리치 엔진**으로 고도화.
> 기준: 실제 코드(현행) 위에서 증분 확장. 파일 경로 병기.

---

## 1. 현재 상태 (As-Is)

| 영역 | 현행 | 한계 |
|---|---|---|
| 리스팅(실데이터) | `/creators`·`/api/creators` — handle·영상수·총조회수·평균조회·협업브랜드·**유도 GMV**(product_ref 매칭)·태그제품수 | 필터가 정렬(induced/views/videos)+검색뿐. 팔로워·티어·카테고리·국가·참여율·최근활동·성장세 필터 없음 |
| 프로필 | `/creator/[handle]` — 영상 리스팅·태그 제품(유도 GMV) | 연락 수단·단가·적합도·협업 성향 등 **아웃리치 판단 정보** 없음 |
| 정적 리스팅 | `/influencers`·`/influencer/[handle]`(Pro 게이트) + `INFLUENCER_MAP`·`contactFor`(가짜 이메일) | 실데이터와 이원화, 연락처가 더미 |
| 아웃리치 | InquiryModal(kind=proposal) → `inquiries` 저장 → 마이페이지 조회·어드민 수동답변 (`/api/proposals`) | 실제 컨택(이메일/DM) 없음, 시퀀스·상태 파이프라인·담당배정·템플릿·성과추적 없음 |
| 자산 | 북마크(`bookmarks`), 블락리스트 | 리스트/세그먼트 저장·태그·CSV 임포트 없음 |

**강점**: 이미 실제 크롤링 데이터로 크리에이터·성과·제품 연결(유도 GMV)이 있음 → **발굴 엔진의 원천 데이터는 확보**됨.

---

## 2. 고도화 방향 (To-Be) — 4개 기둥

### ① Discovery — 다차원 발굴/필터
정렬만 있는 리스팅을 **필터 + 세그먼트 + 추천**으로. 크롤링 데이터에서 파생 가능한 축을 전부 필터화.
- 필터: **티어**(팔로워/평균조회 기반 mega·macro·micro) · **카테고리**(협업 브랜드·태그 제품 자동분류) · **국가** · **참여율대** · **최근 활동**(최근 N일 업로드) · **성장세**(video_snapshots 증분) · **제품태그 경험**(product_ref 有) · **광고/샵 콘텐츠 비율** · **협업 브랜드**
- **세그먼트 저장**: 필터 조합을 리스트로 저장 → 반복 캠페인 재사용
- **추천(매칭)**: 특정 제품/브랜드 입력 → 적합도 순 자동 추천

### ② Profile & Fit — 아웃리치 판단 정보
크리에이터 상세에 "지금 컨택할까?"를 판단할 정보 집약.
- **적합도 스코어**(0~100) = 카테고리 fit × 성과(조회·참여) × 제품태그 이력 × 최근 활동 × (예산 대비) 추정 단가
- **협업 성향**: 광고/샵 비율, 태그 제품 GMV, 반복 협업 브랜드
- **연락 수단**(합법 확보분): 공개 비즈니스 이메일·링크(있을 때만) — 없으면 "플랫폼 DM/폼" 경로
- **추정 단가**: 평균 조회 × 업종 CPM 계수(추정, 라벨 명시)

### ③ Outreach Pipeline — CRM화 (제안 저장 → 파이프라인)
"제안 1건"을 **리드 상태 파이프라인**으로.
- 상태: `발굴 → 컨택 → 회신 → 협의 → 계약 → 진행 → 완료 / 보류·거절`
- **담당자 배정**(어드민/파트너), 코멘트·활동 로그(타임라인)
- **템플릿**: 아웃리치 메시지 템플릿(변수 치환: 이름·제품·성과)
- **멀티 채널 기록**: 이메일/DM/폼 — 발송·회신을 스레드로

### ④ Campaign & Automation — 대량·자동화
- **캠페인**: 세그먼트(리스트) → 대상 일괄 등록 → 템플릿으로 발송
- **시퀀스**: 미회신 시 N일 후 자동 후속(리마인더) — 상태 기반
- **성과 추적**: 발송·오픈·회신·성사율, 캠페인별 퍼널·CPA
- **발송 채널**: 이메일(Resend/SES 등) — 도달성·수신거부(unsubscribe) 관리

---

## 3. 데이터 모델 추가 (신규 테이블)

> 기존 `creators`·`videos`·`inquiries`·`bookmarks` 위에 아웃리치 레이어 추가. 전부 `ensureSchema()` 증분.

- **creator_profiles**(handle PK) — enrich: tier, category, country, engagement_rate, last_active, growth_30d, est_rate_usd, fit_cache jsonb, updated_at
- **creator_contacts**(handle, channel[email|dm|form|link], value, verified, source, created_at) — 합법 확보분만
- **outreach_lists**(id, name, owner, filter jsonb, created_at) — 세그먼트 저장
- **outreach_targets**(id, list_id, handle, status, owner, score, added_at) — 리스트 대상 + 상태
- **outreach_threads**(id, target_id, channel, subject) / **outreach_messages**(id, thread_id, direction[out|in], body, sent_at, opened_at, replied_at) — 스레드/메시지
- **outreach_templates**(id, name, channel, subject, body, vars) — 템플릿
- **outreach_activity**(id, target_id, actor, kind, note, created_at) — 활동 로그
- **campaigns**(id, name, list_id, template_id, status, stats jsonb) / **campaign_sends**(campaign_id, target_id, status, sent_at)

---

## 4. 개발 로드맵 (Phase)

### P0 — 발굴/판단 강화 (프론트+DB 파생, 외부 의존 0) · 이번 스프린트
1. **리스팅 필터 고도화** — `/creators`·`/api/creators`에 tier·category·country·최근활동·참여율·제품태그·성장세 필터 추가 (videos/snapshots에서 파생) · UI 필터 바
2. **적합도 스코어 v1** — `/api/creators`에 `fitScore`(카테고리 fit×성과×태그이력×최근활동) 계산·정렬 옵션
3. **크리에이터 상세 강화** — `/creator/[handle]`에 적합도·협업성향(광고/샵비율)·추정단가·협업브랜드·연락경로 섹션
4. **세그먼트 저장** — `outreach_lists`(필터 저장) + "이 조건 저장/불러오기"

### P1 — 아웃리치 파이프라인(CRM)
5. **파이프라인 보드** — 어드민 "아웃리치" 탭: 대상 상태(발굴→…→완료) 칸반/테이블, 담당배정, 활동로그
6. **대상 등록** — 리스팅/추천에서 "아웃리치 추가" → `outreach_targets` (기존 제안 inquiries도 마이그레이션)
7. **템플릿 + 스레드 기록** — 메시지 템플릿(변수), 발송/회신 수기 기록(스레드)
8. **회원(브랜드) 셀프 아웃리치** — 마이페이지에서 리스트·대상 관리(현 proposals 확장)

### P2 — 캠페인·자동화·발송
9. **이메일 발송 연동** — Resend/SES: 실제 발송, 오픈/회신 추적(픽셀·회신 웹훅), unsubscribe
10. **캠페인** — 세그먼트→대상 일괄→템플릿 발송, 캠페인 퍼널/성과
11. **시퀀스** — 미회신 N일 후 자동 후속(cron 기반)
12. **매칭 추천 고도화** — 제품/브랜드 입력 → 적합 크리에이터 추천 + 예상 성과(유도 GMV 기반)

---

## 5. 적합도 스코어 로직 (v1 개요)
```
fit = w1·category_match      // 대상 카테고리 ↔ 크리에이터 협업/태그 카테고리 일치
    + w2·performance         // 평균조회·참여율 정규화
    + w3·product_tag_history // product_ref 태그 경험(유도 GMV) 有 가중
    + w4·recency             // 최근 활동(최근 업로드 근접)
    + w5·budget_fit          // 추정단가 ↔ 예산 근접(입력 시)
// 0~100 정규화, 근거(왜 높은지) 3줄 함께 노출
```
근거를 함께 노출해 "설명가능한 추천"으로 → 신뢰·전환↑.

---

## 6. 핵심 지표 (KPI)
- 발굴수 · **컨택수** · **회신율** · 협의→성사율 · 캠페인 CPA
- 크리에이터 유도 GMV(협업 후 실제 성과와 연결 — 우리 강점 데이터)
- 세그먼트/캠페인별 퍼널

---

## 7. 리스크 · 의존성
- **연락처 합법성**: 공개된 비즈니스 이메일/링크만 저장·사용. 스크랩 개인정보 무단 발송 금지 → **공개 정보 + 동의 경로** 원칙, unsubscribe 필수
- **이메일 도달성**: 전용 발신 도메인·SPF/DKIM, 스팸 회피(발송량 조절)
- **외부 의존**: P2의 이메일 발송(Resend/SES 등) 계정·도메인 인증 필요
- **DM 자동화**: TikTok DM API는 공식 제한 — 초기엔 이메일/폼 중심, DM은 수기 기록

---

## 8. 즉시 실행(MVP) 제안 — P0 4개
① 리스팅 다차원 필터 · ② 적합도 스코어 v1(+근거) · ③ 상세 아웃리치 정보 섹션 · ④ 세그먼트 저장.
→ 외부 연동 없이 **지금 데이터만으로** "발굴·판단"이 크게 좋아짐. P1(파이프라인)·P2(발송)는 이후 스프린트.

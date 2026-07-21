# Glovek 데이터 고도화 기획서 — 브랜드 → 샵 → 제품 세분화 (kalodata 벤치마크)

> 목적: 현재 "브랜드·영상·인플루언서" 중심의 분석을 **제품(Product)·샵(Shop)·카테고리**까지
> 세분화하여, kalodata 수준의 TikTok Shop 인텔리전스를 K-뷰티·동남아 특화로 제공한다.
> 단, kalodata와 달리 **발견 → 리메이크 → 온보딩**으로 이어지는 퍼널의 입력으로 쓴다.
>
> 상태: 기획(개발 전) · 작성 기준 코드: `src/data/ktrend/*`, `src/lib/db.ts`

---

## 0. 요약 (TL;DR)

- **핵심 진단:** `products` 테이블·`est_gmv`(price×sold)·`brand_shop_stats`가 **이미 존재하는데 UI로 노출되지 않는다.** → P0는 신규 크롤링이 아니라 **있는 데이터를 제품/샵 단위로 드러내는 것**.
- **방향:** Product·Shop을 브랜드·인플루언서와 동급 **1급 엔티티로 승격**, `브랜드 → 샵 → 제품 → 영상/크리에이터` 드릴다운 구조. 카테고리는 이를 가로지르는 랭킹 축.
- **차별점:** kalodata는 "발견"에서 끝. Glovek은 세분화 데이터를 **Remake·온보딩 진입점**으로 연결.

---

## 1. 벤치마크 — kalodata (kalodata.com/ko)

| 항목 | 내용 |
|---|---|
| 탭 구조(7) | Explore · **Category** · **Shop** · **Creator** · **Product** · **Video** · **Livestream** |
| 핵심 지표 | GMV · 매출 · 판매량 · **성장률(%)** · 객단가(avg unit price) · 커미션 · 전환/CTR |
| 필터 | 카테고리 · 국가 · 기간 · 매출 · **셀러 타입** · 니치 · 가격대 |
| 데이터 스코프 | 크리에이터 2억+ · 영상 4억+ · 히스토리 최대 1,000일 · 15분 갱신 |
| 한계(중요) | GMV·광고비는 **AI 추정치**(자체 면책). 실제 수수료·이익은 추적 안 함 |

> **시사점:** kalodata조차 GMV는 추정치다. Glovek은 제품 `price × sold_count` **실데이터**를 보유하므로 "실측 GMV"를 신뢰도 강점으로 내세울 수 있다.

---

## 2. As-Is — 현재 Glovek 데이터 모델

### 2.1 엔티티 (현재)
| 엔티티 | 상태 | 위치 |
|---|---|---|
| 브랜드 | 1급 | `brands.ts`, DB `videos.brand_name`·`brand_stats`·`brand_shop_stats` |
| 영상/콘텐츠 | 1급 | `content.ts`, DB `videos` |
| 인플루언서 | 1급 | `influencers.ts`, DB `creators` |
| **제품(SKU)** | **DB만 존재, UI 없음** | DB `products`·`brand_shop_stats` (브랜드 집계로만 노출) |
| **샵/셀러** | **엔티티 없음** (불리언) | `videos.is_shop`, `Brand.shopCount/shopRatio` |
| 라이브스트림 | 없음 | — |
| 카테고리 | static (DB 아님) | `meta.ts` 3대 + 9소분류 |
| 광고(Ad) | 불리언만 | `videos.is_ad` |

### 2.2 카테고리 (현재)
- **대분류(3):** 스킨케어 💧 / 메이크업 💄 / 헤어케어 💇
- **소분류(9):** 더마·진정, 스킨케어, 선케어, 클렌징, 마스크·팩, 메이크업, 립, 헤어케어, 바디케어
- 별도 브랜드 4-facet(`brand-attrs.ts`): productCat / scale / positioning / bundle

### 2.3 주요 DB 테이블 (현재)
- `videos(video_id, brand_name, handle, views, likes, comments, shares, is_ad, is_shop, posted_at, url, country, tier)` — **product_id·shop_id 없음**
- `products(product_id, brand_name, title, price, currency, sold_count, commission_rate, url)` — **shop_id·category 없음**
- `brand_shop_stats(brand_name, products, avg_commission, total_sold, est_gmv)` — **est_gmv/sold는 계산되나 UI 미사용**
- `brand_stats`, `creators`, `brand_tracking`, `collect_jobs(region)` 등

### 2.4 지표 (현재)
- 영상별 매출/ROAS/CPM = **합성 추정치**(해시 기반, 실측 아님). GMV 실데이터는 **제품 레벨(price×sold)에만** 존재하나 노출 안 됨.

### 2.5 화면 (현재)
- `/explorer`(영상 그리드) · `/influencers`·`/influencer/[handle]` · `/brand/[id]` · `/reports` · `/viral` · `/saved`
- **제품 페이지·샵 페이지 없음.** 커머스 최하위 뷰 = 브랜드 상세.

---

## 3. Gap 분석 (현재 vs kalodata vs 목표)

| 축 | 현재 Glovek | kalodata | 목표(To-Be) |
|---|---|---|---|
| 제품 | DB만, 미노출 | 제품 랭킹·상세 | **제품 1급 + 랭킹/상세, 실 GMV 노출** |
| 샵 | 불리언 | 샵 랭킹·top제품·객단가 | **샵 엔티티 + 랭킹/상세** |
| 카테고리 | static 3+9 | 세분류 + 랭킹/트렌드/가격대 | **DB화 + 세분류 + 카테고리 허브** |
| 지표 | 영상 합성추정 | GMV·성장률·객단가(추정) | **제품 실 GMV + 성장률 + 객단가** |
| 드릴다운 | 브랜드까지 | 제품/샵까지 | **브랜드→샵→제품→영상/크리에이터** |
| 라이브/광고 | 없음 | Livestream 탭 | 후순위(P2) |

---

## 4. To-Be — 타깃 정보 구조

```
Category (허브·랭킹 축)
   └── Brand ──── Shop(Seller) ──── Product(SKU)
                                       ├── 관련 Video ──── Creator
                                       └── [CTA] 이 상품형 광고 Remake → 온보딩
```
- **드릴다운:** 어디서 시작하든 서로 연결(브랜드→샵→제품→영상→크리에이터, 역방향도).
- **카테고리:** 모든 엔티티를 필터·랭킹하는 가로축(가격대 포함).

---

## 5. 기존과의 차이점 / 추가사항 (⭐핵심)

### 5.1 데이터 모델 변경 (Delta)

**신규 테이블**
- `shops(shop_id PK, name, seller_type[official|flagship|affiliate|marketplace], brand_name?, country, followers, product_count, updated_at)`
- `product_stats(product_id PK, gmv, sold, avg_price, commission, growth_7d, growth_30d, video_count, creator_count, updated_at)`
- `shop_stats(shop_id PK, gmv, top_products jsonb, avg_price, product_count, updated_at)`
- `category_stats(category_id, country, period, gmv, product_count, growth, price_bands jsonb, PRIMARY KEY(category_id,country,period))`
- `categories`, `sub_categories` (static → DB화, 확장 가능)

**기존 테이블 변경(ALTER)**
- `products` + `shop_id`, `category_id`, `sub_category_id`, `rating`, `review_count`, `first_seen`, (선택)`price_history jsonb`
- `videos` + `product_id`, `shop_id` ← **영상↔제품↔샵 링크 (현재 최대 공백)**
- `collect_jobs.kind` 에 `product`, `shop` 추가(이미 video|shop 존재 → product 추가)

### 5.2 신규 화면 (추가)
- **Product**: 제품 랭킹 테이블(성장률 컬럼) + 제품 상세(가격/판매 추이, 관련 영상·크리에이터, 소속 샵, Remake CTA)
- **Shop**: 샵 랭킹 + 샵 상세(top제품/매출/객단가/셀러타입)
- **Category 허브**: 카테고리별 랭킹·급상승·가격대 분포
- 기존 `/brand/[id]`·`/influencer/[handle]`·`/explorer`에 **상호 링크·제품 리스트** 추가

### 5.3 지표 추가
- 제품: **실 GMV(price×sold)**, 판매량, 객단가, 커미션율, **성장률 7d/30d**, 관련 영상/크리에이터 수, 가격대
- 샵: 총 GMV, top 제품, 객단가, 제품수, 셀러타입
- 카테고리: GMV/판매량/성장률, **가격대(price band) 분포**, top 브랜드·제품
- 공통: **실측 vs 추정 신뢰도 라벨** 통일 (제품=실측, 영상 매출=추정 명시)

### 5.4 카테고리 세분화안 (현재 3+9 → 제안)
- **스킨케어**: 토너·스킨 / 에센스·세럼·앰플 / 크림·모이스처라이저 / 클렌징(폼·오일·워터) / 마스크·팩 / 선케어 / 스팟·트러블 / 아이케어 / 미스트
- **메이크업**: 베이스(쿠션·파운데이션·프라이머) / 립(틴트·립스틱·밤) / 아이(섀도·라이너·마스카라) / 치크·컨투어 / 브로우
- **헤어케어**: 샴푸·트리트먼트 / 헤어에센스·오일 / 스타일링 / 두피케어
- **(신규 대분류) 바디·퍼스널케어**: 바디워시·로션 / 핸드·풋 / 향(퍼퓸) / 데오
- **(선택) 이너뷰티**: 콜라겐 / 유산균 / 기타 건기식
- + **가격대 밴드**(예: ~$10 / $10–25 / $25–50 / $50+)

### 5.5 수집 파이프라인 추가
- TikTok Shop **제품 리스트 크롤링**(price/sold/commission/rating) — 국가별 프록시 유지
- **샵(셀러) 단위** 수집(top 제품·추정매출·객단가·셀러타입)
- **영상↔제품 매핑**(영상 태그 상품 링크 파싱)
- 스케줄·국가별 잡 분리(데이터량 증가 대비)

### 5.6 권한/멤버십 연계
- Product·Shop·Category 뷰를 **플랜별 게이팅**(기존 `users.markets` 국가 게이팅과 통합) — "기본 이용권에 적용" 방향과 일치

---

## 6. 단계별 로드맵

| 단계 | 산출물 | 기존 자산 재활용 | 신규 필요 |
|---|---|---|---|
| **P0 (퀵윈)** | 제품 랭킹/상세 페이지, `est_gmv`·`sold` 노출, 브랜드 상세에 제품 리스트, 카테고리 세분화(static 확장) | `products`·`est_gmv`·`brand_shop_stats` **이미 있음** | 화면(UI)만 |
| **P1** | Shop 엔티티·샵 랭킹/상세, 영상↔제품 링크, 성장률 지표, `category_stats` | 수집 파이프라인 확장 | `shops`·`*_stats` 테이블, 크롤러 |
| **P2** | Livestream, 가격추이, 광고(Ad) 분석, **Remake·온보딩 CTA 연계** | Remake/온보딩 기존 기능 | 라이브 수집, 연계 로직 |

---

## 7. Glovek 차별화 (kalodata에 없는 것)

> kalodata는 리서치(발견)에서 끝난다. Glovek은 세분화 데이터를 **퍼널 입력**으로 쓴다.

- 제품 상세 → **"이런 상품 광고 리메이크"** CTA → Remake Studio
- 카테고리 급상승 제품 → **온보딩 트랙 추천**
- **실측 GMV**(price×sold) 신뢰도 강점 (kalodata는 추정)
- 세분화 = 목적이 아니라 **발견→생성→온보딩**의 진입점

---

## 8. 리스크 / 오픈 이슈
- 제품/샵 크롤링 데이터량 급증 → 수집 스케줄·국가별 잡 분리 필요
- 저작권/ToS: 제품 정보 스크랩 정책 확인
- 추정 vs 실측 혼재 → 신뢰도 라벨 UX 통일 필요
- 카테고리 재분류 시 기존 `brand-attrs.ts` 4-facet과 정합성 정리

## 9. 열린 결정사항 (개발 착수 전 확정)
1. **P0 범위**: 제품 페이지만 먼저 vs 제품+카테고리 세분화 동시
2. **카테고리 세분화 최종안** 확정 (§5.4 기준)
3. **샵(셀러) 정의**: 브랜드 공식샵만 vs 어필리에이트/마켓플레이스 셀러 포함
4. **게이팅 정책**: 어떤 플랜에 Product/Shop/Category 노출

---

_출처: [Kalodata 공식](https://www.kalodata.com/) · [7탭·필터(Tabcut)](https://www.tabcut.com/blog/post/kalodata-how-to-use-kalodata-for-tiktok-shop-analytics) · [데이터 스코프 리뷰](https://winninghunter.com/insights/kalodata-review/) · [한계(추정치) 리뷰](https://emplicit.co/top-tools-tiktok-shops-data-visualization/)_

# kalodata형 데이터 모델 — 브랜드·제품·영상·크리에이터 연결 구조

> 목적: "제품 상세에서 그 제품을 홍보한 크리에이터의 영상·유도 GMV를 보여주기"(kalodata product/detail형)를
> 구현하기 위한 **4개 핵심 테이블 + 연결(조인) 구조**. 다른 AI/개발자 인수인계용.

---

## 1. 연결 구조 한눈에 (ERD)

```
 ┌────────────┐        brand_name(텍스트)        ┌────────────┐
 │  BRAND     │──────────────────────────────────│  PRODUCTS  │
 │ (brand_    │                                   │  key:      │
 │  stats)    │──────────────┐                    │ product_id │
 └────────────┘              │brand_name          │ ="US:1729" │
        │brand_name          │                    └─────┬──────┘
        │                    ▼                          │ raw_id = split(product_id,":")[1]
        │              ┌───────────┐                     │  = "1729..."
        └─────────────>│  VIDEOS   │<────────────────────┘
                       │  key:     │  videos.product_ref == raw_id   ← ★핵심 링크★
                       │ video_id  │
                       └─────┬─────┘
                             │ handle
                             ▼
                       ┌───────────┐
                       │ CREATORS  │  key: handle
                       └───────────┘
```

**핵심 링크 = `videos.product_ref == split_part(products.product_id, ':', 2)`**
→ "이 제품을 태그한 영상" → 그 영상의 `handle` → 크리에이터. 이게 kalodata 매핑의 전부.

---

## 2. 테이블 구조 (핵심 4개)

### ① BRAND (brand_stats / 정적 마스터)
| 컬럼 | 의미 | key |
|---|---|---|
| brand_name | 브랜드명 | **PK(텍스트)** |
| videos, influencers, total_views, avg_views, shop_count | 영상 집계 | |
| (brand_shop_stats) products, avg_commission, total_sold, est_gmv | 샵 집계 | |
- 연결: 텍스트 `brand_name` 으로 products·videos와 매칭(대소문자 무관 권장).

### ② PRODUCTS (제품)
| 컬럼 | 의미 | key |
|---|---|---|
| **product_id** | `"국가:틱톡상품ID"` (예: US:1729…) | **PK** |
| brand_name | 소속 브랜드 | → BRAND |
| title, price, currency, sold_count, commission_rate, image_url, url | 상품 정보 | |
| country | 수집 국가 | |
- **raw_id** = `split_part(product_id,':',2)` = 순수 틱톡 상품ID → VIDEOS 연결키.
- 추정 GMV = price × sold_count.

### ③ VIDEOS (영상) — 연결의 중심
| 컬럼 | 의미 | key |
|---|---|---|
| **video_id** | 틱톡 영상ID | **PK** |
| **product_ref** | 영상이 태그한 상품ID(raw) | → PRODUCTS.raw_id ★ |
| **handle** | 크리에이터 | → CREATORS ★ |
| brand_name | 브랜드 | → BRAND |
| views, likes, comments, shares, is_ad, is_shop | 지표 | |
| posted_at, url, country, cover_url | 메타·썸네일 | |
- **product_ref 가 채워져야 제품↔크리에이터 매핑이 됨**(영상 수집 시 앵커 URL에서 추출).

### ④ CREATORS (크리에이터)
| 컬럼 | 의미 | key |
|---|---|---|
| **handle** | 틱톡 유저명 | **PK** |
| videos, total_views, avg_views, brands | 집계(videos에서 파생) | |
| bio, email, followers, verified, region | 프로필 | |

### 보조: 추이(스냅샷)
- **product_snapshots** (product_id, snap_date, sold_count, price, est_gmv) → 판매·GMV·가격 추이 차트.
- **video_snapshots** (video_id, snap_date, views) → 영상 급상승.

---

## 3. kalodata 제품 상세 — 화면별 조인

### (A) 이 제품을 홍보한 "연결 크리에이터 랭킹" (+유도 GMV)
```sql
-- product_id 하나 → 그 제품 태그 영상 → 크리에이터별 집계
WITH tagged AS (
  SELECT v.handle, count(*) AS videos, sum(v.views) AS views,
         bool_or(v.product_ref = :raw) AS direct
  FROM videos v
  WHERE v.product_ref = :raw AND v.handle <> ''
  GROUP BY v.handle
), tot AS (SELECT sum(views) tv FROM tagged)
SELECT t.handle, t.videos, t.views, t.direct,
       round(:product_gmv * t.views::numeric / NULLIF(tot.tv,0)) AS induced_gmv
FROM tagged t, tot
ORDER BY induced_gmv DESC;   -- 크리에이터 유도 GMV 순
```
- **유도 GMV** = 제품 GMV × (그 크리에이터 조회수 / 전체 태그 조회수). 추정.

### (B) 이 제품의 "영상 랭킹" (콘텐츠 레퍼런스)
```sql
SELECT video_id, handle, views, likes, url, cover_url, is_ad, is_shop, posted_at,
       (product_ref = :raw) AS direct
FROM videos WHERE product_ref = :raw
ORDER BY views DESC;   -- 조회수/참여율/최신 정렬
```

### (C) 제품 추이 / 가격 이력
```sql
SELECT snap_date, sold_count, est_gmv, price
FROM product_snapshots WHERE product_id = :product_id
ORDER BY snap_date;   -- 일별 이중축 차트 + 가격 이력
```

### (D) 브랜드 폴백 (직접 태그 없을 때)
```sql
-- product_ref 매칭 0건이면 같은 브랜드 영상으로 폴백
SELECT * FROM videos WHERE lower(brand_name)=lower(:brand) ORDER BY views DESC;
```

> 현재 `/api/products/[id]` 가 A·B·C·D를 이미 계산해 `/product/[id]` 화면에 그림.

---

## 4. 반대 방향 — 크리에이터 상세
- 크리에이터가 태그한 제품: `videos(handle=:h).product_ref` → products(raw 매칭) → 태그 제품·유도 GMV.
- 크리에이터 영상 리스팅: `videos WHERE handle=:h ORDER BY views`.

---

## 5. kalodata 완전 대응에 "추가하면 좋은" 것

| 추가 | 필드 | 효과 |
|---|---|---|
| **product_creators**(매칭 캐시 테이블) | product_id, handle, videos, views, induced_gmv, direct | 3-(A) 조인을 미리 계산·저장 → 조회 즉시(대량에서 빠름) |
| **product_reviews** | product_id, rating, review_count, samples(jsonb) | kalodata 별점·리뷰수 (샵 actor가 주면) |
| products.category 저장 | category, rating, stock | 카테고리 순위·리뷰 가속 |

> 지금은 3의 조인을 **읽기 시 계산**. 데이터가 커지면 product_creators 로 **materialize** 권장.

---

## 6. 매핑 품질의 핵심 = `product_ref`
- 이 값이 잘 채워질수록 제품↔크리에이터 매핑 정확도↑.
- 영상 수집기(`extractProductRef`)가 앵커 URL의 상품ID를 뽑음. 국가 프리픽스 없는 **raw id**.
- product_id는 `"국가:raw"` 이므로 조인 시 **split_part(product_id,':',2)** 로 raw 맞춰 비교.

---

## 부록: 익스포트 (분리된 파일)
| 데이터 | key | URL |
|---|---|---|
| 브랜드 | brand_name | /api/admin/brands/export |
| 제품 | product_id | /api/admin/products/export |
| 크리에이터 | handle | /api/admin/creators/export |
| 제품↔크리에이터 매칭 | (product_id, handle) | /api/admin/product-creators/export |

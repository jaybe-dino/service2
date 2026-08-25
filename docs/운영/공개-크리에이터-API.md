# 공개 크리에이터 API — 카테고리·국가·규모 소팅 + 콘텐츠 레퍼런스(썸네일)

외부 시스템이 토큰으로 호출해 **크리에이터 목록(카테고리·국가·규모별 소팅/필터)** 과
각 크리에이터의 **콘텐츠 레퍼런스(영상 썸네일)** 를 받아 화면에 렌더링하기 위한 API.

- 데이터 원천: `videos` 집계(썸네일 `cover_url`, `country`, `tier`, `views`) + `BRANDS`(브랜드→카테고리)
- 인증: 서버 env **`PUBLIC_API_TOKEN`**(없으면 `CREATORS_EXPORT_TOKEN` 재사용)

## Endpoint
```
GET https://glovek.space/api/public/creators
```
CORS 허용(모든 오리진), 메서드 GET/OPTIONS.

### 인증 (둘 중 하나)
- 쿼리: `?token=<PUBLIC_API_TOKEN>`
- 헤더: `Authorization: Bearer <PUBLIC_API_TOKEN>`

### 쿼리 파라미터
| 파라미터 | 값 | 설명 |
|---|---|---|
| `category` | `skincare,makeup,haircare` (콤마 복수) | 카테고리 필터(브랜드 이력 기반) |
| `country` | `US,TH,VN,MY,SG` (콤마 복수) | 활동 국가 필터 |
| `scale`(=`tier`) | `mega,macro,micro` (콤마 복수) | 크리에이터 규모 필터 |
| `minViews` | 정수 | 영상 최소 조회수 |
| `sort` | `views`\|`avg_views`\|`videos`\|`recent` | 정렬 기준(기본 `views`) |
| `order` | `desc`\|`asc` | 정렬 방향(기본 `desc`) |
| `limit` | 1~100 | 페이지 크기(기본 20) |
| `offset` | 정수 | 페이지 오프셋 |
| `withContent` | `1`\|`0` | 썸네일 포함 여부(기본 1) |
| `contentLimit` | 1~10 | 크리에이터당 썸네일 수(기본 3) |

### 예시
```
GET /api/public/creators?token=XXX&category=skincare,makeup&country=US&scale=micro&sort=views&limit=20&withContent=1&contentLimit=4
```

### 응답 (JSON)
```json
{
  "total": 1234,
  "count": 20,
  "limit": 20,
  "offset": 0,
  "sort": "views",
  "order": "desc",
  "creators": [
    {
      "handle": "seoul.skin",
      "profile_url": "https://www.tiktok.com/@seoul.skin",
      "tier": "micro",
      "countries": ["US"],
      "categories": ["skincare"],
      "brands": ["Laka", "Beauty of Joseon"],
      "metrics": { "videos": 12, "total_views": 4200000, "avg_views": 350000, "top_views": 2100000 },
      "content": [
        { "video_id": "72...", "thumbnail": "https://.../cover.jpg", "url": "https://www.tiktok.com/@seoul.skin/video/72...", "views": 2100000, "country": "US" }
      ]
    }
  ]
}
```

에러: `{ "error": "..." }` + 상태코드(401 토큰, 503 미설정, 500 서버).

## 화면에 어떻게 띄우나 (렌더링 가이드)

### 레이아웃 권장
- **카드 그리드**: 크리에이터 = 카드 1개. 상단에 핸들·규모(tier)·국가·카테고리 뱃지, 하단에 **콘텐츠 썸네일 스트립**(9:16 세로 썸네일 가로 나열).
- 썸네일 클릭 → `content[].url`(틱톡 영상)로 새 탭.
- 핸들/프로필 클릭 → `profile_url`.
- 정렬 컨트롤(조회수/평균/영상수), 필터 칩(카테고리·국가·규모)을 상단 툴바에.
- 무한스크롤/페이지네이션은 `limit`/`offset`으로.

### 뱃지 규칙
- 규모(tier): `mega`=대형, `macro`=중형, `micro`=마이크로 — 색상 구분(예: mega=핑크, macro=스카이, micro=슬레이트).
- 국가: 국기 이모지(US 🇺🇸 / TH 🇹🇭 / VN 🇻🇳 / MY 🇲🇾 / SG 🇸🇬).
- 카테고리: 스킨케어/메이크업/헤어케어.

### 드롭인 예시 (바닐라 JS — 어디서든 삽입)
```html
<div id="glovek-creators" style="display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))"></div>
<script>
const TOKEN = "여기에_PUBLIC_API_TOKEN";
const FLAG = { US:"🇺🇸", TH:"🇹🇭", VN:"🇻🇳", MY:"🇲🇾", SG:"🇸🇬" };
const TIER = { mega:"대형", macro:"중형", micro:"마이크로" };
const fmt = n => n>=1e6 ? (n/1e6).toFixed(1)+"M" : n>=1e3 ? (n/1e3).toFixed(0)+"K" : n;

async function loadCreators(q = {}) {
  const p = new URLSearchParams({ token: TOKEN, sort:"views", limit:"20", withContent:"1", contentLimit:"3", ...q });
  const res = await fetch("https://glovek.space/api/public/creators?" + p);
  const data = await res.json();
  const root = document.getElementById("glovek-creators");
  root.innerHTML = "";
  for (const c of data.creators) {
    const el = document.createElement("div");
    el.style.cssText = "border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:#fff";
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <a href="${c.profile_url}" target="_blank" style="font-weight:800;text-decoration:none;color:#111">@${c.handle}</a>
        <span style="font-size:11px;background:#fdf2f8;color:#ec4899;border-radius:8px;padding:2px 6px">${TIER[c.tier]||c.tier}</span>
      </div>
      <div style="margin:6px 0;font-size:11px;color:#64748b">
        ${(c.countries||[]).map(x=>FLAG[x]||x).join(" ")} · ${(c.categories||[]).join(", ")||"-"} · 평균 ${fmt(c.metrics.avg_views)}뷰
      </div>
      <div style="display:flex;gap:6px;overflow-x:auto">
        ${(c.content||[]).map(v=>`
          <a href="${v.url}" target="_blank" style="flex:0 0 auto">
            <img src="${v.thumbnail}" style="width:84px;aspect-ratio:9/16;object-fit:cover;border-radius:8px" loading="lazy" />
            <div style="font-size:10px;color:#64748b;text-align:center">▶ ${fmt(v.views)}</div>
          </a>`).join("")}
      </div>`;
    root.appendChild(el);
  }
}
loadCreators();                                  // 기본
// loadCreators({ category:"skincare", country:"US", scale:"micro", sort:"avg_views" });  // 소팅/필터
</script>
```

### React 스니펫(요약)
```tsx
const { creators } = await fetch(`/api/public/creators?token=${TOKEN}&category=${cat}&country=${ctry}&scale=${scale}&sort=${sort}`).then(r=>r.json());
// creators.map(c => <Card>… c.content.map(v => <img src={v.thumbnail} … />) …</Card>)
```

## 설정 (서버)
- Vercel 환경변수 **`PUBLIC_API_TOKEN`** = 외부에 배포할 토큰(랜덤 문자열). 미설정 시 API가 503 반환.
- 썸네일(`cover_url`)은 수집 시 확보된 영상만 채워집니다. 없으면 `content`는 빈 배열.

## 주의
- 카테고리는 크리에이터가 다룬 **브랜드 이력** 기반 추정입니다(브랜드→카테고리 매핑).
- `tier`(규모)는 수집 소스의 tier가 있으면 그 값을, 없으면 평균 조회수로 근사(micro/macro/mega).
- 토큰은 외부 노출(클라이언트 코드) 시 도메인/사용량 제한을 함께 두는 것을 권장합니다.

# TikTok Shop 판매창 캡처 갤러리 (shop-viewer)

미국 TikTok Shop 상품 페이지를 **현지에서 캡처한 정적 이미지**를 모아 보여주는 빌드 불필요(buildless) 정적 갤러리입니다.
캡처 파일은 로컬(`captures/`)에 저장되므로 **한국·다른 국가에서도 VPN·원본 접속 없이** 열람할 수 있습니다.

> 실시간 프록시나 VPN 자동 적용이 아닙니다. 아래 "원본 링크"는 지역 제한으로 한국에서 열리지 않을 수 있습니다.

## 구성

- `index.html` — 화면 구조
- `styles.css` — 스타일(검정·오프화이트 + TikTok 핑크, 반응형)
- `app.js` — 렌더링·검색·필터·큰 이미지 보기(접근성 dialog)·JPG 다운로드
- `data.json` — 브랜드/캡처 메타데이터
- `captures/` — 캡처 JPG 파일 보관 폴더 (`captures/<id>-product-us.jpg`)

외부 라이브러리·빌드 도구·API 키가 전혀 필요 없습니다.

## 실행

정적 파일이라 호스팅하거나 간단한 정적 서버로 바로 볼 수 있습니다.

```bash
cd tools/shop-viewer
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080 열기
```

> `index.html`을 더블클릭(`file://`)으로 열면 일부 브라우저가 `data.json` 로드를 차단합니다.
> 그럴 때는 위처럼 정적 서버로 실행하거나 아무 정적 호스팅에 올리세요.

## 캡처 추가 방법

1. 미국 현지 접속으로 상품 페이지를 캡처합니다.
2. 이미지를 `captures/<id>-product-us.jpg` 로 저장합니다. (예: `captures/roatti-product-us.jpg`)
3. `data.json` 에서 해당 항목의 값을 갱신합니다.
   - `status` 를 `"captured"` 로 변경
   - `capturedAt` 에 캡처 시각(ISO 8601, 예: `"2026-10-18T09:30:00+09:00"`) 입력
   - 국가 표기가 다르면 `country` 조정

이미지 파일이 아직 없으면 카드와 큰 보기에서 **"준비 중 / 확인 대기"** 상태로 정직하게 표시됩니다.
**완료 캡처 카운트는 `status === "captured"` 인 항목만** 집계합니다.

## data.json 필드

| 필드 | 설명 |
| --- | --- |
| `id` | 식별자(파일명 접두사) |
| `name` | 브랜드 표기명 |
| `company` | 운영 주체(없으면 `null`) |
| `country` | 국가(`미국` / `태국`) |
| `productUrl` | 상품 원본 URL(없으면 `null`) |
| `storeUrl` | 매장 원본 URL(없으면 `null`) |
| `image` | 캡처 파일 경로(없으면 `null`) |
| `capturedAt` | 캡처 시각(ISO 8601, 미기록 시 `null`) |
| `status` | `captured`(완료) / `preparing`(준비 중) / `pending`(확인 대기) |
| `note` | 보조 메모 |

## 실시간 미국 브라우저 링크 (기본 비활성)

`data.json` 의 `meta.liveViewer` 는 기본값이 `{"enabled": false, "origin": null, "verifiedAt": null}` 이며, 이 상태에서는 링크가 보이지 않습니다.
`tools/shop-live` 를 실제로 배포하고 검증을 마친 뒤 `enabled: true`, 경로 없는 HTTPS `origin`, `verifiedAt`(ISO 시각)을 모두 넣었을 때만
미국 항목 카드에 "실시간 미국 브라우저 ↗"(새 탭)가 나타납니다. 판정은 `live-link.js` 가 합니다.

## 주의

- 가격·판매 실적·구매 가능 여부 등 검증되지 않은 수치·주장은 표기하지 않습니다.
- 캡처 이미지는 실제 확보된 파일만 사용하며, 추정 이미지나 목업은 넣지 않습니다.

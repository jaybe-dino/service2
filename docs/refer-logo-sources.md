# /refer 로고·UGC 자산 출처 (내부 기록)

> 내부 참고용. 라이브 페이지에는 노출하지 않습니다.

## 공식 로고 (요청 3종)

| 브랜드 | 파일 | 공식 출처 |
| --- | --- | --- |
| 톤28 | `public/refer/logos/toun28-official.svg` | 공식몰 https://www.toun28.com/ 헤더 로고 `https://toun28.s3.ap-northeast-2.amazonaws.com/toun/renew/main/logo_white.svg` (흰색 원본 → 밝은 타일에서는 `brightness(0)`로 단색 출력) |
| 블리블리 | `public/refer/logos/velyvely-official.png` | 공식몰 https://velyvely.com/ 헤더 `.xans-layout-logotop` 로고 `https://velyvely.com/web/upload/logo/logo_bk1.png` (검정 원본) |
| 보딩패스 | `public/refer/logos/boardingpass-official.jpg` | 원티드 회사 프로필 https://www.wanted.co.kr/company/25964 등록 로고 `https://static.wanted.co.kr/images/wdes/0_4.cf72eb3d.jpg` (160×160). ※ 회사 운영 제품 '헤임타' 로고와 구분 |
| 유한양행 | `public/refer/logos/yuhan-official.png` | 공식 https://www.yuhan.co.kr/Main/ 헤더 `/common/images/main/hover_logo.png` (176×42, 버들/나무 원형 심볼 + 검정 유한양행). CI 확인: https://www.yuhan.co.kr/Introduce/Promote/CI/ . 기존 녹색 워드마크 대체 |
| 클리오 | `public/refer/logos/clio-official.svg` (원본 `clio-official.png` 보존) | 공식 기업홈 https://cliocosmetic.com/main.html 브랜드소개 `https://cliocosmetic.com/public/images/logo/clio_main_logo.png` (1096×156). PNG 투명 여백이 커서(alpha bbox x384 y28 w328 h80) 픽셀 재작성 없이 SVG viewBox 래퍼로 보이는 영역만 크롭. 기존 워드마크 대체 |

## 공식 자산과 바이트 동일 — 교체 금지(현 자산 유지, 출처 검증 기록)

| 브랜드 | 파일 | 공식 출처(헤더 워드마크, 현 자산과 동일) |
| --- | --- | --- |
| 웰더마 | `wellderma.png` | https://www.wellderma.com/ → `/web/upload/category/editor/2024/11/22/a77c2cf430a4a1a3ca7bbe87f7d4d657.png` |
| FAU | `fau.png` | https://www.fau.co.kr/ → `https://paran1813.cafe24.com/fau/FAU%20LOGO_BL.png` |
| LICORNE(리꼼) | `licom.png` | https://www.licorne.co.kr/ → `/web/upload/category/editor/2025/07/09/fbb93b02e1abf4bae35bb3c5c9fd5978.png` |
| BUMOR(버모어) | `vermore.png` | https://www.bumor.kr/ → `https://cdn.imweb.me/thumbnail/20260601/e12fba42d26b0.png` |
| 피븐 | `peeven.png` | https://peeven.com/ 헤더 워드마크(자형 동일) |
| 앱소 | `abso.png` | https://www.abso.kr/ 헤더 워드마크(자형 동일) |
| 허브이오 | `herb-io.png` | https://herbio.co.kr/ 헤더 워드마크(자형 동일) |

## 미확보(현 자산 유지)

- **닥터노바메디** `dr-novamedi.png`: 공식 https://novamedikorea.com/ · 영어몰 https://en-drnovamedi.imweb.me/ 헤더가 "DULO x Dr.Novamedi" 텍스트이고 /Ourplan 에 제품·실내 사진뿐이라 별도 고해상 공식 로고 파일 미확보. 현 실제 로고 이미지 유지(재그림·제품사진 대체 금지).

- 자산은 사용자가 원본 바이트 그대로 저장소 git blob으로 전달 → `gh api .../git/blobs/<sha> --jq .content | base64 -d`로 수신(원본 유지).
- 기존 임시 워드마크(`toun28.png`, `blebly.png`)는 공식 자산으로 대체됨.

## 실제 UGC 캡처 (사용자 제공 원본 프레임)

| 파일 | 원본 링크 | 계정 | 메모 |
| --- | --- | --- | --- |
| `ugc-instagram-DcuiOs9ukYM.jpg` | https://www.instagram.com/reel/DcuiOs9ukYM/ | @janelle.lives | Not Just Sundays 카드게임 · 대화형 리뷰 |
| `ugc-instagram-DYS9i-WvQra.jpg` | https://www.instagram.com/reel/DYS9i-WvQra/ | @kali.patterson_ | Not Just Sundays · 친구들과 제품 사용 |
| `ugc-instagram-DbE2YD4Ox1N.jpg` | https://www.instagram.com/reel/DbE2YD4Ox1N/ | @katyj813 | Not Just Sundays · 가족 사용 |
| `ugc-drive-1.jpg` | https://drive.google.com/file/d/1DgXNSnB08iiSbtzBNgTEijTxjyc1KqMd/view | 미확인 | 헤어 콘텐츠(등교 상황), MP4 1초 프레임. 계정·브랜드 미확인 |
| `ugc-drive-2.jpg` | https://drive.google.com/file/d/17GUctiXoZRL39T9Z3pzA76JjDLpkVNvF/view | 미확인 | Based Texture Powder 제품 시연(화면상 제품명 확인), MP4 1초 프레임 |

- 원본 16건 링크 배열/값은 `src/data/refer.ts`의 `REFER_UGC`에 그대로 보존. 캡처 5건만 `thumb`/`handle`/`caption` 채움.

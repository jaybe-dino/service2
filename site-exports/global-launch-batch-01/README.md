# 글로벌 진출 배치 1기 — 정적 사이트 (내부 문서)

디노스튜디오가 운영하는 **글로벌 진출 배치 1기 / GLOBAL LAUNCH BATCH 01** 모집 랜딩. 빌드 도구·외부 의존성 없는 정적 사이트입니다.

> 이 README는 내부 기록용이며 고객용 `dist/`에는 포함되지 않습니다.

## 소스 범위
- 배포 대상은 `dist/` 폴더 전체입니다.
  - `dist/index.html`, `dist/styles.css`, `dist/app.js`
  - `dist/assets/brand/` — 디노스튜디오(glovek) 로고(기존 `public/brand/`에서 복사)
  - `dist/assets/logos/` — 협업 브랜드 로고 34종(기존 `public/refer/logos/`에서 원본 그대로 복사, 형태 보존)
  - `dist/assets/flags/` — 7개국 국기 SVG(미국·일본·태국·베트남·필리핀·말레이시아·싱가포르)
  - `dist/assets/global-launch-guide.pdf` — 검증된 4쪽 PDF 포함(10월 할인·신청 기한 반영).
- 데이터 출처: 협업 로고/분류는 `src/data/refer.ts`(REFER_LOGOS 34, REFER_TIKTOK 19)를 기준으로 `app.js`의 `BRANDS`에 반영. TikTok Shop 입점·운영 브랜드만 "TikTok Shop" 표기(모든 협업사가 TikTok 고객이 아님).

## 실행 방법 (로컬)
```bash
cd site-exports/global-launch-batch-01/dist
python3 -m http.server 8080
# http://localhost:8080
```
정적 파일이므로 임의의 정적 호스팅/Owner-private Sites에 `dist/` 그대로 올리면 동작합니다.

## 변경 파일 (이 작업에서 추가)
- `site-exports/global-launch-batch-01/README.md` (본 문서)
- `site-exports/global-launch-batch-01/dist/**` (index.html, styles.css, app.js, assets/*)
- 기존 앱/루트/`/refer`/배포 설정은 변경하지 않음.

## 제안 상품 (2026-10-25 업데이트)
- 단일 트랙 **배치 1기 참여**(유료 온보딩). ‘온보딩만 진행’ 옵션은 제거됨.
- 비용: 권역당 정가 300만원 → **10월 신청 한정 50% 할인** 150만원(부가세 별도, VAT 포함 165만원). 2권역 300/330, 3권역 450/495.
- 신청 기간: **2026년 10월 31일 23:59(KST)**까지(10월 한정). 선정 결과 **11월 2일 개별 안내**(예정). 실행 11.2–12.31.
- 선정 10개사 / 미국·일본·동남아(5국 묶음) 3권역 / 보증금 $1,500 면제 / 제품 출고 완료 참여 브랜드 전원 초기 20~100명 시딩 바우처 / 성장 가능성 선정 시 200명 또는 100명 시딩 제공.

## 기능
- 모바일 햄버거 메뉴(aria-expanded, Esc/리사이즈 닫힘, 1024px 이하)
- 희망 권역(미국/일본/동남아) 선택 → 비용 자동 계산(정가/50% 할인 공급가/VAT 포함 구분)
- 계산기 ↔ 문의 폼 권역 체크박스 양방향 동기화. 동남아 하위 국가도 메일 초안에 포함
- 로고 12개 큐레이션 + ‘전체 협업 브랜드 보기’ 펼침(34개), TikTok Shop 19 라벨
- FAQ 아코디언(native details)
- 문의 폼: 브랜드명/담당자/이메일/제품URL/희망권역/메시지 → `jaybe@dinostudio.kr` **mailto 초안** 생성(참여 방식은 ‘배치 1기 참여’ 상수, 실제 발송 자동화 없음, 선택 권역·할인 비용이 본문 반영)
- 가이드 PDF 다운로드 링크, 전화 010-4032-1029

## 디자인
- TikTok 톤: black #0a0a0a / white, cyan #25f4ee / pink #fe2c55. 작은 글씨와 버튼에는 대비를 높인 진한 핑크를 사용합니다.
- 헤더·히어로·패스·혜택·일정·리워드·가격·폼·푸터에 같은 토큰을 적용합니다. 실제 고객 로고·국기 색상은 유지합니다.
- 신청서 권역은 복수 체크박스. 동남아 선택 시 5개국 중 1개 이상 체크하며, 국가 수와 무관하게 1권역입니다. 해제 시 하위 선택·에러를 초기화하고 비활성화합니다.

## 검증 결과
- `node --check app.js` 통과, 의미 검색(온보딩 단독·구가격·구마감 잔존 없음)
- 로컬 서버 렌더(Chromium) 1440 / 390 / 320: 가로 넘침 0, 로고 34·국기 전부 로드
- 권역 체크 → 가격 계산(1/2/3권역 = 165/330/495만원 VAT 포함) 및 미선택 상태 확인
- 메뉴·로고 펼침·FAQ·폼 필수값 검증 확인
- mailto 본문 URL 인코딩·필수값 검증(브랜드/담당자/이메일, 이메일 형식, 제품 URL 형식) 확인

## 제약 / 미해결
- `assets/global-launch-guide.pdf`는 10월 할인과 신청 기한을 반영한 검증본입니다. 이번 폼·테마 변경에서는 PDF를 수정하지 않았습니다.
- 서버/DB 없음: 가짜 제출 완료·localStorage 접수 없음. 문의는 메일 앱 실제 전송으로만 접수.
- 외부 추적 픽셀·마케팅 스크립트·결제·개인정보 DB 없음.
- 국기는 식별용 간결 SVG(색상·배치 충실). 공공기관/협회 마크나 플랫폼 공식 인증 표식은 사용하지 않음.


## Integration verification 2026-10-25

- Verified four-page launch preparation guide added to dist/assets/global-launch-guide.pdf. SHA-256: 0106a87e89c8fbf1c79dc6bc08cb5b5c67cc844b57536daaecd7f1fc349d5c1b. Browser download reopened and matched.
- Hero leads with global launch value and October benefit; mobile home navigation and verified guide are preserved.
- Real Chrome checks: 34 logos loaded, 19 Shop labels, 1440/390/320 widths without horizontal overflow, menu and FAQ, single/multiple region calculation and empty/invalid form errors passed.
- Actual mail URL builder passed seven region/country/price fixture cases; no email was sent.
- Separate Sites deployment uses a private owner-only audience initially.

## 캠페인과 특전 업데이트

- 글로벌 7개국 중 희망 시장을 선택해 온보딩부터 제품 출고·인플루언서 테스팅까지 마무리하는 2개월 트랙입니다.
- 전 참여 브랜드 초기 20~100명 시딩은 제품 출고 완료 브랜드에 한하여 제공하며, 성장 가능성 선정 브랜드의 시딩 지원 규모는 200명 또는 100명입니다. 임의 합산·국가별 반복 제공 약속은 하지 않습니다.
- 기존 출고 순위/3위/50명/350명/600만원 및 순위별 접수·통지 일정은 제거했습니다. 10월 온보딩 50% 할인과 기존 가격은 유지합니다.
- 특전 영역을 히어로 바로 뒤로 이동하고, 히어로 시딩 수치·보증금 면제 금액을 확대했습니다.
- 디노스튜디오 소개 수치 40여 개 브랜드·11만 명 네트워크는 사용자가 제공한 운영사 실적입니다. 비교 근거 없는 최단기간 주장은 사용하지 않습니다.
- 이후 운영대행·마케팅·어필리에이트 운영은 별도 협의합니다.
- 연결 가이드 PDF도 같은 내용으로 갱신했으며 4쪽 렌더링과 페이지별 시각 검수를 마쳤습니다.

## 비주얼 전면 재구성 (2026-10-25, 캐시 v=20261025m)
- 10개 텍스트 섹션 → 6개 시각 중심 섹션(히어로/특전/진출방식/운영사/신청·비용/FAQ)으로 통합, 기본 노출 텍스트를 대폭 축약.
- 핵심 비주얼: 자체 구현 SVG/CSS 글로브(와이어프레임 원·경위선) + cyan 궤도 + pink 라우트 + 7개국 flag chip. 외부 라이브러리/이미지/맵 에셋 없음. 미세 모션 2개(route dash, orbit-dot float), reduced-motion에서 정지.
- 참여 특전은 비대칭 bento(20–100 시딩 / $1,500 면제 / 200·100)로, 제품 출고 조건은 카드에 노출. 지원 범위 상세는 단일 접힘 details.
- 구조 영감(코드/에셋 복사·설치·구매 없음, 디자인만 참고): https://magicui.design/docs/components/globe , https://magicui.design/docs/components/bento-grid , https://www.shadcnblocks.com/block/hero249 (globe hero+logo band). React/외부 의존성 추가 없이 vanilla HTML/CSS/JS로 자체 구현.
- 디자인 시스템: black/white/cyan #25F4EE/pink #FE2C55 유지, 카드 16px·충분한 여백, 큰 숫자+짧은 라벨. app.js DOM 계약(#calc*, input[name=region]/fregion/sea, #seaWrap/#seaCountries/#e-sea, #contactForm, 필드 name, #logoGrid/#logoMore, menuToggle/nav) 보존 — app.js 미변경.
- 검증(Chromium, 1회): node --check 통과, 1440/390/320 overflow 0, 로고 34(12→전체)·TikTok Shop 라벨 19·국기 로드 0깨짐, 메뉴/CTA/FAQ/로고펼침, 계산기 1/2/3권역 VAT 165/330/495·미선택 상태, 신청서 권역↔계산기 동기화, 동남아 조건부 하위국가 노출·필수 검증, 빈 폼 에러·focus, 콘솔 에러 0, 가이드 PDF 200. 메일 실발송 없음·test hook 없음.

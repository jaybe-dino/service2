# 글로벌 진출 배치 1기 — 정적 사이트 (내부 문서)

디노스튜디오가 운영하는 **글로벌 진출 배치 1기 / GLOBAL LAUNCH BATCH 01** 모집 랜딩. 빌드 도구·외부 의존성 없는 정적 사이트입니다.

> 이 README는 내부 기록용이며 고객용 `dist/`에는 포함되지 않습니다.

## 소스 범위
- 배포 대상은 `dist/` 폴더 전체입니다.
  - `dist/index.html`, `dist/styles.css`, `dist/app.js`
  - `dist/assets/brand/` — 디노스튜디오(glovek) 로고(기존 `public/brand/`에서 복사)
  - `dist/assets/logos/` — 협업 브랜드 로고 34종(기존 `public/refer/logos/`에서 원본 그대로 복사, 형태 보존)
  - `dist/assets/flags/` — 7개국 국기 SVG(미국·일본·태국·베트남·필리핀·말레이시아·싱가포르)
  - `dist/assets/global-launch-guide.pdf` — **미포함**. 검증된 PDF를 배포 전 직접 넣을 예정(링크만 준비).
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

## 기능
- 모바일 햄버거 메뉴(aria-expanded, Esc/리사이즈 닫힘)
- 참여 방식(배치/온보딩) · 희망 권역(미국/일본/동남아) 선택 → 비용 자동 계산(공급가/VAT 포함 구분)
- 권역당 200만원(VAT 별도)·220만원(포함), 2권역 400/440, 3권역 600/660
- 계산기 ↔ 문의 폼 양방향 동기화, 히어로 CTA가 참여 방식 프리셋
- FAQ 아코디언(native details)
- 문의 폼: 브랜드명/담당자/이메일/제품URL/참여방식/희망권역/메시지 → `jaybe@dinostudio.kr` **mailto 초안** 생성(실제 발송 자동화 없음, 선택 트랙·권역·비용이 본문 반영)
- 가이드 PDF 다운로드 링크, 전화 010-4032-1029

## 검증 결과
- `node --check app.js` 통과
- 로컬 서버 렌더(Chromium) 1440 / 390 / 320: 가로 넘침 0, 로고/국기 34+9 전부 로드(naturalWidth>0)
- 권역 체크 → 가격 계산(1/2/3권역 = 220/440/660만원 VAT 포함) 확인
- 참여 트랙 프리셋(히어로 CTA → 계산기/폼 반영) 확인
- FAQ 펼침/닫힘 동작 확인
- mailto 본문 URL 인코딩·필수값 검증(브랜드/담당자/이메일, 이메일 형식, 제품 URL 형식) 확인

## 제약 / 미해결
- `assets/global-launch-guide.pdf`는 **미포함(미검증)** — 배포 전 검증 PDF 주입 필요. 그 전까지 다운로드 링크는 404.
- 서버/DB 없음: 가짜 제출 완료·localStorage 접수 없음. 문의는 메일 앱 실제 전송으로만 접수.
- 외부 추적 픽셀·마케팅 스크립트·결제·개인정보 DB 없음.
- 국기는 식별용 간결 SVG(색상·배치 충실). 공공기관/협회 마크나 플랫폼 공식 인증 표식은 사용하지 않음.


## Integration verification 2026-10-25

- Verified four-page launch preparation guide added to dist/assets/global-launch-guide.pdf. SHA-256: a1e90015ff4456d591ae8f87f320d25b6dae14025eda2fea2ec94b5a11a56ef5. Browser download reopened and matched.
- Hero now leads with the shipment reward; mobile home navigation corrected and guide placeholder removed.
- Real Chrome checks: 34 logos loaded, 19 Shop labels, 1440/390/320 widths without horizontal overflow, menu and FAQ, single/multiple region calculation and empty/invalid form errors passed.
- Actual mail URL builder passed four fixture cases (including undecided region); no email was sent.
- Separate Sites deployment uses a private owner-only audience initially.

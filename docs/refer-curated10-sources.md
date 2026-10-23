# /refer 콘텐츠 레퍼런스 10 — 수록 데이터·출처 (내부 기록)

> 내부 참고용. 라이브 페이지에는 노출하지 않습니다.

- 선별: 고정 10건(순서 고정). Glovek 수록 공개 콘텐츠(정적 videos.json + 공개 `/api/feed`의 수록 ID)와 TikTok player 원본 설명·Video Cover를 대조해 선별.
- 검토일: 2026-10-23
- 이미지 출처: 각 영상의 TikTok Video Cover 원본(540×960 JPEG)을 가공 없이 로컬 정적 자산(`public/refer/curated/ref-<videoId>.jpg`)으로 보존. 서명 CDN URL·원문 캡션·내부 메모는 공개 데이터에 넣지 않음.
- 표현: 관찰형(제품 시연·루틴·발색·현장 체험). 의료 효과·매출·조회수·ROAS 등 수치 성과 주장 없음. 외부 크리에이터 콘텐츠 참고 사례이며 디노스튜디오 직접 제작 실적이 아님.
- 제외: 제품·브랜드 오분류(Clio↔autogefuehl 자동차, Laka↔inilahcom 뉴스) 및 부정적 반응·유사 구도 후보.

| # | 브랜드 | 크리에이터 | 원본 URL | 로컬 포스터 |
| --- | --- | --- | --- | --- |
| 1 | TirTir / 티르티르 | @nadina_ioana | https://www.tiktok.com/@nadina_ioana/video/7535138164298599702 | ref-7535138164298599702.jpg |
| 2 | Fwee / 퓌 | @nats_tutorials | https://www.tiktok.com/@nats_tutorials/video/7538888790954315038 | ref-7538888790954315038.jpg |
| 3 | SKIN1004 / 스킨1004 | @jasminnlily_ | https://www.tiktok.com/@jasminnlily_/video/7576679218600365334 | ref-7576679218600365334.jpg |
| 4 | Anua / 아누아 | @_skincareby.a.0 | https://www.tiktok.com/@_skincareby.a.0/video/7528307119016168712 | ref-7528307119016168712.jpg |
| 5 | Rom&nd / 롬앤 | @louiserozzz | https://www.tiktok.com/@louiserozzz/video/7569964954363645195 | ref-7569964954363645195.jpg |
| 6 | Medicube / 메디큐브 | @kaycstash | https://www.tiktok.com/@kaycstash/video/7573080707619130655 | ref-7573080707619130655.jpg |
| 7 | Celimax / 셀리맥스 | @noran.hm | https://www.tiktok.com/@noran.hm/video/7646439170751204626 | ref-7646439170751204626.jpg |
| 8 | Biodance / 바이오던스 | @ahnestkitchen | https://www.tiktok.com/@ahnestkitchen/video/7577087315995020574 | ref-7577087315995020574.jpg |
| 9 | LANEIGE / 라네즈 | @darcymcqueenyyy | https://www.tiktok.com/@darcymcqueenyyy/video/7661683037863791903 | ref-7661683037863791903.jpg |
| 10 | Torriden / 토리든 | @vykpnguyen | https://www.tiktok.com/@vykpnguyen/video/7649075165657140494 | ref-7649075165657140494.jpg |

- 데이터: `src/data/refer.ts` `REFER_CURATED`(카드 표시 필드만). 포스터: `public/refer/curated/`.
- 기존 UGC 16건·GENIE 3건 데이터/자산은 소스에 보존(공개 페이지 비노출): `REFER_UGC`, `REFER_CASES`.

## 추가 선별 10건 (풀 확장 → 총 20건, 검토일 2026-10-23)

- 동일 기준으로 Glovek 수록 공개 데이터 + TikTok player 원본 설명·Video Cover를 대조해 선정(포스터 직접 비교). 전체 영상·오디오 재생 검수는 아님. 수치 성과·의료 효과 주장 없음, manifest 관찰형 카피 유지. signed CDN URL은 코드·공개 문서에 포함하지 않음.

| # | 브랜드 | 크리에이터 | 원본 URL(canonical) | 로컬 포스터 |
| --- | --- | --- | --- | --- |
| 11 | 3CE / 쓰리씨이 | @naa._.aru | https://www.tiktok.com/@naa._.aru/video/7648965161792949522 | ref-7648965161792949522.jpg |
| 12 | Clio / 클리오 | @ninapark | https://www.tiktok.com/@ninapark/video/7591769489012837645 | ref-7591769489012837645.jpg |
| 13 | Mediheal / 메디힐 | @jessicafentisa | https://www.tiktok.com/@jessicafentisa/video/7521335940057419015 | ref-7521335940057419015.jpg |
| 14 | VT Cosmetics / 브이티 | @koreangrandma | https://www.tiktok.com/@koreangrandma/video/7626580551280938261 | ref-7626580551280938261.jpg |
| 15 | Aromatica / 아로마티카 | @ailimee__ | https://www.tiktok.com/@ailimee__/video/7671377861575576854 | ref-7671377861575576854.jpg |
| 16 | Haruharu Wonder / 하루하루원더 | @by.fannys | https://www.tiktok.com/@by.fannys/video/7662048897132432673 | ref-7662048897132432673.jpg |
| 17 | Fwee / 퓌 | @westclau_ | https://www.tiktok.com/@westclau_/video/7597063575559015687 | ref-7597063575559015687.jpg |
| 18 | SKIN1004 / 스킨1004 | @tatiencorea | https://www.tiktok.com/@tatiencorea/video/7637495706105777426 | ref-7637495706105777426.jpg |
| 19 | Rom&nd / 롬앤 | @missdarcei | https://www.tiktok.com/@missdarcei/video/7554463875261926674 | ref-7554463875261926674.jpg |
| 20 | Beauty of Joseon / 조선미녀 | @kaynatt.m | https://www.tiktok.com/@kaynatt.m/video/7665035439610383638 | ref-7665035439610383638.jpg |

- 노출 방식: 풀 20건에서 **요청마다 서버 Fisher-Yates 셔플 후 10건 샘플**(중복 ID 없음, 같은 화면 브랜드 중복 회피 — 풀 내 고유 브랜드 17개). `/refer` `force-dynamic`+`revalidate 0`으로 production/CDN 캐시 고정 방지. cookie/history/DB 전체 랜덤·신규 API 미사용.

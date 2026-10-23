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

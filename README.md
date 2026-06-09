# K-Trend Analytics (v6.0)

글로벌 틱톡(TikTok) K-뷰티 콘텐츠 조회·분석 전문 B2B SaaS의 프론트엔드 MVP.

미국을 중심으로 태국·베트남·필리핀·말레이시아·싱가포르 6개국 틱톡 샵에서 바이럴되는
110+ K-뷰티 브랜드의 콘텐츠를 **브랜드 · 콘텐츠 · 인플루언서별**로 탐색·분석합니다.

## 핵심 컨셉

- **콘텐츠(영상) 중심 리스팅**: 모든 데이터를 틱톡 영상 단위로 조회
- **TikTok 중심**: 틱톡 샵 어필리에이트 성과(수수료율·추정 ROAS·기여 매출) 매핑
- **미국 중심 6개국**: US / TH / VN / PH / MY / SG
- **코스메틱(뷰티) 카테고리**: 스킨케어·선케어·메이크업·마스크팩·트러블케어·립케어
- **유료 서비스 고도화**: Basic(블러) / Pro / Enterprise + Add-on

## 주요 화면

| 경로 | 화면 | 설명 |
| --- | --- | --- |
| `/` | 랜딩 | 가치 제안, 6개국, 대표 브랜드 |
| `/explorer` | 콘텐츠 탐색기 | A-Z 브랜드 퀵탭 + 브랜드/카테고리/국가/스타일/인플루언서 필터 + 4열 그리드 |
| `/influencers` | 인플루언서 DB | 검증 크리에이터 성과·컨택(Pro 해금) |
| `/reports` | 성장 리포트 | 조회수·매출 추이, SOV 도넛, 인플루언서 기여도 |
| `/viral` | 바이럴 감지 | 실시간 시그널, 감지 조건, 급상승 Top 12 |
| `/plans` | 요금제 | 플랜 비교 + Add-on |

> 헤더 우측의 **현재 플랜** 버튼으로 Basic ↔ Pro ↔ Enterprise를 전환하면
> 유료 지표 블러 잠금이 해제되는 데모를 확인할 수 있습니다.

## 데이터 출처

본 빌드는 정적 배포(MVP UI) 단계로, 실제 크롤링 대신 전 브랜드/국가/카테고리/인플루언서
조합을 망라하는 **결정론적 샘플 데이터셋**(`src/data/ktrend/`)을 사용합니다.
실서비스 로드맵: **V1** 틱톡 샵 오픈 DB 스크래핑 + AI 예측 → **V2** 틱톡원(TikTok One) 다이렉트 API + 브랜드 OAuth2.

## 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 정적 빌드 (out/)
```

## 배포

`main` 또는 `claude/epic-edison-m35tv3` 브랜치 push 시 GitHub Actions가 정적 빌드 후
GitHub Pages로 배포합니다 (`.github/workflows/deploy.yml`). 공개 URL: `https://<user>.github.io/service2/`

## 기술 스택

Next.js 15 (App Router, `output: export`) · React 19 · TypeScript · Tailwind CSS v4 · lucide-react

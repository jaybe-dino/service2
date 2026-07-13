# Remake 조립 워커 (FFmpeg)

`/api/remake/assemble` 이 만든 편집 계획(EDL)을 받아 샷 클립들을 이어붙여 최종 mp4를 만든다.
서버리스(Vercel)엔 ffmpeg가 없으므로 이 워커를 별도 배포한다(프레임 추출 워커와 동일 패턴).

## 계약
- `POST /` body `{ plan }` → `{ ok, videoUrl, id, shots }`
  - `plan.timeline[].src` 클립을 순서대로 다운로드 → 1080x1920/30fps 정규화 → concat → `out/{id}.mp4`
  - `videoUrl` = 이 워커가 서빙하는 완성본(`GET /out/{id}.mp4`)
- `GET /health` → `{ ok: true }`
- 인증(선택): `WORKER_KEY` 설정 시 `Authorization: Bearer <KEY>` 필요

## v1 범위 / 한계
- 전환 = 하드컷, **오디오 제외(무음 릴)**, 자막/BGM 번인 미포함 — 안정성 우선.
- 크로스페이드·자막 번인(캡션)·BGM 믹스는 후속 확장.
- 원본 레퍼런스 영상은 절대 다루지 않음 — 우리가 생성한 클립만 조립(저작권 안전).

## 배포 (Railway 예시)
1. 이 폴더를 서비스로 배포(Dockerfile 자동 인식).
2. 환경변수:
   - `PUBLIC_BASE` = 이 워커의 공개 URL (예: `https://xxx.up.railway.app`) — 응답 videoUrl에 사용
   - `WORKER_KEY` = (선택) 공유 시크릿
3. 앱(Vercel) 환경변수:
   - `REMAKE_ASSEMBLE_WORKER_URL` = 워커 URL
   - `REMAKE_ASSEMBLE_WORKER_KEY` = `WORKER_KEY` 와 동일(설정 시)

## 로컬 테스트
```bash
node server.js         # :8080
curl -s localhost:8080/health
curl -s -X POST localhost:8080/ -H 'content-type: application/json' \
  -d '{"plan":{"timeline":[{"src":"https://.../clip1.mp4"},{"src":"https://.../clip2.mp4"}]}}'
```

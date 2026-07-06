# Remake Studio — 장면별 프레임 추출 워커

레퍼런스 영상에서 **장면(타임스탬프)별 실제 프레임**을 뽑아 base64로 돌려주는 작은 서비스.
Vercel 앱(`/api/remake/generate`)이 이 워커를 호출해, 각 씬 생성에 그 씬의 실제 프레임을
스타일 조건(reference-to-video)으로 넣습니다.

> Vercel 서버리스에는 ffmpeg/yt-dlp가 없어 이 무거운 작업만 분리한 것입니다.

## API 계약
```
POST /            (Authorization: Bearer <FRAME_SERVICE_KEY>, 설정 시)
body: { "videoUrl": "https://www.tiktok.com/@x/video/123", "timestamps": [1, 5, 10, 14] }
→ 200 { "frames": [ { "b64": "...", "mime": "image/jpeg" }, null, ... ] }   // 인덱스 매칭
GET /  → "frame-extract ok" (헬스체크)
```

## 배포 (택1)
ffmpeg를 쓸 수 있는 아무 곳이나: **Railway / Render / Fly.io / Google Cloud Run** 등.
```bash
# 예: 이 폴더에서 컨테이너 배포
docker build -t remake-frame-extract .
# Cloud Run
gcloud run deploy remake-frame-extract --source . --region asia-northeast3 --allow-unauthenticated \
  --set-env-vars FRAME_SERVICE_KEY=$(openssl rand -hex 16)
```
- 환경변수: `PORT`(기본 8080), `FRAME_SERVICE_KEY`(선택, 인증)

## Vercel(앱)에 연결
배포된 워커 URL을 Vercel 환경변수에 넣고 Redeploy:
```
REMAKE_FRAME_SERVICE_URL = https://<배포된-워커-URL>
REMAKE_FRAME_SERVICE_KEY = <위 FRAME_SERVICE_KEY와 동일>
```
- 미설정 시 앱은 자동으로 **커버 프레임(oEmbed 1장)** 으로 폴백합니다.
- 정밀도 표기: 결과 응답 `fidelity` = `perScene`(장면별) > `cover`(대표1장) > `text`.

## ⚠️ 법적/정책 주의
- 타 크리에이터의 영상을 다운로드해 프레임을 사용하는 것은 **플랫폼 ToS·저작권 이슈**가 있을 수 있습니다.
- 스타일/구조 참조는 일반적으로 허용 범위지만, **원본 프레임을 그대로 재사용/복제하지 않도록** 프롬프트에서 제품 교체·복제 금지를 지시합니다.
- 운영 전 **권리 확보/법무 검토**를 권장합니다. (브랜드 자체 영상·라이선스 확보 콘텐츠로 시작하면 안전)

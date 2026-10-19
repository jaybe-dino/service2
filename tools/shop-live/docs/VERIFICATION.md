# 검증 기록 — 2026-10-19 (Cloud 일시 개발 환경)

> **이 환경은 운영 서버가 아닙니다.** Claude Code Cloud 컨테이너 안에서 Docker를 기동해 시험했습니다.
> **VPN은 TEST-NET 더미입니다.** gluetun을 `custom` provider로 두고 도달할 수 없는 `192.0.2.10:1194`(RFC 5737)를 가리켰으며, 실제 VPN 접속은 하지 않았습니다.
> 따라서 **미국 egress, TikTok 상품 로드, 실제 NordVPN 연결은 검증하지 않았습니다.**
> 더미 설정(override compose, test env, ovpn)은 scratchpad에만 두었고 저장소에는 넣지 않았습니다. 토큰 값은 기록하지 않았습니다.

## 시험 환경

- Docker Engine 29.8.2 / Compose v5.6.0, cgroup v1
- 이미지(태그+digest 고정, 실제 pull 확인)
  - `qmcgaw/gluetun:v3.41.3@sha256:fa19cc76…e027`
  - `selenium/standalone-chromium:155.0-chromedriver-155.0-grid-4.51.0-20261010@sha256:c7c17cd7…8870`
  - `node:22.22.3-alpine3.24@sha256:e58326d0…fdd` (gateway 빌드)
- 실행은 저장소의 `compose.yaml` + scratchpad override(provider=custom, healthy 대기 → started) + `--env-file` 조합이었고, `ps/logs/exec/down`도 모두 같은 래퍼로 실행했습니다.

## 실제 수행한 검사

| 항목 | 결과 | 근거 (명령 → 실제 응답 / 종료코드) |
| --- | --- | --- |
| 게이트웨이 단위·통합 테스트 | **20/20 pass** | `cd gateway && npm test` (인증, 잠금, 만료, 허용 URL, 태국 제외, 미준비 시 503, 동시 이동 409, 세션 재사용, noVNC/WS 프록시 인증·Origin, 갤러리 링크 조건) |
| compose 필수 비밀 누락 시 거부 | pass | env 없이 실행 → `required variable OPENVPN_USER/OPENVPN_PASSWORD/GATEWAY_ACCESS_TOKEN is missing` |
| 호스트 포트 공개 범위 | pass | `docker port gluetun` → `8080/tcp -> 127.0.0.1:8080` 하나뿐. 호스트에서 4444/5900/7900/8000 연결 → exit 7 |
| VPN 미연결 시 egress 차단 | pass (더미 조건) | gluetun `iptables -S OUTPUT` → `-P OUTPUT DROP`, 허용은 lo/eth0 서브넷/`192.0.2.10 udp 1194`/tun0뿐. 기본 경로가 eth0으로 살아 있어도 browser `curl http://1.1.1.1` → exit 28(timeout), gateway fetch → timeout. 대조군(namespace 밖 컨테이너) `curl http://1.1.1.1` → http 403 응답 도달 |
| 미인증 접근 거부(실행 중 gateway) | pass | `/` → 303 `/login`. `/api/status`·`/api/brands`·`/novnc/vnc.html`·`POST /api/navigate` → 401. WS `/novnc/websockify` → `HTTP/1.1 401` |
| 로그인 | pass | 틀린 토큰 → 303 `/login?e=1`(쿠키 없음). 외부 Origin → 403. 올바른 토큰 → 303 `/` + 세션 쿠키 |
| 미준비 상태 표시·차단 | pass | `/api/status` → `vpn.state:"crashed", running:false`, `egress.verified:false`("VPN 미연결 — 확인 생략"), `ready:false`. `POST /api/navigate roatti` → **503 not_ready** |
| 허용 외 이동 거부 | pass | `brandId:"verries"`(태국) → 400. `{"url":"http://127.0.0.1:4444/status"}` → 400. `/api/brands` → 미국 8개 |
| Chromium 정책 | pass | 브라우저에서 `http://localhost:4444/status` → "This page is blocked / Your organization doesn't allow you to view this site" |
| **viewer → noVNC 실제 렌더 + 실제 입력** | **pass** | Playwright로 로그인 → 뷰어 → same-origin iframe noVNC 캔버스 표시. 상태 칩: "VPN: 미연결 / 미국 egress: 미검증 / 화면 스트림: 연결됨", 이동 버튼 비활성. 캔버스 클릭 → 서버 Chromium의 버튼 텍스트 `CLICK ME` → `CLICKED 1`. 휠 → `scrollY 0 → 720`(WebDriver로 서버 측에서 읽음). 외부망 없이 `data:` 테스트 페이지 사용. 화면: [`novnc-viewer-dummy-test.png`](novnc-viewer-dummy-test.png) |
| 갤러리 링크 기본 비활성 | pass | 저장소 상태 그대로 서빙 → 카드 9, "실시간" 링크 0. 임시 복사본에서만 `enabled:true`+https origin을 넣었을 때 미국 8개에 `https://…/?brand=<id>` 표시(태국 제외), JS 오류 0 |
| `scripts/verify-deploy.sh killswitch` 동작 (**f49be9b 시점의 구버전 스크립트**, 아래 2차 보완에서 교체) | 결과는 더미 한계 반영 | 포트 4개 닫힘·미인증 4종 PASS. **미국 egress 2종 FAIL(실제 `error`/빈 값, 의도된 결과)**. tun0이 없어 `ip link set tun0 down` exit 1. 차단 2종 PASS(VPN 미연결이므로 당연). gluetun healthy 대기는 시간 초과(더미라 unhealthy). 스크립트 exit 1 |

### 실측으로 찾아 고친 결함

1. Chromium 정책 `DeveloperToolsAvailability=2` 때문에 ChromeDriver 세션이 생성되지 않음(`unhandled inspector error: Not allowed`) → 해당 정책 제거.
2. `Referrer-Policy: no-referrer` 때문에 Chrome이 폼/fetch POST의 Origin을 `null`로 보내 로그인과 이동이 403 → `same-origin`으로 변경하고 회귀 테스트 추가.
3. 이 Selenium 이미지의 noVNC는 `path`를 페이지 기준 상대 경로로 해석함 → `path=websockify`.
4. WebSocket half-close 시 프록시 소켓이 정리되지 않음 → end/close 양방향 정리.

## 수행하지 않은 검증 (필요 입력)

| 항목 | 이유 / 필요한 것 |
| --- | --- |
| 실제 NordVPN(United States) 연결, 미국 egress `US` | NordVPN **service credentials** 미확보 |
| TikTok 상품 페이지 실제 로드, 실제 보안 퍼즐 수동 처리 | VPN + 서버 필요. Cloud 환경에서는 외부 egress도 제한됨 |
| 실제 VPN 터널에서 tun0 down → 차단 → 자동 복구 | 실제 VPN 필요. 이번 차단 증거는 "터널이 한 번도 연결되지 않은 상태" 기준임 |
| HTTPS 역프록시, 공개 도메인, 외부 포트 스캔 | 서버·도메인 미확보. 예시 설정만 제공(`deploy/`), 실제 적용은 하지 않음 |
| 갤러리 링크 활성화 | 위 항목이 모두 통과한 뒤 `meta.liveViewer`를 설정 |

운영 서버에서 `.env` 채우기 → `docker compose up -d --build` → `./scripts/verify-deploy.sh killswitch` → README 체크리스트의 수동 5~7번 순서로 진행합니다.

## 2차 보완 (검토 피드백 3건, Docker 재시험 없이 코드·회귀검사만)

| 항목 | 수정 | 회귀검사 (`cd gateway && npm test`, 37/37 pass) |
| --- | --- | --- |
| 열린 WS 원격 제어 연결이 로그아웃/만료 뒤에도 유지됨 | 열린 WS를 세션 id별로 추적(값은 로그에 남기지 않음). 로그아웃하면 즉시, 세션이 만료되면 2초 점검 주기 안에 끊고, 서버 종료 때도 정리 | 실제 TCP fixture WS로 확인: 로그아웃 → 1초 안에 종료. 만료 → 점검 주기 안에 종료되고 다른 유효 세션은 유지. `server.close()` → 종료 |
| 잘못된 absolute-form URL upgrade가 프로세스를 죽일 수 있음 | upgrade와 일반 요청 모두 URL 파싱을 보호하고 400 응답 | `GET http://[bad/... ` upgrade와 일반 요청 → `HTTP/1.1 400`, 이후 `/healthz` 200(프로세스 생존). 수정 전 코드에서는 같은 테스트 파일이 실패함을 확인 |
| `verify-deploy.sh`가 실패를 놓칠 수 있음 | 필수 명령의 비정상 종료, VPN이 running이 아님, 미국 egress 미확인, 공개 주소 불일치를 모두 FAIL로 집계하고 최종 exit 1. 명령·실제 exit code를 기록. killswitch는 VPN running·미국 egress·tun0 존재·**양성 대조(끊기 전 같은 목적지 도달)**가 모두 확인된 경우에만 tun0을 내림. down 실패, 끊긴 뒤 누수, 복구 후 unhealthy·VPN/US 미확인은 FAIL. EXIT/INT/TERM trap으로 복구(tun0 up → healthy 대기 → 안 되면 스택 재시작). `GATEWAY_HOST_PORT`는 셸 환경 > `.env`(해당 줄만 읽음, source 안 함) > 8080 순서로 읽음 | 가짜 compose/curl fixture(`gateway/test/fixtures/`)로 13개 시나리오 검사: 정상(basic/killswitch → 0, `.env` 포트 사용, tun0 복구). `.env` 포트를 무시하면 실패. compose ps 실패, VPN stopped, egress KR → nonzero. killswitch 전제 실패 4종(VPN·US·tun0 없음·양성 대조 실패) → tun0을 내리지 않고 nonzero. down 명령 실패, 누수, 복구 unhealthy → nonzero. 끊긴 상태에서 SIGTERM → trap이 tun0 복구 + nonzero |

새 스크립트는 실제 Docker 스택이나 실제 VPN에서 다시 돌리지 않았습니다(가짜 fixture로만 검사). shellcheck는 이 환경에 없어 실행하지 못했습니다.

## 정리

검증 후 같은 래퍼로 `down` 했고, 컨테이너 3개와 네트워크가 제거된 것을 `docker ps -a` 필터로 확인했습니다.

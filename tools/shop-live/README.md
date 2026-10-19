# Shop Live — 1인용 미국 VPN 브라우저 뷰어 (MVP 배포 패키지)

한국에서 **VPN을 설치하지 않고**, 웹 페이지 안에서 미국 VPN에 연결된 **실제 Chromium 화면**을 보면서
직접 클릭·스크롤·보안 퍼즐(CAPTCHA) 처리를 할 수 있게 하는 1인용 스택입니다.

> 상태: **코드/구성 완료, 실제 미국 VPN 연결과 TikTok 로드는 아직 미검증**입니다.
> NordVPN service credentials와 서버가 확보된 뒤 `scripts/verify-deploy.sh`와 수동 점검을 통과해야 운영 사용 가능으로 봅니다.
> 검증 기록: [`docs/VERIFICATION.md`](docs/VERIFICATION.md)

## 구조

```
사용자 브라우저 ──HTTPS──▶ 역프록시(Caddy/nginx, 호스트) ──▶ 127.0.0.1:8080
                                                         │ (gluetun network namespace 공유)
                   ┌─────────────────────────────────────┴───────────────────────────┐
                   │ gateway (Node, 의존성 0)  : 인증, 허용 brand 이동, noVNC/WS 프록시   │
                   │ browser (Selenium Chromium): Xvfb + x11vnc(5900) + noVNC(7900) + 4444 │
                   │ gluetun (NordVPN OpenVPN, United States): tun0 + iptables 킬스위치   │
                   └──────────────────────────────────────────────────────────────────┘
```

- 세 컨테이너가 gluetun의 network namespace를 공유하므로 브라우저와 게이트웨이의 외부 요청은 모두 VPN(tun0)으로만 나갑니다.
  gluetun 방화벽은 `OUTPUT DROP` 기본 정책이라 VPN이 끊기면 외부 요청이 차단됩니다.
- 호스트에 공개되는 포트는 **gateway 8080 하나, 127.0.0.1에만** 바인딩합니다. Selenium 4444·CDP·VNC 5900·noVNC 7900·gluetun 제어 8000은 publish하지 않습니다.
- 뷰어 페이지는 같은 출처(same-origin) iframe으로 `/novnc/vnc.html`을 띄우고, WebSocket도 같은 출처 `/novnc/websockify`로 프록시합니다. 그래서 서드파티 쿠키 문제가 없습니다.
- 스크린샷을 주기적으로 새로 고치는 방식이 아닙니다. noVNC(RFB) 실시간 스트림이며, 마우스와 키보드 입력이 그대로 Chromium에 전달됩니다.

### 게이트웨이 동작

| 경로 | 인증 | 설명 |
| --- | --- | --- |
| `GET/POST /login`, `POST /logout` | – | 접근 토큰 → HttpOnly·SameSite=Strict·Secure 세션 쿠키. 15분에 10회 실패하면 잠금. POST는 same-origin Origin만 허용 |
| `GET /` | 필요 | 뷰어(브랜드 선택 · 연결 상태 · 실시간 화면) |
| `GET /api/status` | 필요 | VPN 상태(gluetun), **미국 egress 실측**(namespace 내부에서 ipinfo 조회, 60초 캐시), Selenium 응답, 스트림 연결 수 |
| `GET /api/brands` | 필요 | `../shop-viewer/data.json`의 **미국 + `https://shop.tiktok.com/us/pdp/<숫자>`** 형식 항목만(현재 8개). 태국은 제외 |
| `POST /api/navigate {brandId}` | 필요 + Origin + JSON | 허용 brandId만 받아 data.json의 URL로 이동합니다. 임의 URL은 받지 않습니다. VPN·미국 egress·Selenium이 모두 확인돼야 하며, 아니면 503(fail-closed). 브라우저 세션은 1개를 재사용하고, 이동이 겹치면 409 |
| `GET /novnc/*`, WS `/novnc/websockify` | 필요 (+WS Origin) | noVNC 프록시. 쿠키와 Origin은 업스트림에 전달하지 않습니다. 열린 WS는 로그아웃하면 즉시, 세션이 만료되면 2초 안에, 서버가 종료되면 함께 끊깁니다 |

로그인·결제·구매 자동화와 CAPTCHA 자동 해결은 **없습니다**. 퍼즐은 사용자가 화면에서 직접 풉니다.
탐지 회피용 브라우저 플래그도 넣지 않았습니다. 화면 상단의 "Chrome is being controlled by automated test software" 표시는 그대로 둡니다.

Chromium 관리 정책(`chromium/policies.json`)은 localhost·127.0.0.1·file:// 접속을 막고, 비밀번호/자동완성/결제수단 저장과 다운로드를 끕니다.
DevTools 비활성화 정책은 ChromeDriver 세션 생성을 막기 때문에 넣지 않았습니다(실측으로 확인).

## 서버 요구사항

- Linux x86_64 VM, `/dev/net/tun` 사용 가능(일반 KVM VPS는 가능, 일부 컨테이너형 VPS는 불가)
- 권장 **2 vCPU / 4 GB RAM / 디스크 20 GB 이상** (Selenium 이미지 약 3.4 GB, `shm_size: 2gb`)
- Docker Engine + Docker Compose v2
- 공개 접속 시 도메인 1개 + HTTPS 역프록시(Caddy 또는 nginx). 도메인 없이 쓸 때는 SSH 터널을 사용
- 저장소의 `tools/` 디렉터리(게이트웨이가 `../shop-viewer/data.json`을 읽기 전용으로 마운트)

## 비밀 변수 (`.env`, git 제외)

| 이름 | 내용 |
| --- | --- |
| `OPENVPN_USER`, `OPENVPN_PASSWORD` | NordVPN **service credentials**(Nord 계정 → Manual setup → Service credentials). 일반 로그인 이메일/비밀번호가 아님 |
| `GATEWAY_ACCESS_TOKEN` | 32자 이상 무작위 값 (`openssl rand -base64 36`). 서버와 사용자 본인만 보관 |
| `PUBLIC_ORIGIN` | 공개 HTTPS 주소(예: `https://live.example.com`). SSH 터널만 쓸 때는 비움 |
| `GATEWAY_HOST_PORT`, `COOKIE_SECURE`, `SESSION_TTL_HOURS` | 선택 (기본값: 8080 / true / 12) |

## 설치 · 시작 · 중지 · 재시작 · 롤백

```bash
cd tools/shop-live
cp .env.example .env && chmod 600 .env      # 값 채우기 (서버에서만)
docker compose pull                         # 이미지는 태그+digest로 고정
docker compose up -d --build                # 시작
docker compose ps                           # gluetun healthy 확인
docker compose logs -f gluetun              # VPN 연결 로그
./scripts/verify-deploy.sh                  # 자동 경계 검사 (evidence/ 에 기록)
./scripts/verify-deploy.sh killswitch       # + VPN 단절 시 차단 검사

docker compose restart                      # 재시작 (gluetun만 재시작한 경우 browser·gateway도 재시작해야 함)
docker compose down                         # 중지 (상태 없음, 볼륨 없음)
```

- **역프록시**: `deploy/Caddyfile.example` 또는 `deploy/nginx.conf.example`. 같은 주소를 `.env`의 `PUBLIC_ORIGIN`에 넣습니다.
- **SSH 터널(도메인 없이)**: `ssh -L 8080:127.0.0.1:8080 <server>` 후 `http://127.0.0.1:8080`에 접속합니다. Chrome/Firefox는 localhost에서 Secure 쿠키를 허용합니다.
- **롤백**: `git checkout <이전 커밋> -- tools/shop-live && docker compose up -d --build`. 완전 중단은 `docker compose down`입니다.
  갤러리 링크는 `tools/shop-viewer/data.json`에서 `meta.liveViewer.enabled=false`로 돌리면 즉시 사라집니다.

## 기존 갤러리 연결 (기본 비활성)

`tools/shop-viewer/data.json`의 `meta.liveViewer` 기본값은 `enabled:false, origin:null`이며, 이 상태에서는 아무 링크도 나타나지 않습니다.
아래 수동 검증을 모두 통과한 뒤 `enabled:true`, `origin:"https://…"`(경로 없는 HTTPS origin), `verifiedAt`(ISO 시각)을 함께 넣어야
미국 항목 카드에 "실시간 미국 브라우저 ↗"(새 탭, `?brand=<id>`는 선택만 하고 자동 이동은 하지 않음)가 표시됩니다.

## 실제 배포 경계 검증 체크리스트

| # | 항목 | 방법 | 자동 |
| --- | --- | --- | --- |
| 1 | 미국 IP | `verify-deploy.sh` §3: gateway·browser 각각 ipinfo country = `US`. 뷰어 칩 "미국 egress: 확인됨" | ✅ |
| 2 | VPN 단절 시 egress 차단 | `verify-deploy.sh killswitch`: VPN running·미국 egress·tun0·양성 대조(끊기 전 도달)를 먼저 확인한 뒤에만 tun0 down → 외부 요청 실패 확인 → trap으로 복구 후 healthy·US 재확인. 어느 하나라도 실패하면 exit 1 | ✅ |
| 3 | 미인증 접근 거부 | §2: `/api/*`, `/novnc/*`, WS 401. 로그아웃 후 재확인 | ✅ / 수동 |
| 4 | 내부 포트 비노출 | §1 + 외부에서 `nmap -p 4444,5900,7900,8000,8080 <서버IP>` 결과 모두 닫힘 | 일부 |
| 5 | TikTok 상품 로드 | 뷰어에서 브랜드 이동 후 상품 페이지가 실제로 보이는지 눈으로 확인 | 수동 |
| 6 | 실제 마우스/스크롤 | 화면에서 클릭·스크롤 반응 확인 | 수동 |
| 7 | 수동 퍼즐 | 보안 퍼즐이 나오면 직접 풀어서 통과되는지 확인(자동 해결 없음) | 수동 |

## 개발

```bash
cd tools/shop-live/gateway && npm test     # node --test, 외부 의존성 없음 (verify-deploy.sh 실패 집계 검사 포함, bash 필요)
```

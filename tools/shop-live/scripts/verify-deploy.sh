#!/usr/bin/env bash
# 실제 서버에서 배포 경계를 검증한다. tools/shop-live 디렉터리에서 실행:
#   ./scripts/verify-deploy.sh            # 자동 검사 (미국 egress, 포트 노출, 미인증 거부)
#   ./scripts/verify-deploy.sh killswitch # + VPN 단절 시 egress 차단 검사 (tun0 을 잠시 내림)
# 결과는 evidence/<시각>.txt 에 명령·종료코드·응답 그대로 저장(gitignore). 비밀값은 출력하지 않는다.
set -u
cd "$(dirname "$0")/.."
DC="${DC:-docker compose}"  # 운영과 같은 compose 파일/.env 를 사용 (테스트 시 래퍼로 대체 가능)
PORT="${GATEWAY_HOST_PORT:-8080}"
B="http://127.0.0.1:${PORT}"
mkdir -p evidence
OUT="evidence/verify-$(date -u +%Y%m%dT%H%M%SZ).txt"
FAIL=0

rc() { echo "\$ $*"; "$@" 2>&1; local c=$?; echo "[exit=$c]"; echo; return $c; }
expect() { # expect <설명> <기대값> <실제값>
  if [ "$2" = "$3" ]; then echo "PASS  $1 ($3)"; else echo "FAIL  $1 (기대 $2, 실제 $3)"; FAIL=1; fi
}
code() { curl -sS -m 10 -o /dev/null -w '%{http_code}' "$@" 2>/dev/null; }

{
  echo "# shop-live verify $(date -u +%FT%TZ)"
  rc $DC ps --format '{{.Service}} {{.State}} {{.Status}}'
  rc docker port "$($DC ps -q gluetun)"

  echo "## 1. 내부 포트가 호스트에 열려 있지 않음"
  for p in 4444 5900 7900 8000; do expect "host 127.0.0.1:$p 닫힘" "000" "$(code http://127.0.0.1:$p/)"; done

  echo "## 2. 미인증 접근 거부"
  expect "GET /api/status" 401 "$(code $B/api/status)"
  expect "GET /novnc/vnc.html" 401 "$(code $B/novnc/vnc.html)"
  expect "POST /api/navigate" 401 "$(code -X POST -H "Origin: $B" -H 'content-type: application/json' -d '{"brandId":"roatti"}' $B/api/navigate)"
  expect "WS /novnc/websockify" 401 "$(code -H "Origin: $B" -H 'Upgrade: websocket' -H 'Connection: Upgrade' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' $B/novnc/websockify)"

  echo "## 3. VPN 상태 및 미국 egress (gateway·browser 각각, 같은 namespace)"
  rc $DC exec -T gluetun wget -qO- http://127.0.0.1:8000/v1/vpn/status
  GW=$($DC exec -T gateway node -e 'fetch("https://ipinfo.io/json",{signal:AbortSignal.timeout(10000)}).then(r=>r.json()).then(j=>console.log(j.country||"none")).catch(e=>console.log("error"))' 2>/dev/null | tr -d '\r')
  expect "gateway egress country" US "$GW"
  BR=$($DC exec -T browser curl -sS -m 10 https://ipinfo.io/country 2>/dev/null | tr -d '\r\n')
  expect "browser egress country" US "$BR"

  if [ "${1:-}" = "killswitch" ]; then
    echo "## 4. VPN 단절 시 egress 차단 (tun0 down → 외부 요청 실패해야 함)"
    rc $DC exec -T gluetun ip link set tun0 down
    KS=$($DC exec -T browser curl -sS -m 8 -o /dev/null -w '%{http_code}' http://1.1.1.1 2>/dev/null)
    expect "tun0 down 동안 browser→1.1.1.1 차단" "000" "${KS:-000}"
    KS2=$($DC exec -T gateway node -e 'fetch("http://1.1.1.1",{signal:AbortSignal.timeout(8000)}).then(()=>console.log("open")).catch(()=>console.log("blocked"))' 2>/dev/null | tr -d '\r')
    expect "tun0 down 동안 gateway→1.1.1.1 차단" blocked "$KS2"
    echo "gluetun 재연결 대기(최대 120초)…"
    for _ in $(seq 1 60); do
      [ "$(docker inspect -f '{{.State.Health.Status}}' "$($DC ps -q gluetun)")" = healthy ] && break; sleep 2
    done
    rc docker inspect -f '{{.State.Health.Status}}' "$($DC ps -q gluetun)"
    echo "재연결 후에도 브라우저/게이트웨이 네트워크가 이상하면: $DC restart browser gateway"
  fi

  echo "## 수동 확인 필요 (자동화하지 않음)"
  echo "- HTTPS 주소에서 로그인 → 상태칩 VPN/미국 egress/브라우저/화면 스트림 확인"
  echo "- 브랜드 선택 → 이동 → TikTok 상품 페이지가 화면에 실제로 로드되는지 눈으로 확인"
  echo "- 화면에서 마우스 클릭/스크롤이 반응하는지, 보안 퍼즐이 나오면 직접 풀 수 있는지"
  echo "- 로그아웃 후 /, /api/status, /novnc/vnc.html 접근이 막히는지"
  [ $FAIL -eq 0 ] && echo "RESULT: 자동 검사 PASS" || echo "RESULT: 자동 검사 FAIL 있음"
} 2>&1 | tee "$OUT"
echo "저장: $OUT"
grep -q "RESULT: 자동 검사 PASS" "$OUT"

#!/usr/bin/env bash
# 실제 서버에서 배포 경계를 검증한다. tools/shop-live 디렉터리 기준:
#   ./scripts/verify-deploy.sh            # 자동 검사: 포트 비노출, 미인증 거부, VPN running, 미국 egress
#   ./scripts/verify-deploy.sh killswitch # + VPN 단절 시 egress 차단 (tun0 을 잠시 내렸다가 복구)
# 하나라도 실패하면 최종 종료코드는 1. 결과는 evidence/verify-<시각>.txt 에 명령·실제 종료코드·응답 그대로 저장.
# 비밀값은 출력하지 않는다(.env 에서는 GATEWAY_HOST_PORT 만 읽고 source 하지 않음).
# 테스트용 대체: DC(compose 명령), CURL, ENV_FILE, EVIDENCE_DIR, RECOVER_WAIT_SEC
set -u
cd "$(dirname "$0")/.."

MODE="${1:-basic}"
case "$MODE" in basic|killswitch) ;; *) echo "usage: $0 [killswitch]" >&2; exit 2 ;; esac

DC="${DC:-docker compose}"
CURL="${CURL:-curl}"
ENV_FILE="${ENV_FILE:-.env}"
EVIDENCE_DIR="${EVIDENCE_DIR:-evidence}"
RECOVER_WAIT_SEC="${RECOVER_WAIT_SEC:-120}"
CONTROL_TARGET="http://1.1.1.1"   # 양성/음성 대조에 같은 외부 목적지 사용

# compose 와 같은 우선순위: 셸 환경변수 > .env > 기본값 8080
if [ -z "${GATEWAY_HOST_PORT:-}" ] && [ -f "$ENV_FILE" ]; then
  GATEWAY_HOST_PORT="$(sed -n 's/^[[:space:]]*GATEWAY_HOST_PORT[[:space:]]*=[[:space:]]*["'\'']\{0,1\}\([0-9]\{1,5\}\)["'\'']\{0,1\}[[:space:]]*$/\1/p' "$ENV_FILE" | tail -n1)"
fi
PORT="${GATEWAY_HOST_PORT:-8080}"
case "$PORT" in ''|*[!0-9]*) echo "GATEWAY_HOST_PORT 형식 오류" >&2; exit 2 ;; esac
B="http://127.0.0.1:${PORT}"

mkdir -p "$EVIDENCE_DIR"
OUT="$EVIDENCE_DIR/verify-$(date -u +%Y%m%dT%H%M%SZ)-$$.txt"
exec > >(tee "$OUT") 2>&1

FAIL=0
fail() { echo "FAIL  $*"; FAIL=1; }
pass() { echo "PASS  $*"; }
# rc: 필수 명령. 명령/실제 종료코드/출력을 남기고, 비정상 종료면 실패로 집계. 출력은 LAST 에 보관.
LAST=""
rc() {
  echo "\$ $*"
  LAST="$("$@" 2>&1)"; local c=$?
  [ -n "$LAST" ] && printf '%s\n' "$LAST"
  echo "[exit=$c]"
  [ $c -eq 0 ] || fail "필수 명령 실패(exit=$c): $*"
  return $c
}
# 실패가 기대되는 명령(차단 확인용): 실패로 집계하지 않고 종료코드만 돌려줌
try() {
  echo "\$ $*"
  LAST="$("$@" 2>&1)"; local c=$?
  [ -n "$LAST" ] && printf '%s\n' "$LAST"
  echo "[exit=$c]"
  return $c
}
expect() { # expect <설명> <기대값> <실제값>
  if [ "$2" = "$3" ]; then pass "$1 ($3)"; else fail "$1 (기대 $2, 실제 ${3:-<빈 값>})"; fi
}
http_code() { $CURL -sS -m 10 -o /dev/null -w '%{http_code}' "$@" 2>/dev/null; }

gw_fetch() { # gateway 컨테이너(namespace 내부)에서 URL 요청 → 첫 줄만
  $DC exec -T gateway node -e 'fetch(process.argv[1],{signal:AbortSignal.timeout(8000)}).then(async r=>{const t=await r.text();if(process.argv[2]==="country"){try{console.log(JSON.parse(t).country||"none")}catch{console.log("none")}}else console.log("open")}).catch(()=>{console.log("blocked");process.exit(3)})' "$1" "${2:-}"
}
vpn_running() {
  rc $DC exec -T gluetun wget -qO- http://127.0.0.1:8000/v1/vpn/status || return 1
  case "$LAST" in *'"status":"running"'*) pass "gluetun VPN status running"; return 0 ;; esac
  fail "gluetun VPN status 가 running 아님: $LAST"; return 1
}
egress_us() { # $1 = 라벨
  local ok=0
  try gw_fetch https://ipinfo.io/json country
  local gc; gc="$(printf '%s' "$LAST" | tr -d '\r' | tail -n1)"
  expect "$1 gateway egress country" US "$gc"
  [ "$gc" = US ] || ok=1
  try $DC exec -T browser curl -s -m 10 https://ipinfo.io/country
  local bc; bc="$(printf '%s' "$LAST" | tr -d '\r\n ')"
  expect "$1 browser egress country" US "$bc"
  [ "$bc" = US ] || ok=1
  return $ok
}
gluetun_health() { $DC ps gluetun --format '{{.Health}}' 2>/dev/null | tr -d '\r' | tail -n1; }

TUN_DOWN=0
RECOVERED=0
recover() {
  [ "$TUN_DOWN" = 1 ] || return 0
  [ "$RECOVERED" = 1 ] && return 0
  RECOVERED=1
  echo "## 복구"
  try $DC exec -T gluetun ip link set tun0 up
  local h="" i=0
  while [ $i -lt "$RECOVER_WAIT_SEC" ]; do
    h="$(gluetun_health)"; [ "$h" = healthy ] && break
    sleep 2; i=$((i + 2))
  done
  if [ "$h" != healthy ]; then
    echo "gluetun 이 healthy 로 돌아오지 않아 스택 재시작"
    try $DC restart gluetun browser gateway
    i=0
    while [ $i -lt "$RECOVER_WAIT_SEC" ]; do
      h="$(gluetun_health)"; [ "$h" = healthy ] && break
      sleep 2; i=$((i + 2))
    done
  fi
  expect "복구 후 gluetun health" healthy "$h"
  # gluetun 재연결 뒤 같은 namespace 의 browser/gateway 네트워크도 다시 붙인다
  try $DC restart browser gateway
  vpn_running
  egress_us "복구 후"
}
on_exit() {
  local code=$?
  recover
  if [ $FAIL -eq 0 ] && [ $code -eq 0 ]; then echo "RESULT: 자동 검사 PASS"; else echo "RESULT: 자동 검사 FAIL"; FAIL=1; fi
  echo "저장: $OUT"
  exit $FAIL
}
trap on_exit EXIT
trap 'echo "중단 신호 수신"; FAIL=1; exit 1' INT TERM HUP

echo "# shop-live verify ($MODE) $(date -u +%FT%TZ), gateway port $PORT"
rc $DC ps --format '{{.Service}} {{.State}} {{.Status}}'
rc $DC port gluetun 8080
expect "gateway 공개 주소" "127.0.0.1:$PORT" "$(printf '%s' "$LAST" | tr -d '\r' | tail -n1)"

echo "## 1. 내부 포트가 호스트에 열려 있지 않음"
for p in 4444 5900 7900 8000; do expect "host 127.0.0.1:$p 닫힘" 000 "$(http_code http://127.0.0.1:$p/)"; done

echo "## 2. 미인증 접근 거부"
expect "GET /api/status" 401 "$(http_code $B/api/status)"
expect "GET /novnc/vnc.html" 401 "$(http_code $B/novnc/vnc.html)"
expect "POST /api/navigate" 401 "$(http_code -X POST -H "Origin: $B" -H 'content-type: application/json' -d '{"brandId":"roatti"}' $B/api/navigate)"
expect "WS /novnc/websockify" 401 "$(http_code -H "Origin: $B" -H 'Upgrade: websocket' -H 'Connection: Upgrade' -H 'Sec-WebSocket-Version: 13' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' $B/novnc/websockify)"

echo "## 3. VPN running 및 미국 egress (gateway·browser 각각, 같은 namespace)"
VPN_OK=0; vpn_running || VPN_OK=1
US_OK=0; egress_us "" || US_OK=1

if [ "$MODE" = killswitch ]; then
  echo "## 4. VPN 단절 시 egress 차단"
  PRE=0
  [ $VPN_OK -eq 0 ] || { fail "VPN running 미확인 → 파괴적 단계 생략"; PRE=1; }
  [ $US_OK -eq 0 ] || { fail "미국 egress 미확인 → 파괴적 단계 생략"; PRE=1; }
  if [ $PRE -eq 0 ]; then rc $DC exec -T gluetun ip link show tun0 || { fail "tun0 없음 → 파괴적 단계 생략"; PRE=1; }; fi
  if [ $PRE -eq 0 ]; then
    try $DC exec -T browser curl -s -m 10 -o /dev/null -w '%{http_code}' "$CONTROL_TARGET"
    pc="$(printf '%s' "$LAST" | tr -d '\r' | tail -c 3)"
    if [ -n "$pc" ] && [ "$pc" != 000 ]; then pass "양성 대조: 끊기 전 browser→$CONTROL_TARGET 도달 (http $pc)"; else fail "양성 대조 실패: 끊기 전에도 $CONTROL_TARGET 미도달 → 차단 판정 불가"; PRE=1; fi
  fi
  if [ $PRE -eq 0 ]; then
    TUN_DOWN=1
    if rc $DC exec -T gluetun ip link set tun0 down; then
      try $DC exec -T gluetun ip link show tun0
      case "$LAST" in *"state UP"*|*",UP"*) fail "tun0 가 여전히 UP" ;; *) pass "tun0 down 확인" ;; esac
      try $DC exec -T browser curl -s -m 8 -o /dev/null -w '%{http_code}' "$CONTROL_TARGET"; c=$?
      nc="$(printf '%s' "$LAST" | tr -d '\r' | tail -c 3)"
      if [ $c -ne 0 ] && { [ -z "$nc" ] || [ "$nc" = 000 ]; }; then pass "tun0 down 동안 browser→$CONTROL_TARGET 차단 (exit=$c)"; else fail "tun0 down 인데 browser 외부 요청 도달 (exit=$c, http=$nc)"; fi
      try gw_fetch "$CONTROL_TARGET"; c=$?
      if [ $c -ne 0 ]; then pass "tun0 down 동안 gateway→$CONTROL_TARGET 차단 (exit=$c)"; else fail "tun0 down 인데 gateway 외부 요청 도달"; fi
    fi
    recover
  fi
fi

echo "## 수동 확인 필요 (자동화하지 않음)"
echo "- HTTPS 주소에서 로그인 → 상태칩 VPN/미국 egress/브라우저/화면 스트림 확인"
echo "- 브랜드 이동 → TikTok 상품 페이지 실제 로드, 마우스 클릭/스크롤, 보안 퍼즐 직접 처리"
echo "- 로그아웃 후 /, /api/status, /novnc/vnc.html 접근 차단 및 열려 있던 화면 연결이 끊기는지"

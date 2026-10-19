#!/usr/bin/env bash
# verify-deploy.sh 회귀검사용 가짜 "docker compose". 상태는 $FAKE_DIR, 시나리오는 FAKE_* 환경변수.
D="$FAKE_DIR"; echo "$*" >> "$D/calls"
st() { cat "$D/tun" 2>/dev/null || echo up; }
last="${!#}"
case "$*" in
  "ps --format"*) [ -n "${FAKE_PS_FAIL:-}" ] && { echo "cannot connect" >&2; exit 1; }; echo "gluetun running Up"; exit 0 ;;
  "ps gluetun --format"*)
    if [ "${FAKE_RECOVER:-healthy}" = unhealthy ] && [ -f "$D/was_down" ]; then echo unhealthy; else echo healthy; fi; exit 0 ;;
  "port gluetun 8080") echo "127.0.0.1:${FAKE_PORT:-8080}"; exit 0 ;;
  "exec -T gluetun wget"*) echo "{\"status\":\"${FAKE_VPN:-running}\"}"; exit 0 ;;
  "exec -T gluetun ip link show tun0")
    [ "${FAKE_TUN:-present}" = absent ] && { echo 'Device "tun0" does not exist.'; exit 1; }
    if [ "$(st)" = up ]; then echo "5: tun0: <POINTOPOINT,UP,LOWER_UP> mtu 1500 state UNKNOWN"; else echo "5: tun0: <POINTOPOINT> mtu 1500 state DOWN"; fi; exit 0 ;;
  "exec -T gluetun ip link set tun0 down")
    [ -n "${FAKE_DOWN_FAIL:-}" ] && { echo "RTNETLINK answers: Operation not permitted"; exit 2; }
    echo down > "$D/tun"; touch "$D/was_down"; exit 0 ;;
  "exec -T gluetun ip link set tun0 up") echo up > "$D/tun"; exit 0 ;;
  "restart"*) [ "${FAKE_RECOVER:-healthy}" = healthy ] && echo up > "$D/tun"; exit 0 ;;
  "exec -T gateway node -e"*)
    url="${@: -2:1}"; [ "$last" != country ] && url="$last"
    if [ "$(st)" = down ] && [ -z "${FAKE_LEAK:-}" ]; then echo blocked; exit 3; fi
    case "$url" in *ipinfo*) echo "${FAKE_COUNTRY:-US}" ;; *) echo open ;; esac; exit 0 ;;
  "exec -T browser curl"*)
    [ "$(st)" = down ] && [ -n "${FAKE_SLOW_DOWN:-}" ] && { touch "$D/in_down_check"; sleep 3; }
    if [ "$(st)" = down ] && [ -z "${FAKE_LEAK:-}" ]; then printf 000; exit 28; fi
    case "$last" in
      *ipinfo*) echo "${FAKE_COUNTRY:-US}"; exit 0 ;;
      *) [ -n "${FAKE_NO_CONTROL:-}" ] && { printf 000; exit 28; }; printf 403; exit 0 ;;
    esac ;;
esac
echo "fake-dc: unhandled: $*" >&2; exit 99

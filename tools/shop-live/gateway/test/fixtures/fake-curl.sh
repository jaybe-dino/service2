#!/usr/bin/env bash
# 호스트 curl 대체: 내부 포트는 닫힘, FAKE_PORT 의 gateway 만 401
url="${!#}"; echo "$url" >> "$FAKE_DIR/curl_urls"
case "$url" in
  *127.0.0.1:${FAKE_PORT:-8080}/*) printf 401; exit 0 ;;
  *) printf 000; exit 7 ;;
esac

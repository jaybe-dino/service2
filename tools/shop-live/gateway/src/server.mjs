// 엔트리포인트: 환경변수 → 구성 → 서버 기동. 비밀값은 로그에 남기지 않는다.
import { createAuth } from "./auth.mjs";
import { loadAllowlist } from "./brands.mjs";
import { createBrowserController } from "./webdriver.mjs";
import { createStatusProbe } from "./status.mjs";
import { createApp } from "./app.mjs";

const env = process.env;

function fail(msg) {
  console.error("[shop-live] 설정 오류: " + msg);
  process.exit(1);
}

function normalizeOrigin(raw) {
  if (!raw) return null;
  let u;
  try {
    u = new URL(raw);
  } catch {
    fail("PUBLIC_ORIGIN 형식 오류");
  }
  if (u.protocol !== "https:" || u.pathname !== "/" || u.search || u.hash || u.username) fail("PUBLIC_ORIGIN 은 https://host[:port] 형식이어야 합니다.");
  return u.origin;
}

let auth;
try {
  auth = createAuth({
    token: env.GATEWAY_ACCESS_TOKEN || "",
    cookieSecure: env.COOKIE_SECURE !== "false",
    sessionTtlMs: Math.max(1, Number(env.SESSION_TTL_HOURS || 12)) * 3600 * 1000,
  });
} catch (e) {
  fail(e.message);
}

const allowlist = loadAllowlist(env.BRANDS_DATA_PATH || "/data/data.json");
if (allowlist.size === 0) fail("허용 브랜드가 0개입니다 (data.json 확인).");

const browser = createBrowserController({ seleniumUrl: env.SELENIUM_URL || "http://127.0.0.1:4444" });
const status = createStatusProbe({
  gluetunControlUrl: env.GLUETUN_CONTROL_URL || "http://127.0.0.1:8000",
  egressCheckUrl: env.EGRESS_CHECK_URL || "https://ipinfo.io/json",
  browser,
});

const server = createApp({
  auth,
  allowlist,
  browser,
  status,
  novncUpstream: { host: env.NOVNC_HOST || "127.0.0.1", port: Number(env.NOVNC_PORT || 7900) },
  publicOrigin: normalizeOrigin(env.PUBLIC_ORIGIN),
});

const port = Number(env.GATEWAY_PORT || 8080);
const host = env.GATEWAY_BIND || "0.0.0.0";
server.listen(port, host, () => {
  console.log(`[shop-live] gateway listening ${host}:${port}, brands=${[...allowlist.keys()].join(",")}`);
});

for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => server.close(() => process.exit(0)));

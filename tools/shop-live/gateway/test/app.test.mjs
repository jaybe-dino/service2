// 통합 테스트: 실제 HTTP 서버 + 가짜 Selenium(WebDriver) + 가짜 noVNC 업스트림.
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { createApp } from "../src/app.mjs";
import { createAuth } from "../src/auth.mjs";
import { loadAllowlist } from "../src/brands.mjs";
import { createBrowserController } from "../src/webdriver.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "shop-viewer", "data.json");
const TOKEN = "x".repeat(48);

function listen(server) {
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server.address().port)));
}

// 가짜 Selenium: 세션 1개, /url 요청 기록, 이동 지연
function fakeSelenium() {
  const state = { sessions: 0, urls: [], delayMs: 200 };
  const srv = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const j = (code, v) => {
        res.writeHead(code, { "content-type": "application/json" });
        res.end(JSON.stringify({ value: v }));
      };
      if (req.url === "/status") return j(200, { ready: state.sessions === 0, nodes: [] });
      if (req.method === "POST" && req.url === "/session") {
        state.sessions++;
        return j(200, { sessionId: "s" + state.sessions, capabilities: {} });
      }
      const m = req.url.match(/^\/session\/([^/]+)\/url$/);
      if (m && req.method === "GET") return j(200, "about:blank");
      if (m && req.method === "POST") {
        state.urls.push(JSON.parse(body).url);
        return setTimeout(() => j(200, null), state.delayMs);
      }
      j(404, { error: "unknown command" });
    });
  });
  return { srv, state };
}

// 가짜 noVNC: 정적 파일 + 웹소켓 업그레이드 요청 헤더 기록
function fakeNovnc() {
  const seen = [];
  const srv = http.createServer((req, res) => {
    seen.push({ url: req.url, headers: req.headers });
    res.writeHead(200, { "content-type": "text/html", "set-cookie": "leak=1" });
    res.end("<html>noVNC</html>");
  });
  srv.on("upgrade", (req, socket) => {
    seen.push({ url: req.url, headers: req.headers, ws: true });
    socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n");
    socket.on("data", (d) => socket.write(d)); // echo
    socket.on("end", () => socket.destroy());
    socket.on("error", () => {});
  });
  return { srv, seen };
}

async function setup({ ready = true } = {}) {
  const sel = fakeSelenium();
  const selPort = await listen(sel.srv);
  const nv = fakeNovnc();
  const nvPort = await listen(nv.srv);
  const browser = createBrowserController({ seleniumUrl: `http://127.0.0.1:${selPort}` });
  const status = { ready, snapshot: async () => ({ ready: status.ready, vpn: { running: status.ready }, egress: { verified: status.ready } }) };
  const app = createApp({
    auth: createAuth({ token: TOKEN, cookieSecure: false }),
    allowlist: loadAllowlist(DATA),
    browser,
    status,
    novncUpstream: { host: "127.0.0.1", port: nvPort },
    publicOrigin: null,
    logger: { error() {} },
  });
  const port = await listen(app);
  const base = `http://127.0.0.1:${port}`;
  return {
    base, port, sel, nv, status,
    close: () => Promise.all([app, sel.srv, nv.srv].map((s) => new Promise((r) => { s.closeAllConnections?.(); s.close(r); }))),
  };
}

async function login(base, token = TOKEN, origin = base) {
  const headers = { "content-type": "application/x-www-form-urlencoded" };
  if (origin) headers.origin = origin;
  const r = await fetch(base + "/login", { method: "POST", headers, body: new URLSearchParams({ token }), redirect: "manual" });
  const sc = r.headers.get("set-cookie");
  return { status: r.status, location: r.headers.get("location"), cookie: sc ? sc.split(";")[0] : null };
}

function rawUpgrade(port, headers) {
  return new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1", () => {
      let req = "GET /novnc/websockify HTTP/1.1\r\nHost: 127.0.0.1:" + port + "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n";
      for (const [k, v] of Object.entries(headers)) req += `${k}: ${v}\r\n`;
      s.write(req + "\r\n");
    });
    let buf = "";
    s.on("data", (d) => {
      buf += d.toString();
      if (buf.includes("\r\n\r\n") && !s.sentPing) {
        if (buf.startsWith("HTTP/1.1 101")) {
          s.sentPing = true;
          s.write("PING");
          return;
        }
        s.destroy();
        resolve({ head: buf });
      } else if (s.sentPing && buf.endsWith("PING")) {
        s.destroy();
        resolve({ head: buf, echoed: true });
      }
    });
    s.on("error", () => resolve({ head: buf }));
    s.on("close", () => resolve({ head: buf }));
  });
}

test("미인증 접근 거부: 페이지/API/noVNC/웹소켓", async (t) => {
  const e = await setup();
  t.after(e.close);
  let r = await fetch(e.base + "/", { redirect: "manual" });
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), "/login");
  for (const p of ["/api/status", "/api/brands", "/novnc/vnc.html", "/novnc/core/rfb.js"]) {
    r = await fetch(e.base + p);
    assert.equal(r.status, 401, p);
  }
  r = await fetch(e.base + "/api/navigate", { method: "POST", headers: { origin: e.base, "content-type": "application/json" }, body: '{"brandId":"roatti"}' });
  assert.equal(r.status, 401);
  const ws = await rawUpgrade(e.port, { Origin: e.base });
  assert.match(ws.head, /^HTTP\/1.1 401/);
  assert.equal(e.nv.seen.length, 0, "업스트림에 도달하면 안 됨");
  assert.equal(e.sel.state.urls.length, 0);
});

test("로그인: 틀린 토큰/Origin 없음/외부 Origin 거부, 올바르면 쿠키 발급", async (t) => {
  const e = await setup();
  t.after(e.close);
  let r = await login(e.base, "wrong-token");
  assert.equal(r.status, 303);
  assert.equal(r.location, "/login?e=1");
  assert.equal(r.cookie, null);
  r = await login(e.base, TOKEN, null);
  assert.equal(r.status, 403);
  r = await login(e.base, TOKEN, "https://evil.example");
  assert.equal(r.status, 403);
  r = await login(e.base);
  assert.equal(r.status, 303);
  assert.ok(r.cookie);
  const page = await fetch(e.base + "/", { headers: { cookie: r.cookie } });
  assert.equal(page.status, 200);
  assert.match(page.headers.get("content-security-policy"), /frame-ancestors 'self'/);
  // no-referrer 면 브라우저가 POST Origin 을 "null" 로 보내 로그인/이동이 막힌다(실브라우저에서 확인된 회귀)
  assert.equal(page.headers.get("referrer-policy"), "same-origin");
  assert.equal((await login(e.base, TOKEN, "null")).status, 403);
  assert.match(await page.text(), /\/novnc\/|viewer\.js/);
  // 토큰이 페이지/스크립트에 노출되지 않음
  const js = await (await fetch(e.base + "/viewer.js", { headers: { cookie: r.cookie } })).text();
  assert.equal(js.includes(TOKEN), false);
});

test("이동: 허용 brandId 만, data.json 의 URL 로만 이동", async (t) => {
  const e = await setup();
  t.after(e.close);
  const { cookie } = await login(e.base);
  const nav = (body, extra = {}) =>
    fetch(e.base + "/api/navigate", { method: "POST", headers: { cookie, origin: e.base, "content-type": "application/json", ...extra }, body });

  assert.equal((await nav('{"brandId":"verries"}')).status, 400, "태국 제외");
  assert.equal((await nav('{"brandId":"nope"}')).status, 400);
  assert.equal((await nav('{"url":"http://127.0.0.1:4444/status"}')).status, 400, "임의 URL 불가");
  assert.equal((await nav('{"brandId":"__proto__"}')).status, 400);
  assert.equal((await nav('{"brandId":"constructor"}')).status, 400);
  assert.equal((await nav("not json")).status, 400);
  assert.equal((await nav('{"brandId":"roatti"}', { origin: "https://evil.example" })).status, 403);
  assert.equal((await nav('{"brandId":"roatti"}', { "content-type": "text/plain" })).status, 415);
  assert.equal(e.sel.state.urls.length, 0);

  const ok = await nav('{"brandId":"roatti","url":"https://evil.example"}');
  assert.equal(ok.status, 200);
  assert.deepEqual(e.sel.state.urls, ["https://shop.tiktok.com/us/pdp/1732702812517667590"]);

  const brands = await (await fetch(e.base + "/api/brands", { headers: { cookie } })).json();
  assert.equal(brands.brands.length, 8);
  assert.equal(JSON.stringify(brands).includes("http"), false, "URL 은 클라이언트에 줄 필요 없음");
});

test("이동: 미준비(VPN/미국 egress 미확인) 상태면 503, 브라우저 미조작", async (t) => {
  const e = await setup({ ready: false });
  t.after(e.close);
  const { cookie } = await login(e.base);
  const r = await fetch(e.base + "/api/navigate", { method: "POST", headers: { cookie, origin: e.base, "content-type": "application/json" }, body: '{"brandId":"fau"}' });
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error, "not_ready");
  assert.equal(e.sel.state.urls.length, 0);
  assert.equal(e.sel.state.sessions, 0);
});

test("동시 이동 경합: 하나만 수행, 나머지 409, 세션 1개 재사용", async (t) => {
  const e = await setup();
  t.after(e.close);
  e.sel.state.delayMs = 400;
  const { cookie } = await login(e.base);
  const nav = (id) => fetch(e.base + "/api/navigate", { method: "POST", headers: { cookie, origin: e.base, "content-type": "application/json" }, body: JSON.stringify({ brandId: id }) });
  const codes = (await Promise.all([nav("roatti"), nav("fau"), nav("abso")])).map((r) => r.status).sort();
  assert.deepEqual(codes, [200, 409, 409]);
  assert.equal((await nav("peeven")).status, 200);
  assert.equal(e.sel.state.sessions, 1, "세션 재사용");
  assert.equal(e.sel.state.urls.length, 2);
});

test("noVNC 프록시: 인증 시 정적 파일 전달, 쿠키 미전달·업스트림 Set-Cookie 차단", async (t) => {
  const e = await setup();
  t.after(e.close);
  const { cookie } = await login(e.base);
  const r = await fetch(e.base + "/novnc/vnc.html?autoconnect=1", { headers: { cookie } });
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "<html>noVNC</html>");
  assert.equal(r.headers.get("set-cookie"), null);
  assert.equal(e.nv.seen[0].url, "/vnc.html?autoconnect=1");
  assert.equal(e.nv.seen[0].headers.cookie, undefined);
  const post = await fetch(e.base + "/novnc/vnc.html", { method: "POST", headers: { cookie } });
  assert.equal(post.status, 404);
});

test("웹소켓: 인증+같은 Origin 이면 업스트림 연결, 외부 Origin/Origin 없음 거부", async (t) => {
  const e = await setup();
  t.after(e.close);
  const { cookie } = await login(e.base);
  let ws = await rawUpgrade(e.port, { Cookie: cookie, Origin: "https://evil.example" });
  assert.match(ws.head, /^HTTP\/1.1 403/);
  ws = await rawUpgrade(e.port, { Cookie: cookie });
  assert.match(ws.head, /^HTTP\/1.1 403/);
  assert.equal(e.nv.seen.length, 0);
  ws = await rawUpgrade(e.port, { Cookie: cookie, Origin: e.base });
  assert.match(ws.head, /^HTTP\/1.1 101/);
  assert.equal(ws.echoed, true);
  const up = e.nv.seen.find((s) => s.ws);
  assert.equal(up.url, "/websockify");
  assert.equal(up.headers.cookie, undefined);
  assert.equal(up.headers.origin, undefined);
});

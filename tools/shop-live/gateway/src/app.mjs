// HTTP/WebSocket 게이트웨이.
// - /login, /logout           : 접근 토큰 로그인/로그아웃
// - /                         : 뷰어(인증 필요)
// - /api/status, /api/brands  : 상태/허용 브랜드(인증 필요)
// - /api/navigate             : 허용 brandId 로만 이동(인증 + Origin + JSON)
// - /novnc/*                  : Selenium 내장 noVNC 정적 파일 프록시(인증 필요, GET/HEAD)
// - /novnc/websockify (WS)    : noVNC 웹소켓 프록시(인증 + Origin)
import http from "node:http";
import net from "node:net";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { BusyError } from "./webdriver.mjs";

const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const STATIC = {
  "/": ["viewer.html", "text/html; charset=utf-8"],
  "/viewer.js": ["viewer.js", "text/javascript; charset=utf-8"],
  "/viewer.css": ["viewer.css", "text/css; charset=utf-8"],
  "/login": ["login.html", "text/html; charset=utf-8"],
};

const BASE_HEADERS = {
  "x-content-type-options": "nosniff",
  // no-referrer 이면 Chrome 이 폼/fetch POST 의 Origin 을 "null" 로 보내 same-origin 검사가 실패한다.
  "referrer-policy": "same-origin",
  "cache-control": "no-store",
  "x-frame-options": "SAMEORIGIN",
};
const PAGE_CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; form-action 'self'; base-uri 'none'; object-src 'none'";

export function createApp({ auth, allowlist, browser, status, novncUpstream, publicOrigin, logger = console, streamCheckMs = 2000 }) {
  const files = {};
  for (const [route, [file, type]] of Object.entries(STATIC)) {
    files[route] = { body: readFileSync(join(PUBLIC_DIR, file)), type };
  }
  let streamConnections = 0;
  // 열린 원격 제어(WS) 연결: 로그인 세션이 만료/로그아웃되면 streamCheckMs 안에 끊는다.
  const streams = new Set(); // {sid, close}
  function closeStreams(pred) {
    for (const st of [...streams]) if (pred(st)) st.close();
  }
  const sweep = setInterval(() => closeStreams((st) => !auth.isSessionValid(st.sid)), streamCheckMs);
  sweep.unref();

  function send(res, code, body, type = "application/json; charset=utf-8", extra = {}) {
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
    res.writeHead(code, { ...BASE_HEADERS, "content-type": type, "content-length": buf.length, ...extra });
    res.end(buf);
  }

  // 같은 출처 요청인지 확인. PUBLIC_ORIGIN 이 설정되면 그것만, 아니면 Host 기반 http(s) 출처를 허용.
  function originAllowed(req) {
    const origin = req.headers.origin;
    if (typeof origin !== "string") return false;
    if (publicOrigin) return origin === publicOrigin;
    const host = req.headers.host;
    return !!host && (origin === `http://${host}` || origin === `https://${host}`);
  }

  function readBody(req, limit = 4096) {
    return new Promise((resolve, reject) => {
      let size = 0;
      const chunks = [];
      req.on("data", (c) => {
        size += c.length;
        if (size > limit) {
          reject(new Error("too large"));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });
  }

  function proxyNovncHttp(req, res, upstreamPath) {
    const up = http.request(
      { host: novncUpstream.host, port: novncUpstream.port, method: req.method, path: upstreamPath, headers: { accept: req.headers.accept || "*/*" }, timeout: 15000 },
      (ur) => {
        const headers = { ...BASE_HEADERS, "content-security-policy": "frame-ancestors 'self'" };
        for (const h of ["content-type", "content-length", "last-modified", "etag"]) if (ur.headers[h]) headers[h] = ur.headers[h];
        res.writeHead(ur.statusCode || 502, headers);
        ur.pipe(res);
      },
    );
    up.on("timeout", () => up.destroy(new Error("timeout")));
    up.on("error", () => {
      if (!res.headersSent) send(res, 502, { error: "novnc_unreachable" });
      else res.destroy();
    });
    up.end();
  }

  function parseUrl(raw) {
    try {
      return new URL(raw, "http://gateway.invalid");
    } catch {
      return null;
    }
  }

  async function handle(req, res) {
    const url = parseUrl(req.url);
    if (!url) return send(res, 400, { error: "bad_url" });
    const path = url.pathname;
    const authed = auth.isAuthenticated(req.headers.cookie);

    if (path === "/healthz") return send(res, 200, { ok: true }); // 내용 없는 liveness

    if (path === "/login") {
      if (req.method === "GET") return send(res, 200, files["/login"].body, files["/login"].type, { "content-security-policy": PAGE_CSP });
      if (req.method !== "POST") return send(res, 405, { error: "method" });
      if (!originAllowed(req)) return send(res, 403, { error: "origin" });
      let body;
      try {
        body = await readBody(req);
      } catch {
        return send(res, 413, { error: "too_large" });
      }
      const token = new URLSearchParams(body).get("token") || "";
      const r = auth.login(token);
      if (!r.ok) {
        if (r.locked) return send(res, 429, "로그인 시도 제한(15분)", "text/plain; charset=utf-8");
        return send(res, 303, "", "text/plain", { location: "/login?e=1" });
      }
      return send(res, 303, "", "text/plain", { location: "/", "set-cookie": r.setCookie });
    }

    if (path === "/logout" && req.method === "POST") {
      if (!originAllowed(req)) return send(res, 403, { error: "origin" });
      const sid = auth.sessionId(req.headers.cookie);
      const cleared = auth.logout(req.headers.cookie);
      if (sid) closeStreams((st) => st.sid === sid);
      return send(res, 303, "", "text/plain", { location: "/login", "set-cookie": cleared });
    }

    // 로그인 화면 스타일은 비밀이 아니므로 인증 없이 제공
    if (path === "/viewer.css" && req.method === "GET") {
      return send(res, 200, files[path].body, files[path].type);
    }

    if (!authed) {
      if (req.method === "GET" && (path === "/" || path === "/viewer.js")) {
        return send(res, 303, "", "text/plain", { location: "/login" });
      }
      return send(res, 401, { error: "unauthorized" });
    }

    if (files[path] && req.method === "GET") {
      return send(res, 200, files[path].body, files[path].type, { "content-security-policy": PAGE_CSP });
    }

    if (path === "/api/brands" && req.method === "GET") {
      return send(res, 200, { brands: [...allowlist.values()].map((b) => ({ id: b.id, name: b.name, company: b.company })) });
    }

    if (path === "/api/status" && req.method === "GET") {
      const snap = await status.snapshot({ forceEgress: url.searchParams.get("recheck") === "1", streamConnections });
      return send(res, 200, snap);
    }

    if (path === "/api/navigate") {
      if (req.method !== "POST") return send(res, 405, { error: "method" });
      if (!originAllowed(req)) return send(res, 403, { error: "origin" });
      if (!String(req.headers["content-type"] || "").startsWith("application/json")) return send(res, 415, { error: "content_type" });
      let payload;
      try {
        payload = JSON.parse(await readBody(req, 1024));
      } catch {
        return send(res, 400, { error: "bad_json" });
      }
      const brandId = payload && payload.brandId;
      const brand = typeof brandId === "string" ? allowlist.get(brandId) : undefined;
      if (!brand) return send(res, 400, { error: "unknown_brand" });
      if (browser.busy) return send(res, 409, { error: "busy" });
      // fail-closed: VPN running + 미국 egress 확인 + Selenium 응답이 모두 확인돼야 이동
      const snap = await status.snapshot({ streamConnections });
      if (!snap.ready) return send(res, 503, { error: "not_ready", status: snap });
      try {
        const nav = await browser.navigate(brand);
        return send(res, nav.ok ? 200 : 502, { navigation: nav });
      } catch (e) {
        if (e instanceof BusyError) return send(res, 409, { error: "busy" });
        throw e;
      }
    }

    if (path.startsWith("/novnc/") && (req.method === "GET" || req.method === "HEAD")) {
      const sub = path.slice("/novnc".length);
      if (sub.includes("..") || sub.includes("\\")) return send(res, 400, { error: "path" });
      return proxyNovncHttp(req, res, sub + url.search);
    }

    return send(res, 404, { error: "not_found" });
  }

  function handleUpgrade(req, socket, head) {
    const reject = (code, text) => {
      socket.end(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
    };
    socket.on("error", () => socket.destroy());
    const url = parseUrl(req.url);
    if (!url) return reject(400, "Bad Request");
    if (url.pathname !== "/novnc/websockify") return reject(404, "Not Found");
    const sid = auth.sessionId(req.headers.cookie);
    if (!sid) return reject(401, "Unauthorized");
    if (!originAllowed(req)) return reject(403, "Forbidden");

    const up = net.connect(novncUpstream.port, novncUpstream.host);
    let connected = false;
    let counted = false;
    const entry = { sid, close: () => done() };
    streams.add(entry);
    const done = () => {
      streams.delete(entry);
      if (counted) {
        counted = false;
        streamConnections--;
      }
      up.destroy();
      socket.destroy();
    };
    up.on("connect", () => {
      connected = true;
      // 쿠키/Origin 은 업스트림에 넘기지 않는다.
      const skip = new Set(["cookie", "origin", "host"]);
      let raw = `GET /websockify HTTP/1.1\r\nHost: ${novncUpstream.host}:${novncUpstream.port}\r\n`;
      for (let i = 0; i < req.rawHeaders.length; i += 2) {
        if (!skip.has(req.rawHeaders[i].toLowerCase())) raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
      }
      up.write(raw + "\r\n");
      if (head && head.length) up.write(head);
      counted = true;
      streamConnections++;
      up.pipe(socket);
      socket.pipe(up);
    });
    up.on("error", () => {
      if (!connected) {
        streams.delete(entry);
        up.destroy();
        reject(502, "Bad Gateway");
      } else done();
    });
    // 한쪽이 끊기면(half-close 포함) 양쪽 모두 정리
    socket.on("error", done);
    socket.on("end", done);
    socket.on("close", done);
    up.on("end", done);
    up.on("close", () => connected && done());
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((e) => {
      logger.error("request error", e && e.message);
      if (!res.headersSent) send(res, 500, { error: "internal" });
      else res.destroy();
    });
  });
  server.on("upgrade", handleUpgrade);
  // 서버 종료 시 열린 WS 와 점검 타이머 정리
  const origClose = server.close.bind(server);
  server.close = (cb) => {
    clearInterval(sweep);
    closeStreams(() => true);
    return origClose(cb);
  };
  server.headersTimeout = 15000;
  server.requestTimeout = 120000;
  return server;
}

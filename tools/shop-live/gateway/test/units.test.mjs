import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { buildAllowlist, isAllowedProductUrl, loadAllowlist } from "../src/brands.mjs";
import { createAuth, COOKIE_NAME } from "../src/auth.mjs";
import { createStatusProbe } from "../src/status.mjs";

const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "shop-viewer", "data.json");
const TOKEN = "t".repeat(40);

test("실제 data.json 에서 미국 8개만 허용, 태국 제외", () => {
  const a = loadAllowlist(DATA);
  assert.deepEqual([...a.keys()].sort(), ["abso", "exomera", "fau", "goryo", "peeven", "returnu", "roatti", "wellderma"]);
  assert.equal(a.has("verries"), false);
  for (const b of a.values()) assert.match(b.productUrl, /^https:\/\/shop\.tiktok\.com\/us\/pdp\/\d+$/);
});

test("상품 URL 검증: 임의/변형 URL 거부", () => {
  assert.equal(isAllowedProductUrl("https://shop.tiktok.com/us/pdp/1732702812517667590"), true);
  for (const bad of [
    "http://shop.tiktok.com/us/pdp/1732702812517667590",
    "https://shop.tiktok.com.evil.com/us/pdp/1732702812517667590",
    "https://user@shop.tiktok.com/us/pdp/1732702812517667590",
    "https://shop.tiktok.com:8443/us/pdp/1732702812517667590",
    "https://shop.tiktok.com/us/pdp/1732702812517667590?x=1",
    "https://shop.tiktok.com/us/pdp/1732702812517667590#a",
    "https://shop.tiktok.com/th/pdp/1732702812517667590",
    "https://shop.tiktok.com/us/pdp/../../redirect",
    "https://127.0.0.1:4444/session",
    "javascript:alert(1)",
    null,
  ]) assert.equal(isAllowedProductUrl(bad), false, String(bad));
});

test("allowlist: 국가/ID/URL 이 하나라도 틀리면 제외", () => {
  const a = buildAllowlist({
    items: [
      { id: "ok", country: "미국", productUrl: "https://shop.tiktok.com/us/pdp/1732702812517667590", name: "OK" },
      { id: "th", country: "태국", productUrl: "https://shop.tiktok.com/us/pdp/1732702812517667590" },
      { id: "Bad Id", country: "미국", productUrl: "https://shop.tiktok.com/us/pdp/1732702812517667590" },
      { id: "nourl", country: "미국", productUrl: null },
      { id: "evil", country: "미국", productUrl: "https://evil.example/us/pdp/1732702812517667590" },
    ],
  });
  assert.deepEqual([...a.keys()], ["ok"]);
});

test("auth: 짧은 토큰이면 기동 거부", () => {
  assert.throws(() => createAuth({ token: "short" }));
  assert.throws(() => createAuth({ token: "" }));
});

test("auth: 틀린 토큰 거부, 맞으면 HttpOnly/Secure/SameSite=Strict 쿠키", () => {
  const auth = createAuth({ token: TOKEN });
  assert.equal(auth.login("wrong").ok, false);
  assert.equal(auth.login("").ok, false);
  const r = auth.login(TOKEN);
  assert.equal(r.ok, true);
  assert.match(r.setCookie, /HttpOnly/);
  assert.match(r.setCookie, /Secure/);
  assert.match(r.setCookie, /SameSite=Strict/);
  const cookie = r.setCookie.split(";")[0];
  assert.equal(auth.isAuthenticated(cookie), true);
  assert.equal(auth.isAuthenticated(`${COOKIE_NAME}=${"A".repeat(43)}`), false);
  assert.equal(auth.isAuthenticated(undefined), false);
  auth.logout(cookie);
  assert.equal(auth.isAuthenticated(cookie), false);
});

test("auth: 세션 만료", () => {
  let t = 1000;
  const auth = createAuth({ token: TOKEN, sessionTtlMs: 5000, now: () => t });
  const cookie = auth.login(TOKEN).setCookie.split(";")[0];
  assert.equal(auth.isAuthenticated(cookie), true);
  t += 6000;
  assert.equal(auth.isAuthenticated(cookie), false);
});

test("auth: 10회 실패 후 올바른 토큰도 15분간 잠금", () => {
  let t = 0;
  const auth = createAuth({ token: TOKEN, now: () => t });
  for (let i = 0; i < 10; i++) auth.login("nope");
  const r = auth.login(TOKEN);
  assert.equal(r.ok, false);
  assert.equal(r.locked, true);
  t += 16 * 60 * 1000;
  assert.equal(auth.login(TOKEN).ok, true);
});

function fakeFetch(routes) {
  return async (url) => {
    const h = routes[url];
    if (!h) throw new Error("connect ECONNREFUSED");
    const v = typeof h === "function" ? h() : h;
    if (v instanceof Error) throw v;
    return { ok: true, status: 200, json: async () => v };
  };
}
const fakeBrowser = (ok = true) => ({ seleniumReady: async () => ({ ok }), hasSession: false, busy: false, lastNavigation: null });

test("status: gluetun 응답 없음 → 미준비, egress 확인 생략", async () => {
  const p = createStatusProbe({ gluetunControlUrl: "http://g", egressCheckUrl: "http://ip", browser: fakeBrowser(), fetchImpl: fakeFetch({ "http://ip": { country: "US", ip: "1.2.3.4" } }) });
  const s = await p.snapshot();
  assert.equal(s.vpn.running, false);
  assert.equal(s.vpn.state, "unreachable");
  assert.equal(s.egress.verified, false);
  assert.equal(s.ready, false);
});

test("status: VPN running 이지만 egress 가 KR 이면 미검증", async () => {
  const p = createStatusProbe({ gluetunControlUrl: "http://g", egressCheckUrl: "http://ip", browser: fakeBrowser(), fetchImpl: fakeFetch({ "http://g/v1/vpn/status": { status: "running" }, "http://ip": { country: "KR", ip: "1.2.3.4" } }) });
  const s = await p.snapshot();
  assert.equal(s.vpn.running, true);
  assert.equal(s.egress.verified, false);
  assert.equal(s.egress.country, "KR");
  assert.equal(s.ready, false);
});

test("status: VPN running + US egress + selenium → ready, selenium 없으면 미준비", async () => {
  const routes = { "http://g/v1/vpn/status": { status: "running" }, "http://ip": { country: "US", ip: "9.9.9.9" } };
  const ok = await createStatusProbe({ gluetunControlUrl: "http://g", egressCheckUrl: "http://ip", browser: fakeBrowser(true), fetchImpl: fakeFetch(routes) }).snapshot();
  assert.equal(ok.egress.verified, true);
  assert.equal(ok.ready, true);
  const noSel = await createStatusProbe({ gluetunControlUrl: "http://g", egressCheckUrl: "http://ip", browser: fakeBrowser(false), fetchImpl: fakeFetch(routes) }).snapshot();
  assert.equal(noSel.ready, false);
});

test("status: VPN 이 stopped 로 바뀌면 이전 US 캐시를 쓰지 않음", async () => {
  let vpn = "running";
  const p = createStatusProbe({ gluetunControlUrl: "http://g", egressCheckUrl: "http://ip", browser: fakeBrowser(), fetchImpl: fakeFetch({ "http://g/v1/vpn/status": () => ({ status: vpn }), "http://ip": { country: "US", ip: "9.9.9.9" } }) });
  assert.equal((await p.snapshot()).ready, true);
  vpn = "stopped";
  const s = await p.snapshot();
  assert.equal(s.egress.verified, false);
  assert.equal(s.ready, false);
});

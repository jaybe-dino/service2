// scripts/verify-deploy.sh 의 실패 집계 회귀검사 (가짜 compose/curl, Docker 불필요)
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync, spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const SCRIPT = join(here, "..", "..", "scripts", "verify-deploy.sh");

function run(mode, fake = {}, envFilePort = "18080") {
  const dir = mkdtempSync(join(tmpdir(), "verify-"));
  const envFile = join(dir, "env");
  writeFileSync(envFile, `OPENVPN_USER=\nGATEWAY_HOST_PORT=${envFilePort}\n`);
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, DC: join(here, "fixtures", "fake-dc.sh"), CURL: join(here, "fixtures", "fake-curl.sh"),
    ENV_FILE: envFile, EVIDENCE_DIR: join(dir, "ev"), RECOVER_WAIT_SEC: "2", FAKE_DIR: dir, FAKE_PORT: "18080", ...fake };
  const r = spawnSync("bash", [SCRIPT, ...(mode ? [mode] : [])], { env, encoding: "utf8", timeout: 60000 });
  const calls = existsSync(join(dir, "calls")) ? readFileSync(join(dir, "calls"), "utf8") : "";
  const tun = existsSync(join(dir, "tun")) ? readFileSync(join(dir, "tun"), "utf8").trim() : "up";
  return { code: r.status, out: r.stdout + r.stderr, calls, tun, dir };
}
const downCalled = (r) => r.calls.includes("ip link set tun0 down");

test("정상: basic/killswitch 모두 0, .env 의 GATEWAY_HOST_PORT 사용, tun0 복구", () => {
  const b = run(null);
  assert.equal(b.code, 0, b.out);
  assert.match(readFileSync(join(b.dir, "curl_urls"), "utf8"), /127\.0\.0\.1:18080\/api\/status/);
  const k = run("killswitch");
  assert.equal(k.code, 0, k.out);
  assert.ok(downCalled(k));
  assert.match(k.out, /양성 대조: 끊기 전/);
  assert.match(k.out, /browser→http:\/\/1\.1\.1\.1 차단 \(exit=28\)/);
  assert.equal(k.tun, "up");
  assert.match(k.out, /\[exit=\d+\]/);
});

test(".env 포트를 무시하면 실패(다른 포트로 응답) → nonzero", () => {
  const r = run(null, { FAKE_PORT: "8080" }, "18080");
  assert.notEqual(r.code, 0);
});

const failing = {
  "필수 명령 실패(compose ps)": [null, { FAKE_PS_FAIL: "1" }],
  "VPN running 아님": [null, { FAKE_VPN: "stopped" }],
  "미국 egress 아님": [null, { FAKE_COUNTRY: "KR" }],
};
for (const [name, [mode, fake]] of Object.entries(failing)) {
  test(`실패 집계: ${name} → nonzero`, () => {
    const r = run(mode, fake);
    assert.notEqual(r.code, 0, r.out);
    assert.match(r.out, /RESULT: 자동 검사 FAIL/);
  });
}

const noDestructive = {
  "VPN running 아님": { FAKE_VPN: "stopped" },
  "미국 egress 아님": { FAKE_COUNTRY: "KR" },
  "tun0 없음": { FAKE_TUN: "absent" },
  "양성 대조 실패": { FAKE_NO_CONTROL: "1" },
};
for (const [name, fake] of Object.entries(noDestructive)) {
  test(`killswitch 전제 실패: ${name} → tun0 를 내리지 않고 nonzero`, () => {
    const r = run("killswitch", fake);
    assert.notEqual(r.code, 0, r.out);
    assert.equal(downCalled(r), false, "파괴적 단계 진행 금지");
  });
}

test("killswitch: tun0 down 명령 실패 → nonzero", () => {
  const r = run("killswitch", { FAKE_DOWN_FAIL: "1" });
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /필수 명령 실패\(exit=2\): .*ip link set tun0 down/);
});

test("killswitch: 끊었는데 외부 요청이 새면(누수) nonzero, 복구 시도", () => {
  const r = run("killswitch", { FAKE_LEAK: "1" });
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /tun0 down 인데 browser 외부 요청 도달/);
  assert.match(r.calls, /ip link set tun0 up/);
});

test("killswitch: 복구 후 unhealthy/미국 미확인 → nonzero, 스택 재시작 시도", () => {
  const r = run("killswitch", { FAKE_RECOVER: "unhealthy" });
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /복구 후 gluetun health \(기대 healthy, 실제 unhealthy\)/);
  assert.match(r.calls, /restart gluetun browser gateway/);
});

test("killswitch: tun0 를 내린 상태에서 중단(SIGTERM)돼도 trap 이 복구, nonzero", async () => {
  const dir = mkdtempSync(join(tmpdir(), "verify-"));
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, DC: join(here, "fixtures", "fake-dc.sh"), CURL: join(here, "fixtures", "fake-curl.sh"),
    ENV_FILE: join(dir, "none"), EVIDENCE_DIR: join(dir, "ev"), RECOVER_WAIT_SEC: "2", FAKE_DIR: dir, FAKE_SLOW_DOWN: "1" };
  const p = spawn("bash", [SCRIPT, "killswitch"], { env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  p.stdout.on("data", (d) => (out += d));
  p.stderr.on("data", (d) => (out += d));
  const done = new Promise((r) => p.on("close", (code) => r(code)));
  for (let i = 0; i < 100 && !existsSync(join(dir, "in_down_check")); i++) await new Promise((r) => setTimeout(r, 100));
  assert.ok(existsSync(join(dir, "in_down_check")), "tun0 down 단계 도달");
  p.kill("SIGTERM");
  const code = await done;
  assert.notEqual(code, 0, out);
  assert.match(out, /중단 신호 수신/);
  assert.equal(readFileSync(join(dir, "tun"), "utf8").trim(), "up", "trap 이 tun0 복구");
  assert.match(readFileSync(join(dir, "calls"), "utf8"), /ip link set tun0 up/);
});

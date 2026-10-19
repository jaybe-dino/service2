// 연결 상태: VPN(gluetun) / 미국 egress / Selenium 을 각각 실제로 확인하고, 확인 못 한 것은 미검증으로 둔다.
// 게이트웨이는 브라우저와 같은 network namespace(gluetun)에 있으므로, 여기서 본 공인 IP = 브라우저의 egress.

export function createStatusProbe({ gluetunControlUrl, egressCheckUrl, browser, fetchImpl = fetch, now = () => Date.now(), egressTtlMs = 60000 }) {
  let egressCache = null; // {at, result}

  async function getJson(url, timeoutMs) {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function vpnStatus() {
    try {
      const j = await getJson(gluetunControlUrl + "/v1/vpn/status", 4000);
      const s = j && typeof j.status === "string" ? j.status : "unknown";
      return { state: s, running: s === "running" };
    } catch (e) {
      return { state: "unreachable", running: false, error: String(e.message || e) };
    }
  }

  async function egress(force) {
    const t = now();
    if (!force && egressCache && t - egressCache.at < egressTtlMs) return egressCache.result;
    let result;
    try {
      const j = await getJson(egressCheckUrl, 8000);
      const country = j && typeof j.country === "string" ? j.country.toUpperCase() : null;
      result = {
        verified: country === "US",
        country,
        ip: j && typeof j.ip === "string" ? j.ip : null,
        checkedAt: new Date(t).toISOString(),
        error: country ? null : "국가 정보 없음",
      };
    } catch (e) {
      result = { verified: false, country: null, ip: null, checkedAt: new Date(t).toISOString(), error: String(e.message || e) };
    }
    egressCache = { at: t, result };
    return result;
  }

  return {
    async snapshot({ forceEgress = false, streamConnections = 0 } = {}) {
      const vpn = await vpnStatus();
      // VPN 이 running 이 아니면 egress 확인 결과를 신뢰하지 않는다(캐시도 버림).
      let eg;
      if (vpn.running) {
        eg = await egress(forceEgress);
      } else {
        egressCache = null;
        eg = { verified: false, country: null, ip: null, checkedAt: null, error: "VPN 미연결 — 확인 생략" };
      }
      const sel = await browser.seleniumReady();
      const ready = vpn.running && eg.verified && sel.ok;
      return {
        gateway: "ok",
        vpn: { state: vpn.state, running: vpn.running, error: vpn.error || null },
        egress: eg,
        browser: { seleniumReachable: sel.ok, sessionActive: browser.hasSession, navigating: browser.busy, lastNavigation: browser.lastNavigation },
        stream: { activeConnections: streamConnections },
        ready,
        checkedAt: new Date(now()).toISOString(),
      };
    },
  };
}

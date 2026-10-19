// Selenium standalone(W3C WebDriver) 최소 클라이언트.
// 브라우저 세션 1개만 만들어 재사용하고, 내비게이션은 직렬화(동시 요청은 409)한다.
// 클릭/스크롤/CAPTCHA 는 사용자가 noVNC 화면에서 직접 한다 — 여기서는 URL 이동만 한다.

export class BusyError extends Error {}

export function createBrowserController({ seleniumUrl, fetchImpl = fetch, pageLoadTimeoutMs = 45000 }) {
  let sessionId = null;
  let busy = false;
  let lastNavigation = null; // {brandId, at, ok, error}

  async function wd(method, path, body, timeoutMs = 20000) {
    const res = await fetchImpl(seleniumUrl + path, {
      method,
      headers: body ? { "content-type": "application/json; charset=utf-8" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { status: res.status, value: json ? json.value : null };
  }

  async function seleniumReady() {
    try {
      const r = await wd("GET", "/status", null, 5000);
      return { ok: r.status === 200 && !!(r.value && r.value.ready !== undefined), ready: !!(r.value && r.value.ready), value: r.value };
    } catch (e) {
      return { ok: false, ready: false, error: String(e && e.message ? e.message : e) };
    }
  }

  // 게이트웨이 재시작 등으로 세션 id 를 잃었을 때, 노드에 남아 있는 세션을 이어받는다.
  function existingSessionFromStatus(value) {
    const nodes = (value && value.nodes) || [];
    for (const n of nodes) {
      for (const s of n.slots || []) {
        if (s && s.session && s.session.sessionId) return s.session.sessionId;
      }
    }
    return null;
  }

  async function sessionAlive(id) {
    try {
      const r = await wd("GET", `/session/${encodeURIComponent(id)}/url`, null, 8000);
      return r.status === 200;
    } catch {
      return false;
    }
  }

  async function ensureSession() {
    if (sessionId && (await sessionAlive(sessionId))) return sessionId;
    sessionId = null;
    const st = await seleniumReady();
    const adopt = existingSessionFromStatus(st.value);
    if (adopt && (await sessionAlive(adopt))) {
      sessionId = adopt;
      return sessionId;
    }
    const r = await wd(
      "POST",
      "/session",
      {
        capabilities: {
          alwaysMatch: {
            browserName: "chrome",
            pageLoadStrategy: "eager",
            timeouts: { pageLoad: pageLoadTimeoutMs },
            "goog:chromeOptions": {
              // 화면에 보이는(headful) 실제 브라우저. 탐지 회피용 플래그는 넣지 않는다.
              args: ["--start-maximized", "--lang=en-US", "--no-first-run"],
            },
          },
        },
      },
      90000,
    );
    if (r.status !== 200 || !r.value || !r.value.sessionId) {
      throw new Error("브라우저 세션 생성 실패: " + JSON.stringify(r.value && r.value.message ? r.value.message : r.status).slice(0, 300));
    }
    sessionId = r.value.sessionId;
    return sessionId;
  }

  return {
    seleniumReady,
    get busy() {
      return busy;
    },
    get hasSession() {
      return !!sessionId;
    },
    get lastNavigation() {
      return lastNavigation;
    },
    // brand 는 반드시 허용 목록에서 꺼낸 객체여야 한다.
    async navigate(brand) {
      if (busy) throw new BusyError("다른 이동이 진행 중입니다.");
      busy = true;
      const at = new Date().toISOString();
      try {
        const id = await ensureSession();
        const r = await wd("POST", `/session/${encodeURIComponent(id)}/url`, { url: brand.productUrl }, pageLoadTimeoutMs + 15000);
        // pageLoad 타임아웃이어도 화면에는 로드 중인 페이지가 남아 있으므로 실패로만 기록한다.
        const ok = r.status === 200;
        lastNavigation = { brandId: brand.id, at, ok, error: ok ? null : (r.value && r.value.error) || `HTTP ${r.status}` };
        return lastNavigation;
      } catch (e) {
        lastNavigation = { brandId: brand.id, at, ok: false, error: String(e && e.message ? e.message : e).slice(0, 300) };
        return lastNavigation;
      } finally {
        busy = false;
      }
    },
  };
}

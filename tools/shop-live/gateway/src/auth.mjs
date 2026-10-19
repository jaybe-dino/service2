// 단일 사용자 인증: 서버 전용 접근 토큰(GATEWAY_ACCESS_TOKEN)으로 로그인 → HttpOnly 세션 쿠키.
// 토큰은 프론트엔드/URL 에 실리지 않고 로그인 폼 POST 본문으로만 받는다.
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "shoplive_sid";

function digest(s) {
  return createHash("sha256").update(String(s), "utf8").digest();
}

// 길이 차이를 노출하지 않도록 해시끼리 비교
export function tokenMatches(expected, given) {
  if (typeof given !== "string" || given.length === 0 || given.length > 512) return false;
  return timingSafeEqual(digest(expected), digest(given));
}

export function parseCookies(header) {
  const out = {};
  if (typeof header !== "string") return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k && !(k in out)) out[k] = v;
  }
  return out;
}

export function createAuth({ token, sessionTtlMs = 12 * 3600 * 1000, cookieSecure = true, now = () => Date.now() }) {
  if (typeof token !== "string" || token.length < 32) {
    throw new Error("GATEWAY_ACCESS_TOKEN 은 32자 이상이어야 합니다 (예: openssl rand -base64 36).");
  }
  const sessions = new Map(); // sid -> expiresAt

  // 전역 로그인 실패 제한(단일 사용자 → IP 위조와 무관하게 동작): 15분에 10회
  const FAIL_WINDOW_MS = 15 * 60 * 1000;
  const FAIL_MAX = 10;
  let failures = [];

  function prune() {
    const t = now();
    failures = failures.filter((x) => t - x < FAIL_WINDOW_MS);
    for (const [sid, exp] of sessions) if (exp <= t) sessions.delete(sid);
  }

  function cookieAttrs(maxAgeSec) {
    return `Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${cookieSecure ? "; Secure" : ""}`;
  }

  function isSessionValid(sid) {
    const exp = sessions.get(sid);
    if (!exp) return false;
    if (exp <= now()) {
      sessions.delete(sid);
      return false;
    }
    return true;
  }

  // 유효한 세션이면 세션 id(로그 금지), 아니면 null
  function sessionId(cookieHeader) {
    const sid = parseCookies(cookieHeader)[COOKIE_NAME];
    if (!sid || !/^[A-Za-z0-9_-]{43}$/.test(sid)) return null;
    return isSessionValid(sid) ? sid : null;
  }

  return {
    isLockedOut() {
      prune();
      return failures.length >= FAIL_MAX;
    },
    // 성공 시 Set-Cookie 값, 실패 시 null
    login(given) {
      prune();
      if (failures.length >= FAIL_MAX) return { ok: false, locked: true };
      if (!tokenMatches(token, given)) {
        failures.push(now());
        return { ok: false, locked: failures.length >= FAIL_MAX };
      }
      const sid = randomBytes(32).toString("base64url");
      sessions.set(sid, now() + sessionTtlMs);
      return { ok: true, setCookie: `${COOKIE_NAME}=${sid}; ${cookieAttrs(Math.floor(sessionTtlMs / 1000))}` };
    },
    logout(cookieHeader) {
      const sid = parseCookies(cookieHeader)[COOKIE_NAME];
      if (sid) sessions.delete(sid);
      return `${COOKIE_NAME}=; ${cookieAttrs(0)}`;
    },
    sessionId,
    isSessionValid,
    isAuthenticated(cookieHeader) {
      return sessionId(cookieHeader) !== null;
    },
  };
}

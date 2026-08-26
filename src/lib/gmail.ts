// Gmail 발송·열람 어댑터 — Google Workspace 서비스계정 + 도메인 전체 위임(DWD).
// 2-legged JWT(server-to-server): 서비스계정이 공용 메일함(cs@glovek.space 등)을 impersonate.
//   env: GOOGLE_SA_KEY_JSON = 서비스계정 키 JSON (raw JSON 또는 base64)
//   Workspace 관리 콘솔에서 해당 서비스계정 client_id 에 아래 scope 로 1회 도메인 위임 승인 필요:
//     발송: https://www.googleapis.com/auth/gmail.send
//     열람: https://www.googleapis.com/auth/gmail.readonly
// 앱 비밀번호/SMTP·사용자 OAuth 동의 불필요.
import crypto from "node:crypto";

const SCOPE_SEND = "https://www.googleapis.com/auth/gmail.send";
const SCOPE_READ = "https://www.googleapis.com/auth/gmail.readonly";

export interface OcSender { email: string; display_name?: string | null }
export interface GmailSendResult { ok: boolean; id?: string; error?: string }
export interface InboxMsg { id: string; threadId?: string; from: string; fromEmail: string; subject: string; date: string; snippet: string; body: string }

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface SaKey { client_email: string; private_key: string }
let saCache: SaKey | null | undefined;
function getSa(): SaKey | null {
  if (saCache !== undefined) return saCache;
  const raw = process.env.GOOGLE_SA_KEY_JSON;
  if (!raw) { saCache = null; return null; }
  let txt = raw.trim();
  if (!txt.startsWith("{")) { try { txt = Buffer.from(txt, "base64").toString("utf-8"); } catch { /* noop */ } }
  try {
    const j = JSON.parse(txt) as { client_email?: string; private_key?: string };
    if (j.client_email && j.private_key) { saCache = { client_email: j.client_email, private_key: j.private_key }; return saCache; }
  } catch { /* noop */ }
  saCache = null;
  return null;
}

/** 서비스계정 키가 준비되어 있는지 (모든 공용 메일함 공용) */
export function saConfigured(): boolean {
  return getSa() !== null;
}

/* ── JWT(2-legged) → access token, (subject,scope)별 캐시 ── */
const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const tokCache = new Map<string, { token: string; exp: number }>();

async function getAccessToken(subject: string, scope: string): Promise<string> {
  const sa = getSa();
  if (!sa) throw new Error("GOOGLE_SA_KEY_JSON 미설정");
  const key = `${subject}|${scope}`;
  const now = Math.floor(Date.now() / 1000);
  const cached = tokCache.get(key);
  if (cached && cached.exp - 60 > now) return cached.token;

  const header = b64url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claim = b64url(Buffer.from(JSON.stringify({
    iss: sa.client_email, sub: subject, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  })));
  const signingInput = `${header}.${claim}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput); signer.end();
  const sig = b64url(signer.sign(sa.private_key));
  const assertion = `${signingInput}.${sig}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
  if (!res.ok || !j.access_token) {
    const scopeName = scope.includes("readonly") ? "gmail.readonly(읽기/회신)" : "gmail.send(발송)";
    throw new Error(`토큰 발급 실패(${scopeName}): ${j.error_description || j.error || res.status} — Workspace 도메인 위임에 이 scope가 추가돼 있는지 확인하세요.`);
  }
  tokCache.set(key, { token: j.access_token, exp: now + (j.expires_in || 3600) });
  return j.access_token;
}

/* ── MIME ── */
function encodeHeader(s: string): string {
  return /^[\x00-\x7F]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, "utf-8").toString("base64")}?=`;
}
function fromHeader(s: OcSender): string {
  const name = (s.display_name || "").trim();
  return name ? `${encodeHeader(name)} <${s.email}>` : s.email;
}
function b64(s: string): string {
  return Buffer.from(s, "utf-8").toString("base64").replace(/(.{76})/g, "$1\r\n");
}

// Gmail 메시지 payload 파트에서 본문(text/plain 우선, 없으면 html→텍스트) 추출
interface GmailPart {
  mimeType?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
}
function decodeB64Url(data?: string): string {
  if (!data) return "";
  try { return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8"); } catch { return ""; }
}
function extractBody(part?: GmailPart): string {
  if (!part) return "";
  const plain = findPart(part, "text/plain");
  if (plain) return decodeB64Url(plain.body?.data);
  const html = findPart(part, "text/html");
  if (html) return stripHtml(decodeB64Url(html.body?.data));
  return decodeB64Url(part.body?.data);
}
function findPart(part: GmailPart, mime: string): GmailPart | null {
  if (part.mimeType === mime && part.body?.data) return part;
  for (const p of part.parts || []) {
    const found = findPart(p, mime);
    if (found) return found;
  }
  return null;
}
function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();
}

/** 공용 메일함 명의로 발송 */
export async function sendViaSender(
  sender: OcSender,
  msg: { to: string; subject: string; html?: string; text?: string; replyTo?: string },
): Promise<GmailSendResult> {
  const to = String(msg.to || "").trim();
  if (!EMAIL_RE.test(to)) return { ok: false, error: "수신 이메일 형식 오류" };
  if (!EMAIL_RE.test(sender.email)) return { ok: false, error: "발신 메일함 형식 오류" };
  if (!saConfigured()) return { ok: false, error: "GOOGLE_SA_KEY_JSON 미설정" };
  const subject = (msg.subject || "(제목 없음)").slice(0, 300);
  const text = msg.text || stripHtml(msg.html || "");
  const html = msg.html;
  try {
    const token = await getAccessToken(sender.email, SCOPE_SEND);
    const boundary = "b_" + crypto.randomBytes(8).toString("hex");
    const headers = [
      `From: ${fromHeader(sender)}`,
      `To: ${to}`,
      `Subject: ${encodeHeader(subject)}`,
      msg.replyTo ? `Reply-To: ${msg.replyTo}` : "",
      "MIME-Version: 1.0",
      html ? `Content-Type: multipart/alternative; boundary="${boundary}"` : `Content-Type: text/plain; charset="UTF-8"`,
    ].filter(Boolean);
    let body: string;
    if (html) {
      body =
        `--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(text)}\r\n` +
        `--${boundary}\r\nContent-Type: text/html; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(html)}\r\n` +
        `--${boundary}--`;
    } else {
      headers.push("Content-Transfer-Encoding: base64");
      body = b64(text);
    }
    const raw = headers.join("\r\n") + "\r\n\r\n" + body;
    const encoded = Buffer.from(raw, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const sendRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(sender.email)}/messages/send`,
      { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ raw: encoded }) },
    );
    const sj = (await sendRes.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
    if (!sendRes.ok) return { ok: false, error: sj.error?.message || `Gmail API HTTP ${sendRes.status}` };
    return { ok: true, id: sj.id };
  } catch (e) {
    return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 220) };
  }
}

/** 공용 메일함 최근 수신 목록(30일, 스팸·휴지통 제외) */
export async function listInbox(mailbox: string, opts?: { max?: number; query?: string }): Promise<{ ok: boolean; msgs?: InboxMsg[]; error?: string }> {
  if (!EMAIL_RE.test(mailbox)) return { ok: false, error: "메일함 형식 오류" };
  if (!saConfigured()) return { ok: false, error: "GOOGLE_SA_KEY_JSON 미설정" };
  const max = Math.min(Math.max(1, opts?.max || 50), 200);
  // in:inbox = 받은편지함만(보낸편지함/스팸/휴지통 제외) → 실제 회신만 조회
  const q = opts?.query || "newer_than:30d in:inbox";
  try {
    const token = await getAccessToken(mailbox, SCOPE_READ);
    const base = `https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(mailbox)}`;
    const listRes = await fetch(`${base}/messages?q=${encodeURIComponent(q)}&maxResults=${max}`, { headers: { Authorization: `Bearer ${token}` } });
    const lj = (await listRes.json().catch(() => ({}))) as { messages?: { id: string; threadId: string }[]; error?: { message?: string } };
    if (!listRes.ok) return { ok: false, error: lj.error?.message || `list HTTP ${listRes.status}` };
    const ids = (lj.messages || []).slice(0, max);
    // 병렬(동시성 제한)로 메시지 상세 조회 — 순차 N+1 제거로 대폭 가속.
    async function fetchMsg(id: string): Promise<InboxMsg | null> {
      const mRes = await fetch(`${base}/messages/${id}?format=full`, { headers: { Authorization: `Bearer ${token}` } });
      const mj = (await mRes.json().catch(() => ({}))) as { id?: string; threadId?: string; snippet?: string; payload?: GmailPart };
      if (!mRes.ok) return null;
      const headers = mj.payload?.headers || [];
      const h = (n: string) => headers.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value || "";
      const from = h("From");
      const m = from.match(/<([^>]+)>/);
      const fromEmail = (m ? m[1] : from).trim().toLowerCase();
      return { id: mj.id || id, threadId: mj.threadId, from, fromEmail, subject: h("Subject"), date: h("Date"), snippet: mj.snippet || "", body: extractBody(mj.payload).slice(0, 20000) };
    }
    const CONC = 8;
    const msgs: InboxMsg[] = [];
    for (let i = 0; i < ids.length; i += CONC) {
      const batch = await Promise.all(ids.slice(i, i + CONC).map((x) => fetchMsg(x.id).catch(() => null)));
      for (const m of batch) if (m) msgs.push(m);
    }
    return { ok: true, msgs };
  } catch (e) {
    return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 220) };
  }
}

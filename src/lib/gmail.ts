// Gmail 발송 어댑터 — 등록된 발신계정(oc_senders)만 사용. 시크릿은 DB에 저장하지 않고
// env_key 로 환경변수를 참조한다. 두 가지 백엔드 지원:
//  1) smtp      : Gmail SMTP + 앱 비밀번호(App Password). 계정별 env: OC_SMTP_PASS_<ENVKEY>
//                 (필요 시 OC_SMTP_USER_<ENVKEY> 로 로그인 계정 override, 기본=발신 이메일)
//  2) gmail_api : Gmail API + OAuth2 refresh token. 공용 env: GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET
//                 계정별 env: OC_GMAIL_REFRESH_<ENVKEY> (refresh token)
//
// 어느 경우든 "구글에 등록된(=우리가 env로 등록한) 발신 이메일"로만 발송된다.

export interface OcSender {
  email: string;
  display_name?: string | null;
  backend: string; // 'smtp' | 'gmail_api'
  env_key: string;
}
export interface GmailSendResult { ok: boolean; id?: string; error?: string }

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** 발신계정에 필요한 시크릿이 env에 준비되어 있는지 확인 */
export function senderConfigured(s: Pick<OcSender, "backend" | "env_key">): boolean {
  const k = (s.env_key || "").toUpperCase();
  if (!k) return false;
  if (s.backend === "gmail_api") {
    return Boolean(
      process.env.GOOGLE_OAUTH_CLIENT_ID &&
        process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
        process.env[`OC_GMAIL_REFRESH_${k}`],
    );
  }
  // default: smtp
  return Boolean(process.env[`OC_SMTP_PASS_${k}`]);
}

/** RFC2047 인코딩(비ASCII 제목/이름) */
function encodeHeader(s: string): string {
  if (/^[\x00-\x7F]*$/.test(s)) return s;
  return `=?UTF-8?B?${Buffer.from(s, "utf-8").toString("base64")}?=`;
}
function fromHeader(s: OcSender): string {
  const name = (s.display_name || "").trim();
  return name ? `${encodeHeader(name)} <${s.email}>` : s.email;
}

/** 발송 */
export async function sendViaSender(
  sender: OcSender,
  msg: { to: string; subject: string; html?: string; text?: string; replyTo?: string },
): Promise<GmailSendResult> {
  const to = String(msg.to || "").trim();
  if (!EMAIL_RE.test(to)) return { ok: false, error: "수신 이메일 형식 오류" };
  if (!senderConfigured(sender)) return { ok: false, error: "발신계정 시크릿 미설정(env)" };
  const subject = (msg.subject || "(제목 없음)").slice(0, 300);
  const text = msg.text || stripHtml(msg.html || "");
  const html = msg.html;
  try {
    if (sender.backend === "gmail_api") return await sendGmailApi(sender, { to, subject, text, html, replyTo: msg.replyTo });
    return await sendSmtp(sender, { to, subject, text, html, replyTo: msg.replyTo });
  } catch (e) {
    return { ok: false, error: String(e instanceof Error ? e.message : e).slice(0, 200) };
  }
}

/** SMTP(App Password) — nodemailer */
async function sendSmtp(
  s: OcSender,
  m: { to: string; subject: string; text: string; html?: string; replyTo?: string },
): Promise<GmailSendResult> {
  const k = s.env_key.toUpperCase();
  const pass = process.env[`OC_SMTP_PASS_${k}`];
  if (!pass) return { ok: false, error: `OC_SMTP_PASS_${k} 미설정` };
  const user = process.env[`OC_SMTP_USER_${k}`] || s.email;
  const nodemailer = (await import("nodemailer")).default;
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass: pass.replace(/\s+/g, "") }, // 앱 비밀번호 공백 제거
  });
  const info = await transport.sendMail({
    from: fromHeader(s),
    to: m.to,
    subject: m.subject,
    text: m.text,
    ...(m.html ? { html: m.html } : {}),
    ...(m.replyTo ? { replyTo: m.replyTo } : {}),
  });
  return { ok: true, id: info.messageId };
}

/** Gmail API(OAuth2 refresh token) — 순수 fetch */
async function sendGmailApi(
  s: OcSender,
  m: { to: string; subject: string; text: string; html?: string; replyTo?: string },
): Promise<GmailSendResult> {
  const k = s.env_key.toUpperCase();
  const refresh = process.env[`OC_GMAIL_REFRESH_${k}`];
  const cid = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!refresh || !cid || !secret) return { ok: false, error: "Gmail API env 미설정" };

  // 1) refresh → access token
  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cid, client_secret: secret, refresh_token: refresh, grant_type: "refresh_token" }),
  });
  const tok = (await tokRes.json().catch(() => ({}))) as { access_token?: string; error_description?: string; error?: string };
  if (!tokRes.ok || !tok.access_token) return { ok: false, error: `OAuth: ${tok.error_description || tok.error || tokRes.status}` };

  // 2) RFC822 MIME 구성 (multipart/alternative)
  const boundary = "b_" + Buffer.from(s.email).toString("hex").slice(0, 16);
  const headers = [
    `From: ${fromHeader(s)}`,
    `To: ${m.to}`,
    `Subject: ${encodeHeader(m.subject)}`,
    m.replyTo ? `Reply-To: ${m.replyTo}` : "",
    "MIME-Version: 1.0",
    m.html
      ? `Content-Type: multipart/alternative; boundary="${boundary}"`
      : `Content-Type: text/plain; charset="UTF-8"`,
  ].filter(Boolean);
  let body: string;
  if (m.html) {
    body =
      `--${boundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(m.text)}\r\n` +
      `--${boundary}\r\nContent-Type: text/html; charset="UTF-8"\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64(m.html)}\r\n` +
      `--${boundary}--`;
  } else {
    body = `Content-Transfer-Encoding: base64\r\n\r\n${b64(m.text)}`;
    // (헤더에 Content-Type 이미 지정) — 단일 파트일 때 인코딩 헤더 추가
    headers.push("Content-Transfer-Encoding: base64");
  }
  const raw = headers.join("\r\n") + "\r\n\r\n" + body;
  const encoded = Buffer.from(raw, "utf-8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  // 3) 발송
  const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });
  const sj = (await sendRes.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!sendRes.ok) return { ok: false, error: sj.error?.message || `Gmail API HTTP ${sendRes.status}` };
  return { ok: true, id: sj.id };
}

function b64(s: string): string {
  return Buffer.from(s, "utf-8").toString("base64").replace(/(.{76})/g, "$1\r\n");
}
function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

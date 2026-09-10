import { readFileSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

// 글로벌 50 E-book — 온라인 열람 전용 (glovek.space/guidebook)
// 열람 게이트: 회사명 + 이메일 입력 → 리드 저장(inquiries, kind='guidebook') → 서명 쿠키(30일) → 본문.
// 다운로드 불가(파일 URL 없음·복사/인쇄 차단) + 검색 비노출(noindex·robots·AI봇 403).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.UNSUB_SECRET || process.env.SESSION_SECRET || "glovek-guidebook";
const COOKIE = "gb_access";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const sign = (email: string) => crypto.createHmac("sha256", SECRET).update("gb:" + email).digest("hex").slice(0, 24);
const makeToken = (email: string) => Buffer.from(email).toString("base64url") + "." + sign(email);
function verifyToken(tok: string | undefined): boolean {
  if (!tok) return false;
  const [b64, sig] = tok.split(".");
  if (!b64 || !sig) return false;
  try {
    const email = Buffer.from(b64, "base64url").toString("utf-8");
    return crypto.timingSafeEqual(Buffer.from(sign(email)), Buffer.from(sig));
  } catch { return false; }
}

const PROTECT = `
<meta name="robots" content="noindex, nofollow">
<style>
  body { -webkit-user-select: none; user-select: none; }
  @media print { body > * { display: none !important; } body::before { content: "이 문서는 온라인 열람 전용입니다 — glovek.space/guidebook"; font-size: 15px; } }
</style>
<script>
(function () {
  var block = function (e) { e.preventDefault(); };
  document.addEventListener("contextmenu", block);
  document.addEventListener("copy", block);
  document.addEventListener("cut", block);
  document.addEventListener("dragstart", block);
  document.addEventListener("keydown", function (e) {
    var k = (e.key || "").toLowerCase();
    if ((e.ctrlKey || e.metaKey) && ["p", "s", "c", "u"].indexOf(k) >= 0) e.preventDefault();
  });
})();
</script>`;

const noindexHeaders = {
  "content-type": "text/html; charset=utf-8",
  "x-robots-tag": "noindex, nofollow, noai, noimageai",
  "cache-control": "private, no-store",
};

// 게이트: 책의 표지·서장(티저)만 실루엣(블러)으로 깔고 레이어 팝업으로 정보 입력.
// 전체 본문은 응답에 포함하지 않음 — 개발자도구로 팝업을 지워도 나머지 내용은 존재하지 않음.
function gatePage(err = ""): NextResponse {
  const raw = readFileSync(join(process.cwd(), "src/app/guidebook/ebook.html"), "utf-8");
  const cuts = [...raw.matchAll(/<section/g)].map((m) => m.index!);
  const cut = cuts[2] ?? Math.min(raw.length, 14000); // 표지 + 서장 + 1챕터 도입부까지
  const OVERLAY = `
  </main></div>
  <style>
    body{overflow:hidden}
    #wrap{filter:blur(7px) saturate(.7);pointer-events:none;user-select:none;-webkit-user-select:none}
    .gb-ov{position:fixed;inset:0;z-index:50;display:grid;place-items:center;background:linear-gradient(160deg,rgba(30,27,75,.55),rgba(26,86,219,.45));backdrop-filter:blur(2px);font-family:'Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif}
    .gb-card{background:#fff;border-radius:20px;padding:38px 36px;max-width:400px;width:calc(100% - 40px);box-shadow:0 24px 70px rgba(0,0,0,.4);color:#0f172a}
    .gb-k{font-size:11px;font-weight:800;letter-spacing:3px;color:#7c3aed;text-transform:uppercase}
    .gb-card h1{font-size:23px;margin:8px 0 6px;letter-spacing:-.5px;line-height:1.3}
    .gb-card p{font-size:13px;color:#64748b;line-height:1.7;margin:0 0 16px}
    .gb-card label{display:block;font-size:12px;font-weight:700;margin:13px 0 5px;color:#334155}
    .gb-card input{width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:10px;padding:11px 13px;font-size:14px;outline:none;font-family:inherit}
    .gb-card input:focus{border-color:#7c3aed}
    .gb-card button{width:100%;margin-top:20px;background:#0f172a;color:#fff;border:0;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer}
    .gb-card button:hover{background:#1e293b}
    .gb-err{margin-top:10px;font-size:12px;color:#e11d48;font-weight:700}
    .gb-ft{margin-top:14px;font-size:10px;color:#94a3b8;line-height:1.6}
    .gb-hp{position:absolute;left:-9999px}
  </style>
  <div class="gb-ov"><form class="gb-card" method="POST" autocomplete="on">
    <div class="gb-k">Glovek Guidebook</div>
    <h1>글로벌 50<br>첫 12개월을 통과하는 법</h1>
    <p>온라인 열람 전용 가이드북입니다.<br>아래 정보 입력 후 전체 내용을 바로 열람하실 수 있습니다.</p>
    <label>회사명 (브랜드명)</label>
    <input name="company" required maxlength="80" placeholder="예: 디노코스메틱" />
    <label>업무용 이메일</label>
    <input name="email" type="email" required maxlength="120" placeholder="name@company.com" />
    <input class="gb-hp" type="text" name="website" tabindex="-1" autocomplete="off" />
    ${err ? `<div class="gb-err">${err}</div>` : ""}
    <button type="submit">가이드북 열람하기</button>
    <div class="gb-ft">입력하신 정보는 가이드북 열람 및 글로벌 진출 관련 안내 목적에 한해 이용됩니다. 본 콘텐츠는 무단 복제·배포가 금지됩니다.</div>
  </form></div>
  </body></html>`;
  const teaser = raw.slice(0, cut).replace("</head>", PROTECT + "\n</head>") + OVERLAY;
  return new NextResponse(teaser, { headers: noindexHeaders });
}

export async function GET() {
  const c = await cookies();
  if (!verifyToken(c.get(COOKIE)?.value)) return gatePage();
  const html = readFileSync(join(process.cwd(), "src/app/guidebook/ebook.html"), "utf-8")
    .replace("</head>", PROTECT + "\n</head>");
  return new NextResponse(html, { headers: noindexHeaders });
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const company = String(form?.get("company") || "").trim().slice(0, 80);
  const email = String(form?.get("email") || "").trim().toLowerCase().slice(0, 120);
  const honeypot = String(form?.get("website") || "");
  if (honeypot) return gatePage(); // 봇 폼 자동입력 차단
  if (!company || !EMAIL_RE.test(email)) return gatePage("회사명과 올바른 이메일을 입력해 주세요.");

  // 리드 저장 — 기존 inquiries 테이블(kind='guidebook'), 어드민에서 열람 가능. 실패해도 열람은 허용.
  if (isConfigured()) {
    try {
      await ensureSchema();
      await sql`INSERT INTO inquiries (kind, user_email, payload)
        VALUES ('guidebook', ${email}, ${JSON.stringify({ company })}::jsonb)`;
    } catch { /* 리드 저장 실패 무시 */ }
  }

  const res = new NextResponse(null, { status: 303, headers: { location: "/guidebook" } });
  res.cookies.set(COOKIE, makeToken(email), { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/guidebook" });
  return res;
}

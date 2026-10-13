import { readFileSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, after } from "next/server";
import { sql, isConfigured, ensureSchema } from "@/lib/db";

// 글로벌 50 E-book — 온라인 열람 전용 (glovek.space/guidebook)
// 열람 게이트: 회사명 + 이메일 입력 → 리드 저장(inquiries, kind='guidebook') → 서명 쿠키(30일) → 본문.
// 다운로드 불가(파일 URL 없음·복사/인쇄 차단) + 검색 비노출(noindex·robots·AI봇 403).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET = process.env.UNSUB_SECRET || process.env.SESSION_SECRET || "glovek-guidebook";
const COOKIE = "gb_access";
const REG_COOKIE = "gb_reg"; // 최초 저장 성공 1회 전환(CompleteRegistration) 발화용 — GET에서 소비 후 즉시 만료
// glovek 기존 Meta 픽셀(공개 식별자) — 신규 픽셀 생성/대체 금지. layout과 동일 ID.
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1726953618432069";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
type Utm = { source: string; medium: string; campaign: string; content: string };
const EMPTY_UTM: Utm = { source: "", medium: "", campaign: "", content: "" };
const cleanUtm = (v: unknown) => String(v ?? "").trim().slice(0, 120);
function utmFromUrl(url: string): Utm {
  try {
    const p = new URL(url).searchParams;
    return { source: cleanUtm(p.get("utm_source")), medium: cleanUtm(p.get("utm_medium")), campaign: cleanUtm(p.get("utm_campaign")), content: cleanUtm(p.get("utm_content")) };
  } catch { return { ...EMPTY_UTM }; }
}
const utmHidden = (u: Utm) => (["source", "medium", "campaign", "content"] as const)
  .map((k) => (u[k] ? `<input type="hidden" name="utm_${k}" value="${esc(u[k])}" />` : "")).join("");
const utmMemo = (u: Utm) => [u.source && `src:${u.source}`, u.medium && `med:${u.medium}`, u.campaign && `cmp:${u.campaign}`, u.content && `con:${u.content}`].filter(Boolean).join("/");

// Meta Pixel — 라우트 핸들러는 app layout을 거치지 않아 기존 픽셀이 적용되지 않으므로 동일 ID로 직접 주입.
// 원문 PII(회사명·이메일·전화·URL)는 전송하지 않음 — 이벤트명만. extra 로 CompleteRegistration 1회 발화.
const pixelBlock = (extra = "") => `
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');${extra}</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1"/></noscript>`;

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

// 브랜드 웹사이트는 선택 항목이며 형식 제한 없음 — trim + 최대길이만 적용해 입력 그대로 저장(http 없는 bare domain 허용).

// ── 무료 세미나 회차 — 매주 월요일 10:30(KST) 고정, 매주 월요일 09:00 KST(=월 00:00 UTC)에 다음 주로 이동 ──
// 서버가 요청 시각 기준으로 공통 계산 → 표시·저장 동일 값 보장. (route는 force-dynamic + no-store 라 캐시로 이전 날짜가 남지 않음)
function seminarSession(now: Date = new Date()): { ymd: string; ko: string; atKst: string } {
  const t = now.getTime();
  const DAY = 86400000;
  let cand = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()); // 오늘 00:00 UTC
  for (let i = 0; i < 14; i++) {
    const g = new Date(cand);
    if (g.getUTCDay() === 1 && cand > t) break; // 월 00:00 UTC(=월 09:00 KST) 경계 중 now보다 엄격히 이후인 첫 월요일
    cand += DAY;
  }
  const g = new Date(cand); // 월 00:00 UTC = 월 09:00 KST → KST 캘린더 날짜 동일
  const y = g.getUTCFullYear(), m = g.getUTCMonth() + 1, d = g.getUTCDate();
  const ymd = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { ymd, ko: `${m}월 ${d}일(월) 오전 10시 30분`, atKst: `${ymd} 10:30 (Asia/Seoul)` };
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
function gatePage(err = "", utm: Utm = EMPTY_UTM): NextResponse {
  const raw = readFileSync(join(process.cwd(), "src/app/guidebook/ebook.html"), "utf-8");
  const cuts = [...raw.matchAll(/<section/g)].map((m) => m.index!);
  const cut = cuts[2] ?? Math.min(raw.length, 14000); // 표지 + 서장 + 1챕터 도입부까지
  const sem = seminarSession();
  const OVERLAY = `
  </main></div>
  <style>
    body{overflow:hidden}
    #wrap{filter:blur(7px) saturate(.7);pointer-events:none;user-select:none;-webkit-user-select:none}
    .gb-ov{position:fixed;inset:0;z-index:50;overflow-y:auto;-webkit-overflow-scrolling:touch;display:flex;justify-content:center;align-items:flex-start;padding:18px 14px;background:linear-gradient(160deg,rgba(241,245,249,.34),rgba(237,233,254,.42));backdrop-filter:blur(1px);font-family:'Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif}
    .gb-cta{text-align:center;max-width:380px;width:100%;margin-top:6vh;background:rgba(255,255,255,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.65);border-radius:22px;padding:30px 26px;box-shadow:0 24px 70px rgba(15,23,42,.3);color:#0f172a}
    .gb-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;background:#fdf2f8;color:#db2777;padding:6px 13px;font-size:11px;font-weight:800}
    .gb-ctah{font-size:21px;font-weight:900;line-height:1.3;letter-spacing:-.5px;margin:14px 0 6px;color:#0f172a}
    .gb-ctap{font-size:13px;line-height:1.6;color:#64748b;margin:0 0 20px}
    .gb-ctabtn{width:100%;border:0;border-radius:12px;background:#ec4899;color:#fff;padding:15px;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 12px 34px rgba(236,72,153,.4)}
    .gb-ctabtn:hover{background:#db2777}
    .gb-card{background:#fff;border-radius:18px;padding:26px 22px;max-width:400px;width:100%;box-shadow:0 24px 70px rgba(0,0,0,.4);color:#0f172a}
    .gb-card h1{font-size:20px;margin:7px 0 5px;letter-spacing:-.5px;line-height:1.25}
    .gb-card p{font-size:12.5px;color:#64748b;line-height:1.5;margin:0 0 10px}
    .gb-card label{display:block;font-size:12px;font-weight:700;margin:10px 0 4px;color:#334155}
    .gb-card input,.gb-card select{width:100%;box-sizing:border-box;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;font-size:14px;outline:none;font-family:inherit;background:#fff;color:#0f172a}
    .gb-card input:focus,.gb-card select:focus{border-color:#7c3aed}
    .gb-card button{width:100%;margin-top:16px;background:#0f172a;color:#fff;border:0;border-radius:10px;padding:13px;font-size:14px;font-weight:800;cursor:pointer}
    .gb-card button:hover{background:#1e293b}
    .gb-err{margin-top:9px;font-size:12px;color:#e11d48;font-weight:700}
    .gb-ft{margin-top:12px;font-size:10px;color:#94a3b8;line-height:1.5}
    .gb-agree{display:flex;gap:7px;align-items:flex-start;margin-top:12px;font-size:11px;color:#64748b;line-height:1.45;cursor:pointer}
    .gb-agree input{width:auto;margin-top:2px;accent-color:#7c3aed}
    .gb-hp{position:absolute;left:-9999px}
  </style>
  <div class="gb-ov">
    <div class="gb-cta" id="gbcta"${err ? ` style="display:none"` : ""}>
      <span class="gb-badge">🔒 비공개 실무서</span>
      <h2 class="gb-ctah">K-코스메틱·소비재<br>글로벌 50개국 진출 실무서</h2>
      <p class="gb-ctap">정보를 입력하면 전체 내용을 바로 열람할 수 있습니다.</p>
      <button type="button" class="gb-ctabtn" onclick="document.getElementById('gbcta').style.display='none';document.getElementById('gbform').style.display='block';">정보 입력하고 열람하기</button>
      <div class="gb-ft" style="color:#94a3b8;margin-top:13px">본 콘텐츠는 무단 복제·배포가 금지됩니다.</div>
    </div>
    <form class="gb-card" id="gbform" method="POST" autocomplete="on"${err ? "" : ` style="display:none"`}>
    <h1>K-코스메틱·소비재<br>글로벌 50개국 진출 실무서</h1>
    <p>아래 정보를 입력하면 전체 내용을 바로 열람할 수 있습니다.</p>
    <label>회사명 (브랜드명)</label>
    <input name="company" required maxlength="80" placeholder="예: 디노코스메틱" />
    <label>업무용 이메일</label>
    <input name="email" type="text" required maxlength="120" placeholder="name@company.com" />
    <label>전화번호</label>
    <input name="phone" type="tel" required maxlength="40" placeholder="010-0000-0000" />
    <label>브랜드 웹사이트</label>
    <input name="brand_url" type="text" required maxlength="200" placeholder="예: brand.co.kr (형식 무관)" />
    <input class="gb-hp" type="text" name="website" tabindex="-1" autocomplete="off" />
    ${utmHidden(utm)}
    <label class="gb-agree"><input type="checkbox" name="agree" checked required /> <span><b>[필수]</b> 개인정보 수집·이용에 동의합니다.</span></label>
    <label class="gb-agree"><input type="checkbox" name="seminar" checked /> <span><b>[선택]</b> ${sem.ko} 줌(Zoom) 무료 세미나 신청 <span style="color:#94a3b8">(신청 시 별도 문자 안내)</span></span></label>
    ${err ? `<div class="gb-err">${err}</div>` : ""}
    <button type="submit">가이드북 열람하기</button>
    <div class="gb-ft">본 콘텐츠는 무단 복제·배포가 금지됩니다.</div>
  </form></div>
  </body></html>`;
  const teaser = raw.slice(0, cut).replace("</head>", PROTECT + pixelBlock() + "\n</head>") + OVERLAY;
  return new NextResponse(teaser, { headers: noindexHeaders });
}

export async function GET(req: Request) {
  const c = await cookies();
  if (!verifyToken(c.get(COOKIE)?.value)) return gatePage("", utmFromUrl(req.url));
  // 최초 저장 성공 직후 1회만 CompleteRegistration — 쿠키를 소비(즉시 만료)해 새로고침·재열람 중복 방지.
  const fireReg = c.get(REG_COOKIE)?.value === "1";
  const html = readFileSync(join(process.cwd(), "src/app/guidebook/ebook.html"), "utf-8")
    .replace("</head>", PROTECT + pixelBlock(fireReg ? "fbq('track','CompleteRegistration');" : "") + "\n</head>");
  const res = new NextResponse(html, { headers: noindexHeaders });
  if (fireReg) res.cookies.set(REG_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 0, path: "/guidebook" });
  return res;
}

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const company = String(form?.get("company") || "").trim().slice(0, 80);
  const email = String(form?.get("email") || "").trim().slice(0, 120); // 형식 제한 없음 — trim + 최대길이만
  const phone = String(form?.get("phone") || "").trim().slice(0, 40);
  const honeypot = String(form?.get("website") || "");
  // 광고 UTM(소재 추적) — 히든 필드로 전달받아 리드에 보존(관리자 소재별 확인). Meta로는 전송하지 않음.
  const utm: Utm = {
    source: cleanUtm(form?.get("utm_source")), medium: cleanUtm(form?.get("utm_medium")),
    campaign: cleanUtm(form?.get("utm_campaign")), content: cleanUtm(form?.get("utm_content")),
  };
  if (honeypot) return gatePage(); // 봇 폼 자동입력 차단
  // 필수: 회사명·이메일(입력 여부만, 형식 미검증)·전화번호·개인정보 동의. 이메일/URL 형식은 차단하지 않음.
  if (!company) return gatePage("회사명을 입력해 주세요.", utm);
  if (!email) return gatePage("이메일을 입력해 주세요.", utm);
  if (phone.replace(/\D/g, "").length < 9) return gatePage("전화번호를 정확히 입력해 주세요.", utm);
  if (!form?.get("agree")) return gatePage("개인정보 수집·이용에 동의해 주세요.", utm);

  // 브랜드 웹사이트(필수) — 형식 제한 없이 trim + 최대길이만. 빈 값만 차단(파싱/양식 검증 없음).
  const brandUrl = String(form?.get("brand_url") || "").trim().slice(0, 200);
  if (!brandUrl) return gatePage("브랜드 웹사이트를 입력해 주세요.", utm);
  // 세미나 선택 신청 — 체크된 경우에만 신청자. 표시·저장 동일하도록 서버에서 회차 계산.
  const seminarOptIn = !!form?.get("seminar");
  const sem = seminarSession();

  // 리드 저장 — 기존 inquiries 테이블(kind='guidebook'), 어드민에서 열람 가능. 실패해도 열람은 허용.
  // seminar.applied=false 는 '열람했으나 미신청' — 신청자로 취급하지 않음. leadSaved 는 최초 저장 성공 전환용.
  let leadSaved = false;
  if (isConfigured()) {
    try {
      await ensureSchema();
      const payload = { company, phone, brandUrl: brandUrl || null, seminar: { applied: seminarOptIn, at: sem.atKst }, utm };
      await sql`INSERT INTO inquiries (kind, user_email, payload)
        VALUES ('guidebook', ${email}, ${JSON.stringify(payload)}::jsonb)`;
      leadSaved = true;
    } catch { /* 리드 저장 실패 무시 — 전환(CompleteRegistration)도 발화하지 않음 */ }
  }

  // 통합 어드민(admin.glovek.space) 리드훅 — consult와 동일 방식. 응답 이후 비차단 전송.
  // 어드민 leadhook: url→brand_url 컬럼, memo→메모(관리자 확인). 세미나는 신청 시에만 '신청'으로 표기.
  {
    const base = process.env.LEADHOOK_URL || "https://admin.glovek.space/api/leadhook";
    const key = process.env.LEADHOOK_KEY || "dinoffice1029";
    const src = process.env.LEADHOOK_SOURCE || "HfbbIVFL9p29ZtG2sNI21sCC";
    const qs = new URLSearchParams({
      key, source: src, company, name: company, email,
      phone: phone.replace(/\D/g, ""), category: "guidebook",
      memo: `[가이드북 열람] K-코스메틱·소비재 글로벌 50개국 진출 실무서 · 회사 ${company}`
        + ` · 연락처 ${phone}`
        + (brandUrl ? ` · 사이트 ${brandUrl}` : "")
        + ` · 무료세미나 ${seminarOptIn ? `신청(${sem.atKst})` : "미신청"}`
        + (utmMemo(utm) ? ` · UTM ${utmMemo(utm)}` : ""),
    });
    if (brandUrl) qs.set("url", brandUrl);
    const leadhookUrl = `${base}?${qs.toString()}`;
    after(async () => {
      try { await fetch(leadhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); }
      catch { /* 리드훅 실패 무시 — 열람은 이미 허용 */ }
    });
  }

  const res = new NextResponse(null, { status: 303, headers: { location: "/guidebook" } });
  res.cookies.set(COOKIE, makeToken(email), { httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/guidebook" });
  // 저장 성공한 최초 제출에만 1회 전환 플래그. 다음 GET이 소비 후 즉시 만료 → 새로고침·재열람 중복 전환 방지.
  if (leadSaved) res.cookies.set(REG_COOKIE, "1", { httpOnly: true, secure: true, sameSite: "lax", maxAge: 300, path: "/guidebook" });
  return res;
}

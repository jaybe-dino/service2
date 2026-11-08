import { NextResponse, after } from "next/server";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { GATE_PAGES, makeAccessToken, accessCookieName, utmFromForm, utmMemo } from "@/lib/leadgate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 공용 리드 게이트 접수 — ?kind=<tiktokmarketing|retail>. 저장 성공 시 ?reg=1 리다이렉트로 CompleteRegistration 1회 유도.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const kind = String(url.searchParams.get("kind") || "");
  const page = GATE_PAGES[kind];
  if (!page) return NextResponse.redirect(new URL("/", url), 303);
  const to = page.path;
  const bounce = (q: string) => NextResponse.redirect(new URL(`${to}?${q}`, url), 303);

  const form = await req.formData().catch(() => null);
  const company = String(form?.get("company") || "").trim().slice(0, 80);
  const email = String(form?.get("email") || "").trim().slice(0, 120); // 형식 제한 없음 — trim + 최대길이만
  const phone = String(form?.get("phone") || "").trim().slice(0, 40);
  const honeypot = String(form?.get("website") || "");
  const brandUrl = String(form?.get("brand_url") || "").trim().slice(0, 200);
  const meetingOptIn = !!form?.get("meeting");
  const utm = utmFromForm(form);

  if (honeypot) return bounce("gerr=1"); // 봇 차단
  // 필수: 회사명·이메일·전화번호·브랜드 사이트·동의. (이메일/사이트 형식은 검증하지 않음 — 빈 값만 차단)
  if (!company || !email || phone.replace(/\D/g, "").length < 9 || !brandUrl || !form?.get("agree")) return bounce("gerr=1");

  // ① glovek DB: inquiries (kind=페이지명). 저장 성공해야 전환 발화.
  let leadSaved = false;
  if (isConfigured()) {
    try {
      await ensureSchema();
      const payload = { company, phone, brandUrl: brandUrl || null, meeting: { applied: meetingOptIn }, utm, page: kind };
      await sql`INSERT INTO inquiries (kind, user_email, payload) VALUES (${kind}, ${email}, ${JSON.stringify(payload)}::jsonb)`;
      leadSaved = true;
    } catch { /* 저장 실패 시 전환도 발화 안 함 — 열람은 허용 */ }
  }

  // ② admin 리드훅 (url→brand_url, memo→메모). 비차단 전송.
  {
    const base = process.env.LEADHOOK_URL || "https://admin.glovek.space/api/leadhook";
    const key = process.env.LEADHOOK_KEY || "dinoffice1029";
    const src = process.env.LEADHOOK_SOURCE || "HfbbIVFL9p29ZtG2sNI21sCC";
    const qs = new URLSearchParams({
      key, source: src, company, name: company, email,
      phone: phone.replace(/\D/g, ""), category: kind,
      // 개별미팅 신청 시 메모 첫 줄에 눈에 띄는 마커 — Slack 알림에서 별도 강조 라인으로 표시됨.
      memo: (meetingOptIn ? "✅ 개별미팅 신청 OK — 담당자 개별 연락 요망\n" : "")
        + `[${kind} 열람] 회사 ${company} · 연락처 ${phone}`
        + (brandUrl ? ` · 사이트 ${brandUrl}` : "")
        + (meetingOptIn ? "" : " · 미팅 미신청")
        + (utmMemo(utm) ? ` · UTM ${utmMemo(utm)}` : ""),
    });
    if (brandUrl) qs.set("url", brandUrl);
    const hook = `${base}?${qs.toString()}`;
    after(async () => {
      try { await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); }
      catch { /* 무시 — 열람은 이미 허용 */ }
    });
  }

  // ③ Slack 직접 통지(SLACK_WEBHOOK_URL) — consult와 동일 웹훅. (폐기된 leadhook과 무관하게 확실히 알림)
  //    개별미팅 신청은 상단에 ✅ 강조 라인으로 표시.
  {
    const slackHook = process.env.SLACK_WEBHOOK_URL;
    if (slackHook) {
      const text = [
        `:bust_in_silhouette: *새 리드 — ${kind}*`,
        meetingOptIn ? "✅ *개별미팅 신청 OK — 담당자 개별 연락 요망*" : null,
        `• 회사/브랜드: *${company}*`,
        `• 이메일: ${email}`,
        `• 연락처: ${phone}`,
        brandUrl ? `• 브랜드 URL: ${brandUrl}` : null,
        `• 유입: ${kind}${utmMemo(utm) ? ` · ${utmMemo(utm)}` : ""}`,
      ].filter(Boolean).join("\n");
      after(async () => {
        try { await fetch(slackHook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }); }
        catch { /* 통지 실패 무시 */ }
      });
    }
  }

  // 접근 쿠키(30일) + 저장 성공 시 reg=1(전환 1회). 쿠키 path는 해당 페이지로 한정.
  const res = bounce(leadSaved ? "reg=1" : "ok=1");
  res.cookies.set(accessCookieName(kind), makeAccessToken(kind, email), {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: to,
  });
  return res;
}

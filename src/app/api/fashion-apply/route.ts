import { NextResponse, after } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { sendIngest } from "@/lib/admin-ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// K-패션 글로벌 틱톡샵 세미나(9/22) 사전 신청 — 간단 폼: 브랜드·이메일·연락처·희망국가.
// consult_requests 재사용(category='패션', overseas=희망국가). 리드훅·인제스트로 어드민 유입.
export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

  const brand = s(b.brand, 120);
  const email = s(b.email, 160).toLowerCase();
  const contact = s(b.contact, 40);
  const country = s(b.country, 200);   // 희망 진출 국가(복수 가능, 콤마 구분)
  const agreed = b.agreed === true;

  if (!brand) return NextResponse.json({ ok: false, error: "브랜드명을 입력해 주세요." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ ok: false, error: "이메일 형식을 확인해 주세요." }, { status: 400 });
  if (contact.replace(/\D/g, "").length < 9) return NextResponse.json({ ok: false, error: "연락처를 정확히 입력해 주세요." }, { status: 400 });
  if (!agreed) return NextResponse.json({ ok: false, error: "개인정보 수집·이용 동의가 필요합니다." }, { status: 400 });

  await ensureSchema();
  const { rows } = await sql<{ id: number }>`
    INSERT INTO consult_requests (company, category, overseas, manager_name, email, contact, message, agreed, source)
    VALUES (${brand}, '패션', ${country || null}, ${brand}, ${email}, ${contact}, ${country ? `희망국가: ${country}` : null}, ${agreed}, 'fashion-seminar')
    RETURNING id`;
  const leadId = rows[0]?.id;

  // 통합 어드민 인제스트(lead) — 응답 이후 비차단
  if (leadId != null) {
    after(() => sendIngest("lead", `fashion:${leadId}`, {
      email, phone: contact.replace(/\D/g, "") || undefined,
      brand_name: brand, contact_name: brand, category: "패션",
      source: "fashion_seminar", message: country ? `희망국가: ${country}` : undefined,
      source_ref: String(leadId),
    }));
  }

  // admin.glovek.space 리드훅 — consult와 동일 방식
  {
    const base = process.env.LEADHOOK_URL || "https://admin.glovek.space/api/leadhook";
    const key = process.env.LEADHOOK_KEY || "dinoffice1029";
    const src = process.env.LEADHOOK_SOURCE || "HfbbIVFL9p29ZtG2sNI21sCC";
    const qs = new URLSearchParams({
      key, source: src, company: brand, name: brand, email,
      phone: contact.replace(/\D/g, ""), category: "패션",
      memo: `[9/22 패션세미나 신청] 브랜드 ${brand} · 연락처 ${contact}${country ? ` · 희망국가 ${country}` : ""}`,
    });
    const leadhookUrl = `${base}?${qs.toString()}`;
    after(async () => { try { await fetch(leadhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); } catch { /* 무시 */ } });
  }

  // Slack 통지(설정 시)
  const hook = process.env.SLACK_WEBHOOK_URL;
  if (hook) {
    after(async () => {
      try {
        await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: `:dress: *9/22 패션세미나 신청* (#${leadId})\n• 브랜드: *${brand}*\n• 이메일: ${email}\n• 연락처: ${contact}${country ? `\n• 희망국가: ${country}` : ""}` }) });
      } catch { /* 무시 */ }
    });
  }

  return NextResponse.json({ ok: true, id: leadId });
}

import { NextResponse, after } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { sendIngest } from "@/lib/admin-ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GloveK 입점 상담 신청 저장(랜딩 이벤트). 개인정보 수집 동의 필수.
export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const s = (v: unknown, max = 500) => String(v ?? "").trim().slice(0, max);

  const company = s(b.company);
  const managerName = s(b.managerName);
  const email = s(b.email);
  const contact = s(b.contact);
  const agreed = b.agreed === true;

  if (!company || !managerName || !email || !contact) {
    return NextResponse.json({ ok: false, error: "회사명·담당자·이메일·연락처는 필수입니다." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "이메일 형식을 확인해 주세요." }, { status: 400 });
  }
  if (!agreed) {
    return NextResponse.json({ ok: false, error: "개인정보 수집·이용 동의가 필요합니다." }, { status: 400 });
  }

  await ensureSchema();
  const { rows } = await sql<{ id: number }>`
    INSERT INTO consult_requests (company, brand_url, category, overseas, manager_name, email, contact, message, agreed, source)
    VALUES (${company}, ${s(b.brandUrl)}, ${s(b.category, 80)}, ${s(b.overseas, 80)}, ${managerName}, ${email}, ${s(b.contact, 60)},
            ${s(b.message, 2000)}, ${agreed}, ${s(b.source, 60) || "consult-landing"})
    RETURNING id`;

  // 운영 어드민 인제스트(lead) — 응답 이후 비차단 전송(실패해도 접수 플로우 무관)
  const leadId = rows[0]?.id;
  if (leadId != null) {
    after(() => sendIngest("lead", `consult:${leadId}`, {
      email, phone: contact, brand_name: company, contact_name: managerName,
      category: s(b.category, 80) || undefined, source: "glovek_consult",
      message: s(b.message, 2000) || undefined, source_ref: String(leadId),
    }));
  }

  // Slack 알림(SLACK_WEBHOOK_URL 설정 시) — 새 상담 문의를 실시간 통지. 조용한 유실 방지, 비용 0.
  const hook = process.env.SLACK_WEBHOOK_URL;
  if (hook) {
    const adminUrl = process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/admin` : "";
    const lines = [
      `:incoming_envelope: *새 입점 상담 문의* (#${rows[0]?.id})`,
      `• 회사/브랜드: *${company}*`,
      `• 담당자: ${managerName}`,
      `• 이메일: ${email}`,
      `• 연락처: ${contact}`,
      b.brandUrl ? `• 브랜드 URL: ${s(b.brandUrl, 200)}` : null,
      b.category ? `• 카테고리: ${s(b.category, 40)}` : null,
      b.overseas ? `• 해외 경험: ${s(b.overseas, 40)}` : null,
      b.message ? `• 내용: ${s(b.message, 500)}` : null,
      `• 유입: ${s(b.source, 60) || "consult-landing"}`,
      adminUrl ? `<${adminUrl}|어드민에서 보기>` : null,
    ].filter(Boolean).join("\n");
    try {
      await fetch(hook, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lines }),
      });
    } catch { /* 통지 실패 무시 — 문의 저장은 이미 완료 */ }
  }

  // 신청 성공 시 1:1 미팅 링크를 반환(자동 노출용). 값은 env로 주입.
  const meetingUrl = process.env.NEXT_PUBLIC_GLOVEK_MEETING_URL || "";
  return NextResponse.json({ ok: true, id: rows[0]?.id, meetingUrl });
}

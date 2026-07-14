import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

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

  // Slack 알림(설정 시) — 조용한 유실 방지, 비용 0.
  const hook = process.env.SLACK_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `📩 [GloveK 입점 상담] ${company} · ${managerName} · ${email} · ${contact}${b.category ? ` · ${s(b.category, 40)}` : ""}` }),
      });
    } catch { /* 통지 실패 무시 */ }
  }

  // 신청 성공 시 1:1 미팅 링크를 반환(자동 노출용). 값은 env로 주입.
  const meetingUrl = process.env.NEXT_PUBLIC_GLOVEK_MEETING_URL || "";
  return NextResponse.json({ ok: true, id: rows[0]?.id, meetingUrl });
}

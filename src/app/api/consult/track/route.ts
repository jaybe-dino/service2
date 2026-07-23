import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 상담 폼 입력 퍼널 추적(공개) — 어느 필드까지 채웠는지만 기록(비식별). PII 값은 저장 안 함.
// 프론트가 필드 blur / 이탈 시 best-effort로 호출. sid로 upsert.
const FIELD_KEYS = new Set(["company", "category", "managerName", "email", "contact", "message", "agreed"]);

export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ ok: false }, { status: 200 });
  try {
    const b = (await req.json().catch(() => ({}))) as { sid?: string; fields?: unknown; lastField?: string; category?: string; agreed?: boolean; completed?: boolean; utm?: Record<string, unknown>; landing?: string; referrer?: string };
    const sid = String(b.sid ?? "").slice(0, 64);
    if (!/^[A-Za-z0-9-]{8,64}$/.test(sid)) return NextResponse.json({ ok: false }, { status: 200 });
    const fields = Array.isArray(b.fields) ? Array.from(new Set(b.fields.map((x) => String(x)).filter((x) => FIELD_KEYS.has(x)))) : [];
    const lastField = FIELD_KEYS.has(String(b.lastField)) ? String(b.lastField) : (fields[fields.length - 1] ?? null);
    const category = b.category ? String(b.category).slice(0, 60) : null;
    const agreed = b.agreed === true;
    const completed = b.completed === true;
    const ua = (req.headers.get("user-agent") || "").slice(0, 200);
    // 외부 유입 referrer는 클라이언트 document.referrer 우선(요청 헤더는 페이지 자신이라 무의미)
    const referrer = (b.referrer ? String(b.referrer) : (req.headers.get("referer") || "")).slice(0, 300);
    const u = (b.utm && typeof b.utm === "object" ? b.utm : {}) as Record<string, unknown>;
    const uv = (k: string) => { const v = u[k]; return v ? String(v).slice(0, 120) : null; };
    const utmSource = uv("source"), utmMedium = uv("medium"), utmCampaign = uv("campaign"), utmContent = uv("content"), utmTerm = uv("term");
    const landing = b.landing ? String(b.landing).slice(0, 200) : null;

    await ensureSchema();
    // UTM/landing은 first-touch 보존(COALESCE로 기존값 우선) — 최초 유입 소스를 유지.
    await sql`
      INSERT INTO consult_progress (sid, fields, last_field, field_count, category, agreed, completed, ua, referrer,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing, updated_at)
      VALUES (${sid}, ${JSON.stringify(fields)}::jsonb, ${lastField}, ${fields.length}, ${category}, ${agreed}, ${completed}, ${ua}, ${referrer},
        ${utmSource}, ${utmMedium}, ${utmCampaign}, ${utmContent}, ${utmTerm}, ${landing}, now())
      ON CONFLICT (sid) DO UPDATE SET
        fields = EXCLUDED.fields, last_field = EXCLUDED.last_field, field_count = EXCLUDED.field_count,
        category = COALESCE(EXCLUDED.category, consult_progress.category),
        agreed = consult_progress.agreed OR EXCLUDED.agreed,
        completed = consult_progress.completed OR EXCLUDED.completed,
        utm_source = COALESCE(consult_progress.utm_source, EXCLUDED.utm_source),
        utm_medium = COALESCE(consult_progress.utm_medium, EXCLUDED.utm_medium),
        utm_campaign = COALESCE(consult_progress.utm_campaign, EXCLUDED.utm_campaign),
        utm_content = COALESCE(consult_progress.utm_content, EXCLUDED.utm_content),
        utm_term = COALESCE(consult_progress.utm_term, EXCLUDED.utm_term),
        landing = COALESCE(consult_progress.landing, EXCLUDED.landing),
        referrer = COALESCE(consult_progress.referrer, EXCLUDED.referrer),
        updated_at = now()`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

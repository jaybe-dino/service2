import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 상담 폼 입력 퍼널(관리자) — 어느 필드까지 채우고 이탈하는지 집계 + 최근 세션.
const STEPS = [
  { key: "company", label: "회사명/브랜드명" },
  { key: "category", label: "카테고리" },
  { key: "managerName", label: "담당자" },
  { key: "email", label: "이메일" },
  { key: "contact", label: "연락처" },
  { key: "message", label: "문의내용(선택)" },
  { key: "agreed", label: "약관동의" },
];

function refHost(ref: string): string {
  try { const h = new URL(ref).hostname.replace(/^www\./, ""); return h || "(direct)"; } catch { return "(direct)"; }
}

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  try {
    await ensureSchema();
    const agg = await sql<Record<string, string | number>>`
      SELECT count(*)::int AS sessions,
             count(*) FILTER (WHERE completed)::int AS completed,
             count(*) FILTER (WHERE NOT completed AND field_count > 0)::int AS abandoned,
             count(*) FILTER (WHERE fields ? 'company')::int AS f_company,
             count(*) FILTER (WHERE fields ? 'category')::int AS f_category,
             count(*) FILTER (WHERE fields ? 'managerName')::int AS f_managerName,
             count(*) FILTER (WHERE fields ? 'email')::int AS f_email,
             count(*) FILTER (WHERE fields ? 'contact')::int AS f_contact,
             count(*) FILTER (WHERE fields ? 'message')::int AS f_message,
             count(*) FILTER (WHERE fields ? 'agreed')::int AS f_agreed
      FROM consult_progress WHERE updated_at > now() - interval '90 days'`;
    const a = agg.rows[0] || {};
    const sessions = Number(a.sessions) || 0;
    const funnel = STEPS.map((s) => {
      const reached = Number(a[`f_${s.key}`]) || 0;
      return { key: s.key, label: s.label, reached, pct: sessions ? Math.round((reached / sessions) * 1000) / 10 : 0 };
    });

    // 마지막으로 채운 필드 기준 이탈 지점 분포
    const dropRows = await sql<{ last_field: string | null; n: number }>`
      SELECT last_field, count(*)::int AS n FROM consult_progress
      WHERE NOT completed AND field_count > 0 AND updated_at > now() - interval '90 days'
      GROUP BY last_field ORDER BY n DESC`;
    const labelOf: Record<string, string> = Object.fromEntries(STEPS.map((s) => [s.key, s.label]));
    const dropoff = dropRows.rows.map((r) => ({ field: r.last_field, label: r.last_field ? (labelOf[r.last_field] ?? r.last_field) : "(없음)", count: Number(r.n) || 0 }));

    // 유입 소스별(UTM source + medium/campaign) 도달·완료율 — '광고는 도는데 왜 입력 안 하나' 분석용
    const srcRows = await sql<{ source: string | null; medium: string | null; campaign: string | null; sessions: number; started: number; completed: number }>`
      SELECT coalesce(utm_source, '(direct)') AS source, coalesce(utm_medium,'') AS medium, coalesce(utm_campaign,'') AS campaign,
             count(*)::int AS sessions,
             count(*) FILTER (WHERE field_count > 0)::int AS started,
             count(*) FILTER (WHERE completed)::int AS completed
      FROM consult_progress WHERE updated_at > now() - interval '90 days'
      GROUP BY 1,2,3 ORDER BY sessions DESC LIMIT 40`;
    const sources = srcRows.rows.map((r) => ({
      source: r.source || "(direct)", medium: r.medium || "", campaign: r.campaign || "",
      sessions: Number(r.sessions) || 0, started: Number(r.started) || 0, completed: Number(r.completed) || 0,
      completionRate: Number(r.sessions) ? Math.round((Number(r.completed) / Number(r.sessions)) * 1000) / 10 : 0,
    }));

    // 최근 세션(비식별) + 유입 정보
    const recent = await sql<{ sid: string; field_count: number; last_field: string | null; category: string | null; agreed: boolean; completed: boolean; ua: string | null; updated_at: string; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; referrer: string | null; landing: string | null }>`
      SELECT sid, field_count, last_field, category, agreed, completed, ua, updated_at, utm_source, utm_medium, utm_campaign, referrer, landing
      FROM consult_progress ORDER BY updated_at DESC LIMIT 80`;
    const sessionsRecent = recent.rows.map((r) => ({
      sid: r.sid.slice(0, 8),
      fieldCount: Number(r.field_count) || 0,
      lastField: r.last_field ? (labelOf[r.last_field] ?? r.last_field) : "—",
      category: r.category || "—",
      agreed: !!r.agreed,
      completed: !!r.completed,
      mobile: /Mobi|Android|iPhone/i.test(r.ua || ""),
      source: r.utm_source || (r.referrer ? refHost(r.referrer) : "(direct)"),
      medium: r.utm_medium || "",
      campaign: r.utm_campaign || "",
      landing: r.landing || "",
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({
      configured: true,
      totals: { sessions, completed: Number(a.completed) || 0, abandoned: Number(a.abandoned) || 0, completionRate: sessions ? Math.round(((Number(a.completed) || 0) / sessions) * 1000) / 10 : 0 },
      funnel, dropoff, sources, recent: sessionsRecent,
    });
  } catch (e) {
    return NextResponse.json({ configured: true, error: String(e).slice(0, 160), funnel: [], recent: [] });
  }
}

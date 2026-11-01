import { NextResponse, after } from "next/server";
import crypto from "crypto";
import { sql, isConfigured } from "@/lib/db";
import {
  validateInquiry,
  ensureInquiryTable,
  hashIp,
  inquiryReceiptNo,
  siteFromHost,
  CONSENT_VERSION,
  type CleanInquiry,
} from "@/lib/launch-batch";
import { sendLeadIngestResult } from "@/lib/admin-ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 온보딩·문의 접수(마감된 batch 등) — 배치 참여 신청이 아닌 일반 문의.
// 1) 로컬 전용 테이블에 durable 저장(개인정보는 JSON/DB만, 로그 미기록)
// 2) 운영 CRM(lead) 전달 후 crm_status 기록(미설정/실패는 거짓 성공으로 반환하지 않음 — 재시도 가능)
// 자동 메일/Slack/SMS는 이 경로에서 호출하지 않음(기존 consult route 미사용).

const ALLOW_HOSTS = new Set(["start.glovek.space", "batch.glovek.space", "batch2.glovek.space", "glovek.space", "www.glovek.space"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NS = { "cache-control": "no-store" };

function sameOriginOk(req: Request): boolean {
  const host = req.headers.get("host") || "";
  const origin = req.headers.get("origin");
  if (origin) {
    let oHost = "";
    try { oHost = new URL(origin).host; } catch { return false; }
    return oHost === host || ALLOW_HOSTS.has(oHost);
  }
  return ALLOW_HOSTS.has(host);
}
function payloadHash(d: CleanInquiry): string {
  const norm = JSON.stringify({ n: d.name, e: d.email, ph: d.phone, b: d.brand, m: d.message });
  return crypto.createHash("sha256").update(norm).digest("hex").slice(0, 32);
}
function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  return (xff.split(",")[0] || req.headers.get("x-real-ip") || "").trim() || "0.0.0.0";
}

export async function POST(req: Request) {
  if (!sameOriginOk(req)) {
    return NextResponse.json({ ok: false, error: "허용되지 않은 출처입니다." }, { status: 403, headers: NS });
  }
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 20000) {
    return NextResponse.json({ ok: false, error: "요청이 너무 큽니다." }, { status: 413, headers: NS });
  }
  if (!isConfigured()) {
    // DB 미설정이면 durable 저장이 불가 → 거짓 성공 금지.
    return NextResponse.json({ ok: false, error: "문의 접수 시스템이 일시적으로 설정되지 않았습니다. 잠시 후 다시 시도하거나 메일/전화로 문의해 주세요." }, { status: 503, headers: NS });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400, headers: NS });
  }
  // 허니팟 — 값 있으면 봇. 저장하지 않고 조용히 성공 응답.
  if (String(body.company_website ?? "").trim() !== "") {
    return NextResponse.json({ ok: true, receipt: inquiryReceiptNo(0), spam: true }, { headers: NS });
  }
  if (body.consent !== true) {
    return NextResponse.json({ ok: false, error: "개인정보 수집·이용 동의가 필요합니다." }, { status: 400, headers: NS });
  }
  const v = validateInquiry(body);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 400, headers: NS });
  }
  const d = v.data;

  const reqId = typeof body.requestId === "string" && UUID_RE.test(body.requestId) ? body.requestId.toLowerCase() : crypto.randomUUID();
  const hash = payloadHash(d);
  const ipHash = hashIp(clientIp(req));
  const ua = String(req.headers.get("user-agent") || "").slice(0, 300);
  // 유입 사이트는 canonical Host로만 판정(body source 등 미신뢰).
  const site = siteFromHost(req.headers.get("host"));

  try {
    await ensureInquiryTable();

    // 기본 속도 제한 — 동일 IP 10분 내 8건 초과 차단.
    const rl = await sql<{ c: number }>`
      SELECT COUNT(*)::int AS c FROM launch_batch_inquiries
      WHERE ip_hash = ${ipHash} AND created_at > now() - interval '10 minutes'`;
    if ((rl.rows[0]?.c ?? 0) >= 8) {
      return NextResponse.json({ ok: false, error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: NS });
    }

    // durable 저장(멱등) — crm_status='pending'
    const ins = await sql<{ id: number }>`
      INSERT INTO launch_batch_inquiries
        (request_id, payload_hash, name, email, phone, brand, message, source_site,
         consent, consent_version, consent_at, is_test, crm_status, ip_hash, user_agent)
      VALUES
        (${reqId}, ${hash}, ${d.name}, ${d.email}, ${d.phone}, ${d.brand}, ${d.message}, ${site},
         true, ${CONSENT_VERSION}, now(), ${d.isTest}, 'pending', ${ipHash}, ${ua})
      ON CONFLICT (request_id) DO NOTHING
      RETURNING id`;

    let id = ins.rows[0]?.id;
    let isNew = id != null;
    if (id == null) {
      const ex = await sql<{ id: number; payload_hash: string | null }>`
        SELECT id, payload_hash FROM launch_batch_inquiries WHERE request_id = ${reqId} LIMIT 1`;
      const row = ex.rows[0];
      if (!row) throw new Error("insert-conflict-but-missing");
      if (row.payload_hash && row.payload_hash !== hash) {
        return NextResponse.json({ ok: false, error: "이미 다른 내용으로 접수된 요청입니다. 새로고침 후 다시 작성해 주세요." }, { status: 409, headers: NS });
      }
      id = row.id; // 동일 재시도 — 멱등
      isNew = false;
    }

    // CRM 전달은 신규 접수에 한해 응답 이후(after) 비차단으로 수행하고 crm_status를 기록한다.
    // 테스트 리드(TEST*+example.com)도 실제 CRM에 저장되지만, 수신측(tiktokadmin) 가드가 자동 알림만 억제한다.
    if (isNew && id != null) {
      const inquiryId = id;
      after(async () => {
        try {
          const memo = `[batch.glovek.space 온보딩·문의 / source=${site}] ${d.message}`.slice(0, 1000);
          const r = await sendLeadIngestResult(`glovek-inquiry:${inquiryId}`, {
            email: d.email,
            phone: d.phone,
            brand_name: d.brand ?? "",
            contact_name: d.name,
            category: "문의",
            source: "glovek_inquiry",
            source_ref: `inquiry:${inquiryId}`,
            memo,
          });
          await sql`UPDATE launch_batch_inquiries
            SET crm_status = ${r.status}, crm_attempts = crm_attempts + 1, crm_last_at = now(),
                crm_brand_id = COALESCE(${r.brandId ?? null}, crm_brand_id), updated_at = now()
            WHERE id = ${inquiryId}`;
        } catch {
          // 전달 실패여도 로컬 저장은 유지(crm_status는 'pending'/이전값) — 재시도 가능. PII 로그 미기록.
          await sql`UPDATE launch_batch_inquiries SET crm_status='failed', crm_attempts=crm_attempts+1, crm_last_at=now(), updated_at=now() WHERE id=${inquiryId}`.catch(() => {});
        }
      });
    }

    // 응답은 로컬 접수 성공만 의미(CRM 성공을 단정하지 않음).
    return NextResponse.json({ ok: true, receipt: inquiryReceiptNo(id) }, { headers: NS });
  } catch {
    return NextResponse.json(
      { ok: false, error: "문의 저장에 실패했습니다. 잠시 후 다시 시도해 주세요. 문제가 계속되면 메일/전화로 문의해 주세요." },
      { status: 500, headers: NS },
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "method not allowed" }, { status: 405, headers: NS });
}

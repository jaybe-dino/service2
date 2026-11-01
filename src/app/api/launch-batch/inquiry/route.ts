import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql, isConfigured } from "@/lib/db";
import {
  validateInquiry,
  ensureInquiryTable,
  hashIp,
  inquiryReceiptNo,
  siteFromHost,
  isKnownSite,
  CONSENT_VERSION,
  type CleanInquiry,
} from "@/lib/launch-batch";
import { sendLeadIngestResult } from "@/lib/admin-ingest";

type CrmState = "sent" | "failed" | "skipped_unset" | "pending";

// CRM(lead) 전달을 응답 내에서 직접 수행하고 crm_status를 기록한다.
// - 고정 멱등키(glovek-inquiry:<id>)로 재시도해도 수신측(tiktokadmin)이 중복 생성하지 않는다.
// - 호출부는 이미 'sent'인 건은 다시 부르지 않는다(중복 전송 방지).
// - 전달 실패/미설정이어도 로컬 저장은 유지되어 동일 UUID 재시도로 다시 전달을 시도할 수 있다.
// - PII는 JSON body로만 전송하며 일반 로그에 남기지 않는다(상태/코드만).
async function deliverToCrm(id: number, d: CleanInquiry, site: string): Promise<CrmState> {
  try {
    const memo = `[batch.glovek.space 온보딩·문의 / source=${site}] ${d.message}`.slice(0, 1000);
    const r = await sendLeadIngestResult(`glovek-inquiry:${id}`, {
      email: d.email,
      phone: d.phone,
      brand_name: d.brand ?? "",
      contact_name: d.name,
      category: "문의",
      source: "glovek_inquiry",
      source_ref: `inquiry:${id}`,
      memo,
    });
    await sql`UPDATE launch_batch_inquiries
      SET crm_status = ${r.status}, crm_attempts = crm_attempts + 1, crm_last_at = now(),
          crm_brand_id = COALESCE(${r.brandId ?? null}, crm_brand_id), updated_at = now()
      WHERE id = ${id}`;
    return r.status;
  } catch {
    await sql`UPDATE launch_batch_inquiries SET crm_status='failed', crm_attempts=crm_attempts+1, crm_last_at=now(), updated_at=now() WHERE id=${id}`.catch(() => {});
    return "failed";
  }
}

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
    const isNew = id != null;
    let crmStatus: CrmState = "pending";
    if (id == null) {
      // 동일 requestId 재시도 — 기존 행 확인(멱등). payload/site 불일치는 접수 거부.
      const ex = await sql<{ id: number; payload_hash: string | null; source_site: string | null; crm_status: string | null }>`
        SELECT id, payload_hash, source_site, crm_status FROM launch_batch_inquiries WHERE request_id = ${reqId} LIMIT 1`;
      const row = ex.rows[0];
      if (!row) throw new Error("insert-conflict-but-missing");
      if (row.payload_hash && row.payload_hash !== hash) {
        return NextResponse.json({ ok: false, error: "이미 다른 내용으로 접수된 요청입니다. 새로고침 후 다시 작성해 주세요." }, { status: 409, headers: NS });
      }
      if (isKnownSite(row.source_site) && isKnownSite(site) && row.source_site !== site) {
        return NextResponse.json({ ok: false, error: "이미 다른 사이트에서 접수된 요청입니다. 새로고침 후 다시 작성해 주세요." }, { status: 409, headers: NS });
      }
      id = row.id; // 동일 재시도 — 멱등(기존 source_site 유지)
      crmStatus = (row.crm_status as CrmState) ?? "pending";
    }

    // CRM 전달: 신규 접수이거나, 동일 UUID·동일 payload/site 재시도 중 아직 'sent'가 아닌 경우에만 수행한다.
    // 이미 'sent'면 재전송하지 않는다(중복 전송 방지). 고정 멱등키로 at-least-once 전달을 안전하게 재시도한다.
    // 테스트 리드(TEST*+example.com)도 실제 CRM에 저장되며, 수신측(tiktokadmin) 가드가 자동 알림만 억제한다.
    let crm: CrmState = crmStatus === "sent" ? "sent" : "pending";
    if (isNew || crmStatus !== "sent") {
      crm = await deliverToCrm(id, d, site);
    }

    // 응답: 로컬 접수는 성공(ok). CRM 전달 성공은 crm === 'sent'로만 단정한다(로컬 저장≠CRM완료).
    // crm !== 'sent'이면 클라이언트가 동일 UUID를 유지하고 '다시 보내기'로 재전달을 시도할 수 있다.
    return NextResponse.json({ ok: true, receipt: inquiryReceiptNo(id), crm }, { headers: NS });
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

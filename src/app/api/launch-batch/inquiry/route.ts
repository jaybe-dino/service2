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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 온보딩·문의 접수(마감 batch·sea 무료 프로모션 등) — 배치 참여 신청이 아닌 일반 문의/관심 접수.
// 로컬 전용 테이블에 durable 저장만 수행한다(개인정보는 JSON/DB만, 일반 로그 미기록).
// 자동 CRM 전달/메일/Slack/SMS는 호출하지 않는다. 담당자(및 Codex)가 관리자에서 직접 확인한다.
// 응답의 delivery:"manual_review" 는 "로컬 접수 완료 → 담당자 수동 확인 예정"을 뜻한다(CRM 저장을 단정하지 않음).

const ALLOW_HOSTS = new Set([
  "start.glovek.space",
  "batch.glovek.space",
  "batch2.glovek.space",
  "sea.glovek.space",
  "glovek.space",
  "www.glovek.space",
]);
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
    return NextResponse.json({ ok: true, receipt: inquiryReceiptNo(0), delivery: "manual_review", spam: true }, { headers: NS });
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

    // durable 저장(멱등) — crm_status='manual_review'(자동 CRM 전달 없음, 담당자 수동 확인 대상).
    // 과거 레거시 행(예: INQ-0001)의 crm_status/필드는 그대로 보존한다.
    const ins = await sql<{ id: number }>`
      INSERT INTO launch_batch_inquiries
        (request_id, payload_hash, name, email, phone, brand, message, source_site,
         consent, consent_version, consent_at, is_test, crm_status, ip_hash, user_agent)
      VALUES
        (${reqId}, ${hash}, ${d.name}, ${d.email}, ${d.phone}, ${d.brand}, ${d.message}, ${site},
         true, ${CONSENT_VERSION}, now(), ${d.isTest}, 'manual_review', ${ipHash}, ${ua})
      ON CONFLICT (request_id) DO NOTHING
      RETURNING id`;

    let id = ins.rows[0]?.id;
    if (id == null) {
      // 동일 requestId 재시도 — 기존 행 확인(멱등). payload/site 불일치는 접수 거부(409).
      const ex = await sql<{ id: number; payload_hash: string | null; source_site: string | null }>`
        SELECT id, payload_hash, source_site FROM launch_batch_inquiries WHERE request_id = ${reqId} LIMIT 1`;
      const row = ex.rows[0];
      if (!row) throw new Error("insert-conflict-but-missing");
      if (row.payload_hash && row.payload_hash !== hash) {
        return NextResponse.json({ ok: false, error: "이미 다른 내용으로 접수된 요청입니다. 새로고침 후 다시 작성해 주세요." }, { status: 409, headers: NS });
      }
      if (isKnownSite(row.source_site) && isKnownSite(site) && row.source_site !== site) {
        return NextResponse.json({ ok: false, error: "이미 다른 사이트에서 접수된 요청입니다. 새로고침 후 다시 작성해 주세요." }, { status: 409, headers: NS });
      }
      id = row.id; // 동일 재시도 — 멱등(기존 source_site/crm_status 보존)
    }

    // 응답: 로컬 durable 접수 성공. delivery:"manual_review" = 담당자(Codex 포함)가 관리자에서 확인 예정.
    // CRM 저장을 단정하지 않는다(자동 전달 없음).
    return NextResponse.json({ ok: true, receipt: inquiryReceiptNo(id), delivery: "manual_review" }, { headers: NS });
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

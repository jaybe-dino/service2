import { NextResponse } from "next/server";
import crypto from "crypto";
import { sql, isConfigured } from "@/lib/db";
import {
  validateApplication,
  ensureLaunchBatchTable,
  hashIp,
  receiptNo,
  siteFromHost,
  CONSENT_VERSION,
  type CleanApplication,
} from "@/lib/launch-batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 글로벌 진출 배치 1기 — 공개 신청 접수(메일 앱 없이 서버 DB 저장).
// 외부 전달 없음. 전용 테이블에만 적재. no-store.

// 동일 출처(또는 승인 호스트)만 허용 — CSRF/크로스사이트 POST 차단.
const ALLOW_HOSTS = new Set(["start.glovek.space", "batch.glovek.space", "glovek.space", "www.glovek.space"]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sameOriginOk(req: Request): boolean {
  const host = req.headers.get("host") || "";
  const origin = req.headers.get("origin");
  if (origin) {
    let oHost = "";
    try { oHost = new URL(origin).host; } catch { return false; }
    return oHost === host || ALLOW_HOSTS.has(oHost);
  }
  // Origin 부재(비브라우저) — 승인 호스트일 때만 허용
  return ALLOW_HOSTS.has(host);
}

function payloadHash(d: CleanApplication): string {
  const norm = JSON.stringify({
    b: d.brand, m: d.manager, e: d.email, ph: d.phone, p: d.productUrl, rf: d.referrer,
    r: [...d.regions].sort(), s: [...d.seaCountries].sort(), msg: d.message,
  });
  return crypto.createHash("sha256").update(norm).digest("hex").slice(0, 32);
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  return (xff.split(",")[0] || req.headers.get("x-real-ip") || "").trim() || "0.0.0.0";
}

export async function POST(req: Request) {
  // 1) 출처 검증
  if (!sameOriginOk(req)) {
    return NextResponse.json({ ok: false, error: "허용되지 않은 출처입니다." }, { status: 403, headers: { "cache-control": "no-store" } });
  }
  // 2) 요청 크기 제한
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 20000) {
    return NextResponse.json({ ok: false, error: "요청이 너무 큽니다." }, { status: 413, headers: { "cache-control": "no-store" } });
  }
  // 3) DB 설정 확인(거짓 성공 금지)
  if (!isConfigured()) {
    return NextResponse.json({ ok: false, error: "접수 시스템이 일시적으로 설정되지 않았습니다. 잠시 후 다시 시도하거나 메일/전화로 문의해 주세요." }, { status: 503, headers: { "cache-control": "no-store" } });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  // 4) 허니팟 — 숨은 필드에 값이 있으면 봇. 저장하지 않고 조용히 성공 응답.
  if (String(body.company_website ?? "").trim() !== "") {
    return NextResponse.json({ ok: true, receipt: receiptNo(0), spam: true }, { headers: { "cache-control": "no-store" } });
  }

  // 5) 동의 필수
  if (body.consent !== true) {
    return NextResponse.json({ ok: false, error: "개인정보 수집·이용 동의가 필요합니다." }, { status: 400, headers: { "cache-control": "no-store" } });
  }

  // 6) 검증 + 서버 비용 산정
  const v = validateApplication(body);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 400, headers: { "cache-control": "no-store" } });
  }
  const d = v.data;

  // 7) requestId(멱등키) — 유효 UUID 아니면 서버 발급
  const reqId = typeof body.requestId === "string" && UUID_RE.test(body.requestId) ? body.requestId.toLowerCase() : crypto.randomUUID();
  const hash = payloadHash(d);
  const ipHash = hashIp(clientIp(req));
  const ua = String(req.headers.get("user-agent") || "").slice(0, 300);
  // 유입 사이트는 canonical 요청 Host로만 판정(body/Referer/x-forwarded-host 미신뢰).
  const site = siteFromHost(req.headers.get("host"));

  try {
    await ensureLaunchBatchTable();

    // 8) 기본 속도 제한 — 동일 IP 10분 내 8건 초과 차단(테스트/실IP 공통).
    const rl = await sql<{ c: number }>`
      SELECT COUNT(*)::int AS c FROM launch_batch_applications
      WHERE ip_hash = ${ipHash} AND created_at > now() - interval '10 minutes'`;
    if ((rl.rows[0]?.c ?? 0) >= 8) {
      return NextResponse.json({ ok: false, error: "요청이 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429, headers: { "cache-control": "no-store" } });
    }

    // 9) 멱등 삽입 — 동일 requestId 재시도는 중복 접수하지 않음
    // source_site는 payload_hash(legacy 포맷)에 넣지 않음 — 기존 접수 재시도가 409가 되지 않도록.
    const ins = await sql<{ id: number }>`
      INSERT INTO launch_batch_applications
        (request_id, payload_hash, brand, manager, email, phone, source_site, product_url, referrer, regions, sea_countries,
         message, region_count, cost_supply, cost_incl, consent, consent_version, consent_at,
         is_test, ip_hash, user_agent)
      VALUES
        (${reqId}, ${hash}, ${d.brand}, ${d.manager}, ${d.email}, ${d.phone}, ${site}, ${d.productUrl}, ${d.referrer},
         ${JSON.stringify(d.regions)}, ${JSON.stringify(d.seaCountries)},
         ${d.message}, ${d.regionCount}, ${d.costSupply}, ${d.costIncl},
         true, ${CONSENT_VERSION}, now(), ${d.isTest}, ${ipHash}, ${ua})
      ON CONFLICT (request_id) DO NOTHING
      RETURNING id`;

    let id = ins.rows[0]?.id;
    if (id == null) {
      // 충돌 — 기존 접수 조회. 같은 UUID에 다른 내용이면 일관성 오류(409).
      const ex = await sql<{ id: number; payload_hash: string | null; source_site: string | null }>`
        SELECT id, payload_hash, source_site FROM launch_batch_applications WHERE request_id = ${reqId} LIMIT 1`;
      const row = ex.rows[0];
      if (!row) throw new Error("insert-conflict-but-missing");
      if (row.payload_hash && row.payload_hash !== hash) {
        return NextResponse.json({ ok: false, error: "이미 다른 내용으로 접수된 요청입니다. 새로고침 후 다시 작성해 주세요." }, { status: 409, headers: { "cache-control": "no-store" } });
      }
      // 교차 사이트 UUID 충돌 — 기존·신규 모두 known(start/batch)이고 서로 다르면 409.
      // 기존 null(legacy)/unknown은 재분류·덮어쓰지 않고 동일 재시도를 허용(기존 source_site 보존).
      const exSite = row.source_site;
      if ((exSite === "start" || exSite === "batch") && (site === "start" || site === "batch") && exSite !== site) {
        return NextResponse.json({ ok: false, error: "이미 다른 사이트에서 접수된 요청입니다. 새로고침 후 다시 작성해 주세요." }, { status: 409, headers: { "cache-control": "no-store" } });
      }
      id = row.id; // 동일 재시도 — 멱등 성공(기존 source_site 유지)
    }

    return NextResponse.json(
      { ok: true, receipt: receiptNo(id), test: d.isTest || undefined },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    // 중요한 접수 데이터는 일반 로그에 남기지 않음. 명확한 실패 + 재시도 안내.
    return NextResponse.json(
      { ok: false, error: "접수 저장에 실패했습니다. 잠시 후 다시 시도해 주세요. 문제가 계속되면 메일/전화로 문의해 주세요." },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}

// 그 외 메서드 차단
export async function GET() {
  return NextResponse.json({ ok: false, error: "method not allowed" }, { status: 405, headers: { "cache-control": "no-store" } });
}

// 운영 어드민(tiktokadmin) 인제스트 송신 — glovek 이벤트를 웹훅(POST)으로 전달.
// 스펙: tiktokadmin/docs/integration/glovek.space.md
//  - POST {ADMIN_INGEST_URL}/api/ingest/{lead|diagnosis|payment}
//  - 헤더: X-Ingest-Secret / X-Idempotency-Key / Content-Type: application/json
//  - 미설정(ADMIN_INGEST_URL 없음) 시 no-op. 실패해도 사용자 플로우는 막지 않는다(fire-and-forget).
//  - 재시도: 최초 실패 후 1회. 400/401은 즉시 중단(스펙).

export type IngestEvent = "lead" | "diagnosis" | "payment" | "onboarding";

function ingestSecret(): string {
  // 전용 변수 우선 — INGEST_SECRET은 Apify 인바운드 웹훅 인증에도 쓰여 겸용 시 값이 공유됨.
  return process.env.ADMIN_INGEST_SECRET || process.env.INGEST_SECRET || "";
}

// 결과 반환형 lead 전송 — 문의 durable 저장 후 crm_status(sent/failed/skipped_unset) 기록용.
// 기존 sendIngest와 동일한 서명(X-Ingest-Secret)·멱등키·재시도(1회)·canonical env URL을 재사용한다.
// 개인정보는 JSON body로만 전송하며 일반 로그에 남기지 않는다(상태/코드만 로깅).
export type LeadIngestResult = { status: "sent" | "failed" | "skipped_unset"; httpStatus?: number; brandId?: string };
export async function sendLeadIngestResult(idemKey: string, body: Record<string, unknown>): Promise<LeadIngestResult> {
  const url = process.env.ADMIN_INGEST_URL;
  if (!url) return { status: "skipped_unset" }; // 미설정 → 거짓 성공 금지. 로컬 저장만 유지(재시도 가능).
  let lastStatus: number | undefined;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${url.replace(/\/$/, "")}/api/ingest/lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Ingest-Secret": ingestSecret(),
          "X-Idempotency-Key": idemKey,
        },
        body: JSON.stringify({ site: "glovek", occurred_at: new Date().toISOString(), ...body }),
        signal: AbortSignal.timeout(4000),
      });
      lastStatus = res.status;
      if (res.ok) {
        let brandId: string | undefined;
        try { const j = await res.json(); if (j && typeof j.brand_id !== "undefined") brandId = String(j.brand_id); } catch { /* ignore */ }
        return { status: "sent", httpStatus: res.status, brandId };
      }
      if (res.status === 400 || res.status === 401 || res.status === 404) {
        console.error("[ingest:lead] 거부", idemKey, res.status); // PII 미포함
        return { status: "failed", httpStatus: res.status };
      }
    }
  } catch (e) {
    console.error("[ingest:lead] 예외", idemKey, (e as Error).message); // PII 미포함
  }
  return { status: "failed", httpStatus: lastStatus };
}

export async function sendIngest(event: IngestEvent, idemKey: string, body: Record<string, unknown>): Promise<void> {
  const url = process.env.ADMIN_INGEST_URL;
  if (!url) return;
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`${url.replace(/\/$/, "")}/api/ingest/${event}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Ingest-Secret": ingestSecret(),
          "X-Idempotency-Key": idemKey,
        },
        body: JSON.stringify({ site: "glovek", occurred_at: new Date().toISOString(), ...body }),
        signal: AbortSignal.timeout(4000), // 유저 응답 지연 방지(호출부는 after()로 응답 후 실행)
      });
      if (res.ok) return;
      if (res.status === 400 || res.status === 401 || res.status === 404) { // 스키마/인증/미구현 엔드포인트 → 재시도 무의미
        console.error("[ingest] 거부", event, idemKey, res.status, (await res.text().catch(() => "")).slice(0, 200));
        return;
      }
    }
    console.error("[ingest] 재시도 후 실패", event, idemKey);
  } catch (e) {
    console.error("[ingest] 실패", event, idemKey, (e as Error).message);
  }
}

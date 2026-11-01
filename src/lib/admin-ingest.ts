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

// 문의(/api/launch-batch/inquiry)는 자동 CRM 전달을 하지 않고 로컬 durable 저장 + 관리자 수동 확인으로
// 처리하므로, 문의 전용 결과반환 helper(sendLeadIngestResult)와 선택적 채널 경로는 제거했다.
// 아래 sendIngest(일반 이벤트 전달)와 다른 접수 경로는 변경하지 않는다.

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

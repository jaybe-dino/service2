// 운영 어드민(tiktokadmin) 인제스트 송신 — glovek 이벤트를 웹훅(POST)으로 전달.
// 스펙: tiktokadmin/docs/integration/glovek.space.md
//  - POST {ADMIN_INGEST_URL}/api/ingest/{lead|diagnosis|payment}
//  - 헤더: X-Ingest-Secret / X-Idempotency-Key / Content-Type: application/json
//  - 미설정(ADMIN_INGEST_URL 없음) 시 no-op. 실패해도 사용자 플로우는 막지 않는다(fire-and-forget).
//  - 재시도: 최초 실패 후 1회. 400/401은 즉시 중단(스펙).

export type IngestEvent = "lead" | "diagnosis" | "payment";

function ingestSecret(): string {
  // 전용 변수 우선 — INGEST_SECRET은 Apify 인바운드 웹훅 인증에도 쓰여 겸용 시 값이 공유됨.
  return process.env.ADMIN_INGEST_SECRET || process.env.INGEST_SECRET || "";
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
      if (res.status === 400 || res.status === 401) {
        console.error("[ingest] 거부", event, idemKey, res.status, (await res.text().catch(() => "")).slice(0, 200));
        return;
      }
    }
    console.error("[ingest] 재시도 후 실패", event, idemKey);
  } catch (e) {
    console.error("[ingest] 실패", event, idemKey, (e as Error).message);
  }
}

import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import collectMaster from "@/data/ktrend/collect-brands.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type MasterRow = { name: string; korean?: string | null; handle?: string | null; isNew: boolean };

// 확장 브랜드 마스터(422개)를 수집 파이프라인에 시드.
// - 전체: brand_tracking 등록(주간 168h, 비용 최소화)
// - 신규(376): brand_requests pending 등록 → 1년치 1차학습 백필 대상
export async function POST() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  // 이전 파싱 버그로 잘못 적재된 항목 정리(한글/괄호 포함 이름 = 오파싱) — 중복 큐/추적 제거
  const cleanReq = await sql`DELETE FROM brand_requests
    WHERE source='master' AND (brand_name ~ '[가-힣]' OR brand_name LIKE '%(%')`;
  await sql`DELETE FROM brand_tracking WHERE brand_name ~ '[가-힣]' OR brand_name LIKE '%(%'`;
  await sql`DELETE FROM brand_stats WHERE brand_name ~ '[가-힣]' OR brand_name LIKE '%(%'`;
  await sql`DELETE FROM videos WHERE brand_name ~ '[가-힣]' OR brand_name LIKE '%(%'`;

  const rows = collectMaster as MasterRow[];
  let tracked = 0;
  let queued = 0;

  for (const b of rows) {
    const name = b.name?.trim();
    if (!name) continue;
    const handle = b.handle ?? null;

    // 추적 등록(중복 안전): 신규는 주간(168h), 기존 중복은 24h 유지
    const interval = b.isNew ? 168 : 24;
    await sql`INSERT INTO brand_tracking (brand_name, tracked, interval_hours, handle, updated_at)
              VALUES (${name}, true, ${interval}, ${handle}, now())
              ON CONFLICT (brand_name) DO UPDATE SET tracked=true, updated_at=now()`;
    tracked += 1;

    if (b.isNew) {
      // 이미 active/collecting/failed 면 재큐잉하지 않음(중복 사전 방지)
      const exists = await sql`SELECT 1 FROM brand_requests WHERE brand_name=${name} LIMIT 1`;
      if (exists.rows.length === 0) {
        await sql`INSERT INTO brand_requests (brand_name, handle, source, status, note)
                  VALUES (${name}, ${handle}, 'master', 'pending', '1y-backfill')`;
        queued += 1;
      }
    }
  }

  return NextResponse.json({ ok: true, total: rows.length, tracked, queued, cleaned: cleanReq.rowCount ?? 0 });
}

import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getCollectRegions } from "@/lib/collect-run";
import { COUNTRIES } from "@/data/ktrend/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 크롤링 대상 지역 화이트리스트 = 활성 국가(US + 동남아). 그 외 코드는 거부.
const ALLOWED = new Set(COUNTRIES.filter((c) => c.active).map((c) => c.id));

// 현재 수집 지역 조회
export async function GET() {
  if (!isConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  await ensureSchema();
  return NextResponse.json({
    ok: true,
    regions: await getCollectRegions(),
    options: COUNTRIES.filter((c) => c.active).map((c) => ({ id: c.id, nameKo: c.nameKo, flag: c.flag })),
  });
}

// 수집 지역 저장 (즉시 적용 — 재배포 불필요). US는 항상 포함(기본 시장).
export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { regions?: unknown };
  const raw = Array.isArray(b?.regions) ? b.regions : [];
  const regions = Array.from(
    new Set(["US", ...raw.map((x) => String(x).toUpperCase()).filter((x) => ALLOWED.has(x))]),
  );
  await ensureSchema();
  await sql`INSERT INTO admin_settings (key, value, updated_at)
            VALUES ('collect_regions', ${JSON.stringify({ regions })}::jsonb, now())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  return NextResponse.json({ ok: true, regions });
}

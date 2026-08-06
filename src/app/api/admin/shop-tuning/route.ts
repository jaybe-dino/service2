import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { getShopTuning, getShopCountries, DEFAULT_SHOP_TUNING } from "@/lib/collect-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["US", "TH", "VN", "MY", "SG", "ID", "PH", "GB", "JP"];
const clamp = (n: unknown, def: number, max: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v > 0 ? Math.min(v, max) : def;
};

// 샵 수집 강도/국가 조회 (어드민)
export async function GET() {
  if (!isConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  await ensureSchema();
  return NextResponse.json({ ok: true, tuning: await getShopTuning(), countries: await getShopCountries(), defaults: DEFAULT_SHOP_TUNING, allowed: ALLOWED });
}

// 저장 — 즉시 적용(재배포 불필요). body: { tuning?, countries?[] }
export async function POST(req: Request) {
  if (!isConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as { tuning?: Record<string, unknown>; countries?: unknown[] };

  if (b.tuning) {
    const t = b.tuning;
    const tuning = {
      maxItems: clamp(t.maxItems, DEFAULT_SHOP_TUNING.maxItems, 3000),
      maxBrands: clamp(t.maxBrands, DEFAULT_SHOP_TUNING.maxBrands, 200),
      maxRunning: clamp(t.maxRunning, DEFAULT_SHOP_TUNING.maxRunning, 200),
      maxPoll: clamp(t.maxPoll, DEFAULT_SHOP_TUNING.maxPoll, 25),
      retryDays: clamp(t.retryDays, DEFAULT_SHOP_TUNING.retryDays, 30),
    };
    await sql`INSERT INTO admin_settings (key, value, updated_at)
              VALUES ('shop_tuning', ${JSON.stringify(tuning)}::jsonb, now())
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  }
  if (Array.isArray(b.countries)) {
    const countries = b.countries.map((x) => String(x).toUpperCase()).filter((x) => ALLOWED.includes(x));
    const final = countries.length ? Array.from(new Set(countries)) : ["US"]; // 최소 US 1개 보장
    await sql`INSERT INTO admin_settings (key, value, updated_at)
              VALUES ('shop_countries', ${JSON.stringify({ countries: final })}::jsonb, now())
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
  }
  return NextResponse.json({ ok: true, tuning: await getShopTuning(), countries: await getShopCountries() });
}

import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { isCollectPaused, getCollectSwitches } from "@/lib/collect-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 수집 제어판 — 전체 정지 + 트랙별(영상/샵) on/off + 액터 현황·비용. 재배포 불필요.
function actorInfo() {
  const video = process.env.APIFY_ACTOR || "clockworks~tiktok-scraper";
  const shop = process.env.SHOP_ACTOR || "";
  const profile = process.env.PROFILE_ACTOR || video;
  return {
    video: { actor: video, configured: !!process.env.SCRAPER_API_KEY, cost: "결과당 과금(비쌈) — 매 영상마다 청구. 예: $0.003/영상", warn: true },
    shop: { actor: shop, configured: !!(process.env.SCRAPER_API_KEY && shop), cost: "결과당 저렴 — 예: $1.60/1k 상품", warn: false },
    profile: { actor: profile, configured: !!process.env.SCRAPER_API_KEY, cost: "이메일 배치 크롤용(영상 액터 재사용 또는 PROFILE_ACTOR)", warn: false },
  };
}

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return NextResponse.json({ ok: true, paused: await isCollectPaused(), switches: await getCollectSwitches(), actors: actorInfo() });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as { paused?: boolean; switches?: { video?: boolean; shop?: boolean } };

  if (typeof b.paused === "boolean") {
    await sql`INSERT INTO admin_settings (key, value, updated_at) VALUES ('collect_paused', ${JSON.stringify({ paused: b.paused })}::jsonb, now())
              ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`;
  }
  if (b.switches && typeof b.switches === "object") {
    const cur = await getCollectSwitches();
    const next = { video: b.switches.video ?? cur.video, shop: b.switches.shop ?? cur.shop };
    await sql`INSERT INTO admin_settings (key, value, updated_at) VALUES ('collect_switches', ${JSON.stringify(next)}::jsonb, now())
              ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`;
  }
  return NextResponse.json({ ok: true, paused: await isCollectPaused(), switches: await getCollectSwitches() });
}

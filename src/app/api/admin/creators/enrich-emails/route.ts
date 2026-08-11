import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { scrapeProfiles, scraperConfigured, scrapeEmailsViaActor, emailActorConfigured } from "@/lib/collector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 기존 크리에이터 프로필 배치 크롤 → bio·이메일·팔로워·인증 채움. 한 번에 다 안 하고 배치로.
// GET: 진행 현황(총/보강완료/이메일보유/남은). POST { batch } : 다음 배치만 처리.
async function stats() {
  const r = (await sql<{ total: number; enriched: number; with_email: number }>`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE bio IS NOT NULL)::int AS enriched,
           count(*) FILTER (WHERE email IS NOT NULL AND email <> '')::int AS with_email
    FROM creators WHERE handle IS NOT NULL AND handle <> ''`).rows;
  const s = r[0] || { total: 0, enriched: 0, with_email: 0 };
  return { total: Number(s.total), enriched: Number(s.enriched), withEmail: Number(s.with_email), remaining: Math.max(0, Number(s.total) - Number(s.enriched)) };
}

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  return NextResponse.json({ ok: true, configured: scraperConfigured() || emailActorConfigured(), via: emailActorConfigured() ? "email-actor" : "profile", ...(await stats()) });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  const useEmailActor = emailActorConfigured(); // 전용 이메일 actor(EMAIL_ACTOR) 있으면 우선
  if (!useEmailActor && !scraperConfigured()) return NextResponse.json({ ok: false, error: "SCRAPER_API_KEY 또는 EMAIL_ACTOR 미설정" }, { status: 503 });
  await ensureSchema();
  const b = (await req.json().catch(() => ({}))) as { batch?: number };
  // 전용 이메일 actor는 소량 동기 처리에 강함 → 배치 상한 확대(기본 20, 상한 100).
  const take = Math.max(1, Math.min(useEmailActor ? 100 : 40, Number(b.batch) || 20));

  // 아직 프로필 보강 안 된(bio NULL) 크리에이터를 조회수 높은 순으로.
  const rows = (await sql<{ handle: string }>`
    SELECT handle FROM creators
    WHERE bio IS NULL AND handle IS NOT NULL AND handle <> ''
      AND handle NOT IN (SELECT value FROM blocklist WHERE kind='handle')
    ORDER BY total_views DESC NULLS LAST LIMIT ${take}`).rows;
  if (!rows.length) return NextResponse.json({ ok: true, processed: 0, foundEmail: 0, reason: "보강 대상 없음(모두 완료)", via: useEmailActor ? "email-actor" : "profile", ...(await stats()) });

  const handles = rows.map((r) => r.handle);
  let processed = 0, foundEmail = 0, err = "";
  try {
    if (useEmailActor) {
      // 이메일 전용 actor: email만 반환. 처리 표시로 bio=''(빈)로 마킹.
      const got = new Map((await scrapeEmailsViaActor(handles)).map((p) => [p.handle.toLowerCase(), p.email]));
      for (const h of handles) {
        const email = got.get(h.toLowerCase()) || null;
        await sql`UPDATE creators SET email = COALESCE(${email}, email), bio = COALESCE(bio, ''), updated_at = now() WHERE handle = ${h}`;
        processed += 1;
        if (email) foundEmail += 1;
      }
    } else {
      const profs = await scrapeProfiles(handles);
      const got = new Map(profs.map((p) => [p.handle.toLowerCase(), p]));
      for (const h of handles) {
        const p = got.get(h.toLowerCase());
        const bio = p?.bio ?? ""; // 결과 없으면 bio=''로 마킹(무한재시도 방지)
        await sql`UPDATE creators SET
          bio = ${bio}, email = COALESCE(${p?.email ?? null}, email),
          followers = COALESCE(${p?.followers ?? null}, followers),
          verified = ${!!p?.verified} OR verified, updated_at = now() WHERE handle = ${h}`;
        processed += 1;
        if (p?.email) foundEmail += 1;
      }
    }
  } catch (e) {
    err = String(e instanceof Error ? e.message : e).slice(0, 200);
  }
  return NextResponse.json({ ok: !err, processed, foundEmail, via: useEmailActor ? "email-actor" : "profile", error: err || undefined, ...(await stats()) });
}

import { NextResponse, after } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isAdminAuthed } from "@/lib/admin-auth";
import { gradeFromChecks, missingCerts, SELF_CHECK_QUESTIONS } from "@/lib/onboarding";
import { sendIngest } from "@/lib/admin-ingest";
import { syncOnboardingToAdmin } from "@/lib/onboarding-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRACKS = ["live", "guarantee", "onboarding"];

// 온보딩 신청 저장 (사용자당 1건 upsert, 단계별 누적 병합).
// stage="self_check": 자가체크/국가/인증/등급/추천 + 추천인코드
// stage="details":    브랜드·제품·정산 상세 정보 입력
export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const stage = String(body?.stage ?? "self_check");
  await ensureSchema();
  const id = `onb_${me.id}`;

  // 기존 페이로드 병합 (단계별 누적)
  const prev = await sql`SELECT payload, status FROM onboarding_applications WHERE id=${id} LIMIT 1`;
  const base = (prev.rows[0]?.payload as Record<string, unknown>) ?? {};
  const prevStatus = String(prev.rows[0]?.status ?? "");

  if (stage === "self_check") {
    const checks = (body?.checks ?? {}) as Record<string, boolean>;
    const yes = SELF_CHECK_QUESTIONS.filter((q) => checks[q.id]).length;
    const g = gradeFromChecks(yes);
    const countries: string[] = Array.isArray(body?.countries) ? body.countries.slice(0, 5) : [];
    const certs = (body?.certs ?? {}) as Record<string, string>;
    const referral = String(body?.referral ?? "").trim().slice(0, 60) || null;
    const track = TRACKS.includes(String(body?.track)) ? String(body?.track) : g.recommended;
    const payload = { ...base, checks, yes, countries, certs, referral };
    await sql`INSERT INTO onboarding_applications (id, user_id, email, track, grade, recommended_track, countries, referral_code, phase, status, payload, updated_at)
              VALUES (${id}, ${me.id}, ${me.email}, ${track}, ${g.grade}, ${g.recommended}, ${countries.join(",")}, ${referral}, 'track_select', 'self_checked', ${JSON.stringify(payload)}::jsonb, now())
              ON CONFLICT (id) DO UPDATE SET
                track=EXCLUDED.track, grade=EXCLUDED.grade, recommended_track=EXCLUDED.recommended_track,
                countries=EXCLUDED.countries, referral_code=COALESCE(EXCLUDED.referral_code, onboarding_applications.referral_code),
                phase=CASE WHEN onboarding_applications.status='paid' THEN onboarding_applications.phase ELSE 'track_select' END,
                status=CASE WHEN onboarding_applications.status='paid' THEN 'paid' ELSE 'self_checked' END,
                payload=${JSON.stringify(payload)}::jsonb, updated_at=now()`;
    // 운영 어드민 인제스트(diagnosis) — 응답 이후 비차단 전송
    const epoch = Date.now();
    after(() => sendIngest("diagnosis", `diag:${id}:${epoch}`, {
      email: me.email,
      grade: g.grade,
      rec_track: g.recommended,
      countries,
      checks,
      missing_certs: missingCerts(countries, certs).map((m) => m.label),
      glovek_onb_id: id,
      source_ref: id,
    }));
    return NextResponse.json({ ok: true, id, grade: g.grade, recommended: g.recommended });
  }

  // 기본정보만 저장(제품 배열은 보존) — 마이페이지 '입점 기본정보' 영역에서 사용. 결제 사용자 전용.
  if (stage === "basic") {
    const brand = String(body?.brand ?? "").trim().slice(0, 200);
    const contact = String(body?.contact ?? "").trim().slice(0, 120);
    if (!brand || !contact) return NextResponse.json({ ok: false, error: "브랜드명과 연락처는 필수입니다." }, { status: 400 });
    // 결제 증빙 확인 — 미결제(자가체크) 사용자가 status를 덮어쓰는 것 방지(결제 플로우 잠금 버그의 근원).
    if (prevStatus !== "paid") {
      const ev = await sql<{ n: number }>`
        SELECT ((SELECT count(*) FROM mall_subscriptions WHERE user_id=${me.id})
              + (SELECT count(*) FROM orders WHERE user_id=${me.id} AND kind='mall' AND status='paid'))::int AS n`;
      if (!((ev.rows[0]?.n ?? 0) > 0)) {
        return NextResponse.json({ ok: false, error: "입점 결제 후 이용할 수 있습니다." }, { status: 403 });
      }
    }
    const prevDetails = (base.details && typeof base.details === "object" ? base.details : {}) as Record<string, unknown>;
    const details = {
      ...prevDetails, // 제품 배열 등 기존 값 보존
      brandKo: brand,
      brandEn: String(body?.brandEn ?? "").trim().slice(0, 200),
      bizNo: String(body?.bizNo ?? "").trim().slice(0, 40),
      repName: String(body?.repName ?? "").trim().slice(0, 80),
      managerName: String(body?.managerName ?? "").trim().slice(0, 80),
      contact,
      email: String(body?.email ?? me.email).trim().slice(0, 200),
      settlement: body?.settlement ?? prevDetails.settlement ?? {},
      bizRegFile: body?.bizRegFile ?? prevDetails.bizRegFile ?? null,
      note: String(body?.note ?? "").trim().slice(0, 2000),
    };
    const payload = { ...base, details };
    await sql`INSERT INTO onboarding_applications (id, user_id, name, brand, contact, email, phase, status, payload, updated_at)
              VALUES (${id}, ${me.id}, ${details.managerName || details.repName}, ${brand}, ${contact}, ${details.email},
                      'completed', 'details_submitted', ${JSON.stringify(payload)}::jsonb, now())
              ON CONFLICT (id) DO UPDATE SET
                name=EXCLUDED.name, brand=EXCLUDED.brand, contact=EXCLUDED.contact, email=EXCLUDED.email,
                phase=CASE WHEN onboarding_applications.status='paid' THEN 'completed' ELSE onboarding_applications.phase END,
                status=CASE WHEN onboarding_applications.status='paid' THEN 'paid' ELSE 'details_submitted' END,
                payload=${JSON.stringify(payload)}::jsonb, updated_at=now()`;
    // 운영 어드민 인제스트(onboarding 스냅샷) — 기업 제출 데이터 전체 동기화(응답 후 비차단)
    after(() => syncOnboardingToAdmin(me.id));
    return NextResponse.json({ ok: true, id });
  }

  if (stage === "details") {
    const brand = String(body?.brand ?? "").trim().slice(0, 200);
    const contact = String(body?.contact ?? "").trim().slice(0, 120);
    if (!brand || !contact) return NextResponse.json({ ok: false, error: "브랜드명과 연락처는 필수입니다." }, { status: 400 });
    const details = {
      brandKo: brand,
      brandEn: String(body?.brandEn ?? "").trim().slice(0, 200),
      bizNo: String(body?.bizNo ?? "").trim().slice(0, 40),
      repName: String(body?.repName ?? "").trim().slice(0, 80),
      managerName: String(body?.managerName ?? "").trim().slice(0, 80),
      contact,
      email: String(body?.email ?? me.email).trim().slice(0, 200),
      meetingType: String(body?.meetingType ?? "").slice(0, 40),
      meetingSlots: Array.isArray(body?.meetingSlots) ? body.meetingSlots.slice(0, 6) : [],
      products: Array.isArray(body?.products) ? body.products.slice(0, 30) : [],
      settlement: body?.settlement ?? {},
      bizRegFile: body?.bizRegFile ?? null, // {id, filename}
      note: String(body?.note ?? "").trim().slice(0, 2000),
    };
    const payload = { ...base, details };
    // upsert — 신청 행이 없어도(자가체크 스킵/결제만) 추가정보가 유실되지 않게 생성/갱신.
    await sql`INSERT INTO onboarding_applications (id, user_id, name, brand, contact, email, phase, status, payload, updated_at)
              VALUES (${id}, ${me.id}, ${details.managerName || details.repName}, ${brand}, ${contact}, ${details.email},
                      'completed', 'details_submitted', ${JSON.stringify(payload)}::jsonb, now())
              ON CONFLICT (id) DO UPDATE SET
                name=EXCLUDED.name, brand=EXCLUDED.brand, contact=EXCLUDED.contact, email=EXCLUDED.email,
                phase='completed',
                status=CASE WHEN onboarding_applications.status='paid' THEN 'paid' ELSE 'details_submitted' END,
                payload=${JSON.stringify(payload)}::jsonb, updated_at=now()`;
    // 운영 어드민 인제스트(onboarding 스냅샷) — 기업 제출 데이터 전체 동기화(응답 후 비차단)
    after(() => syncOnboardingToAdmin(me.id));
    return NextResponse.json({ ok: true, id });
  }

  return NextResponse.json({ ok: false, error: "알 수 없는 단계" }, { status: 400 });
}

// 어드민: 신청 목록
export async function GET() {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  if (!(await isAdminAuthed())) return NextResponse.json({ ok: false, error: "권한 없음" }, { status: 403 });
  await ensureSchema();
  // 백필: 결제(mall_subscriptions)했지만 신청 행이 없던 사용자 → 어드민 목록에 뜨게 stub 생성.
  await sql`INSERT INTO onboarding_applications (id, user_id, name, brand, email, track, phase, status, amount, dino_linked, updated_at)
            SELECT ${"onb_"} || ms.user_id, ms.user_id, u.name, u.brand, u.email, ms.track, 'details', 'paid', ms.amount, true, now()
            FROM mall_subscriptions ms JOIN users u ON u.id = ms.user_id
            WHERE NOT EXISTS (SELECT 1 FROM onboarding_applications oa WHERE oa.id = ${"onb_"} || ms.user_id)
            ON CONFLICT (id) DO NOTHING`;
  const { rows } = await sql`
    SELECT id, user_id, name, brand, contact, email, track, grade, recommended_track, countries, term,
           amount, phase, referral_code, status, order_id, payload,
           extract(epoch from created_at)*1000 AS created_ms,
           extract(epoch from updated_at)*1000 AS updated_ms
    FROM onboarding_applications ORDER BY updated_at DESC LIMIT 500`;
  return NextResponse.json({ ok: true, items: rows });
}

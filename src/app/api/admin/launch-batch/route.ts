import { NextResponse } from "next/server";
import { sql, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { ensureLaunchBatchTable, STATUSES, type Status } from "@/lib/launch-batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 글로벌 진출 배치 1기 — 전용 관리자 API. 페이지·API 모두 서버측 인증.
// 비인증 401. no-store. 익명 id 열거/조회 불가.

const NS = { "cache-control": "no-store" };

function sameOriginOk(req: Request): boolean {
  const host = req.headers.get("host") || "";
  const origin = req.headers.get("origin");
  if (!origin) return true; // 안전 메서드/동일출처 네비게이션 — 아래 PATCH에서만 호출
  try { return new URL(origin).host === host; } catch { return false; }
}

interface Row {
  id: number;
  brand: string;
  manager: string;
  email: string;
  phone: string | null;
  product_url: string | null;
  regions: unknown;
  sea_countries: unknown;
  message: string | null;
  region_count: number;
  cost_supply: number;
  cost_incl: number;
  consent: boolean;
  consent_version: string | null;
  consent_at: string | null;
  is_test: boolean;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NS });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503, headers: NS });

  const url = new URL(req.url);
  const idParam = url.searchParams.get("id");

  // 상세 조회 — id 검증(DB 접근 전)
  if (idParam) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "id 오류" }, { status: 400, headers: NS });
    await ensureLaunchBatchTable();
    const { rows } = await sql<Row>`SELECT * FROM launch_batch_applications WHERE id = ${id} LIMIT 1`;
    if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404, headers: NS });
    return NextResponse.json({ item: rows[0] }, { headers: NS });
  }

  // 목록 — 검색(브랜드/이메일/전화번호), 상태 필터, 테스트 포함 여부
  const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
  const like = "%" + q + "%";
  const qDigits = q.replace(/\D/g, ""); // 전화번호는 정규화(숫자) 저장이라 숫자만으로도 매칭
  const likeDigits = "%" + qDigits + "%";
  const statusFilter = url.searchParams.get("status") || "";
  const status = STATUSES.includes(statusFilter as Status) ? statusFilter : "";
  const includeTest = url.searchParams.get("test") === "1";

  await ensureLaunchBatchTable();
  const { rows } = await sql<Row>`
    SELECT id, brand, manager, email, phone, regions, region_count, cost_incl,
           is_test, status, created_at, updated_at
    FROM launch_batch_applications
    WHERE (${q} = '' OR brand ILIKE ${like} OR email ILIKE ${like}
           OR (${qDigits} <> '' AND phone ILIKE ${likeDigits}))
      AND (${status} = '' OR status = ${status})
      AND (${includeTest} OR is_test = false)
    ORDER BY created_at DESC
    LIMIT 300`;

  // 상태별 집계(실집계는 테스트 제외)
  const agg = await sql<{ status: string; c: number }>`
    SELECT status, COUNT(*)::int AS c FROM launch_batch_applications
    WHERE is_test = false GROUP BY status`;
  const counts: Record<string, number> = {};
  for (const r of agg.rows) counts[r.status] = r.c;

  return NextResponse.json({ items: rows, counts }, { headers: NS });
}

export async function PATCH(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NS });
  if (!sameOriginOk(req)) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: NS });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503, headers: NS });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "id 필요" }, { status: 400, headers: NS });

  // 상태/메모 — 둘 중 제공된 것만 갱신 (입력 검증은 DB 접근 전)
  const hasStatus = typeof body.status === "string";
  const hasNote = "note" in body;
  if (!hasStatus && !hasNote) return NextResponse.json({ error: "변경 항목 없음" }, { status: 400, headers: NS });
  if (hasStatus && !STATUSES.includes(body.status as Status)) {
    return NextResponse.json({ error: "status 오류" }, { status: 400, headers: NS });
  }
  const status = hasStatus ? (body.status as string) : null;
  const note = hasNote ? (body.note == null ? null : String(body.note).slice(0, 4000)) : null;

  await ensureLaunchBatchTable();
  const { rows } = await sql<{ id: number }>`
    UPDATE launch_batch_applications SET
      status = COALESCE(${status}, status),
      admin_note = CASE WHEN ${hasNote} THEN ${note} ELSE admin_note END,
      updated_at = now()
    WHERE id = ${id}
    RETURNING id`;
  if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404, headers: NS });
  return NextResponse.json({ ok: true }, { headers: NS });
}

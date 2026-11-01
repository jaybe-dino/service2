import { NextResponse } from "next/server";
import { sql, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { ensureInquiryTable, inquiryReceiptNo, SOURCE_SITES, type SourceSite } from "@/lib/launch-batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 온보딩·문의(/api/launch-batch/inquiry 로 접수) 읽기 전용 관리자 API.
// - 기존 관리자(isAdminAuthed)만 조회(인증 완화·신규 키 없음). 비인증 401. no-store.
// - 자동화(Codex) 증분 조회: after_id 이후(id > after_id) 오름차순, 테스트 기본 제외.
//   응답 { ok, mode:"incremental", items(오름차순), count, has_more, next_cursor }.
// - 쓰기(PATCH/상태변경)는 제공하지 않는다(읽기 전용). 신청(applications)의 상태/메모 PATCH와 무관.

const NS = { "cache-control": "no-store" };

interface InqRow {
  id: number;
  source_site: string | null;
  brand: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  crm_status: string | null;
  is_test: boolean;
  created_at: string;
  updated_at?: string;
  consent_at?: string | null;
}

function withReceipt<T extends { id: number }>(r: T) {
  return { receipt: inquiryReceiptNo(r.id), ...r };
}

export async function GET(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: NS });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503, headers: NS });

  const url = new URL(req.url);

  // 상세 조회 — id 검증(DB 접근 전)
  const idParam = url.searchParams.get("id");
  if (idParam) {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "id 오류" }, { status: 400, headers: NS });
    await ensureInquiryTable();
    const { rows } = await sql<InqRow>`
      SELECT id, source_site, brand, name, email, phone, message, crm_status, is_test, created_at, updated_at, consent_at
      FROM launch_batch_inquiries WHERE id = ${id} LIMIT 1`;
    if (!rows[0]) return NextResponse.json({ error: "not found" }, { status: 404, headers: NS });
    return NextResponse.json({ item: withReceipt(rows[0]) }, { headers: NS });
  }

  // 필터 — 검색(브랜드/이메일/전화), 유입 사이트, 테스트 포함 여부(기본 제외)
  const q = (url.searchParams.get("q") || "").trim().slice(0, 120);
  const like = "%" + q + "%";
  const qDigits = q.replace(/\D/g, "");
  const likeDigits = "%" + qDigits + "%";
  const includeTest = url.searchParams.get("test") === "1";
  const siteFilter = url.searchParams.get("site") || "";
  const site = SOURCE_SITES.includes(siteFilter as SourceSite) ? siteFilter : "";

  // 증분 조회(자동화/Codex용) — after_id 이후(id > after_id)만 오름차순. 테스트 기본 제외.
  const afterIdParam = url.searchParams.get("after_id");
  if (afterIdParam !== null) {
    const afterId = Number(afterIdParam);
    if (!Number.isInteger(afterId) || afterId < 0) return NextResponse.json({ error: "after_id 오류" }, { status: 400, headers: NS });
    await ensureInquiryTable();
    const LIM = 200;
    const inc = await sql<InqRow>`
      SELECT id, source_site, brand, name, email, phone, message, crm_status, is_test, created_at
      FROM launch_batch_inquiries
      WHERE id > ${afterId}
        AND (${q} = '' OR brand ILIKE ${like} OR email ILIKE ${like}
             OR (${qDigits} <> '' AND phone ILIKE ${likeDigits}))
        AND (${includeTest} OR is_test = false)
        AND (${site} = ''
             OR (${site} = 'unknown' AND (source_site = 'unknown' OR source_site IS NULL))
             OR (${site} <> 'unknown' AND source_site = ${site}))
      ORDER BY id ASC
      LIMIT ${LIM + 1}`;
    const hasMore = inc.rows.length > LIM;
    const page = hasMore ? inc.rows.slice(0, LIM) : inc.rows;
    const items = page.map(withReceipt);
    const nextCursor = page.length ? page[page.length - 1].id : afterId;
    return NextResponse.json({ ok: true, mode: "incremental", items, count: items.length, has_more: hasMore, next_cursor: nextCursor }, { headers: NS });
  }

  // 기본 목록 — 최신순, 테스트 기본 제외.
  await ensureInquiryTable();
  const { rows } = await sql<InqRow>`
    SELECT id, source_site, brand, name, email, phone, message, crm_status, is_test, created_at
    FROM launch_batch_inquiries
    WHERE (${q} = '' OR brand ILIKE ${like} OR email ILIKE ${like}
           OR (${qDigits} <> '' AND phone ILIKE ${likeDigits}))
      AND (${includeTest} OR is_test = false)
      AND (${site} = ''
           OR (${site} = 'unknown' AND (source_site = 'unknown' OR source_site IS NULL))
           OR (${site} <> 'unknown' AND source_site = ${site}))
    ORDER BY created_at DESC
    LIMIT 300`;

  // 유입 사이트별 집계(테스트 제외).
  const agg = await sql<{ source_site: string | null; c: number }>`
    SELECT source_site, COUNT(*)::int AS c FROM launch_batch_inquiries
    WHERE is_test = false GROUP BY source_site`;
  const counts: Record<string, number> = {};
  for (const r of agg.rows) counts[r.source_site ?? "unknown"] = r.c;

  return NextResponse.json({ items: rows.map(withReceipt), counts, site }, { headers: NS });
}

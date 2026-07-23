import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 결제(입점)한 사용자의 '제품별 추가 서류/정보' 저장·수정.
// 기본 정보(제품명·카테고리·가격·인증서)는 유지하고, 라벨/실물 사진·라벨 필수표시 확인을 추가 관리.
// onboarding_applications.payload.details.products 에 병합 저장(중복 없이 products 배열 교체).

interface OnbFile { id: string; filename: string }
interface ProductIn {
  nameKo?: string; nameEn?: string; cat?: string; price?: string;
  cert?: OnbFile | null;
  photos?: OnbFile[];
  label?: { productName?: boolean; netQuantity?: boolean; directions?: boolean; ingredients?: boolean; contact?: boolean };
  contactTypes?: string[];
  realPhoto?: boolean;
}

const s = (v: unknown, max = 200) => (v == null ? "" : String(v).slice(0, max));
const CONTACT_TYPES = new Set(["address", "phone", "website"]);

function sanitizeFile(f: unknown, owned: Set<string>): OnbFile | null {
  if (!f || typeof f !== "object") return null;
  const id = s((f as OnbFile).id, 80);
  if (!id || !owned.has(id)) return null; // 본인 소유 파일만 허용
  return { id, filename: s((f as OnbFile).filename, 200) };
}

export async function POST(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "DB 미설정" }, { status: 503 });
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  await ensureSchema();

  // 입점(결제) 신청이 있는 사용자만 (paid/details_submitted/self_checked 등 존재 시)
  const appRows = await sql<{ payload: unknown; status: string }>`
    SELECT payload, status FROM onboarding_applications WHERE user_id=${me.id} LIMIT 1`;
  if (!appRows.rows.length) return NextResponse.json({ ok: false, error: "입점 신청 정보가 없습니다." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { products?: ProductIn[] };
  const inputs = Array.isArray(body.products) ? body.products.slice(0, 100) : [];

  // 참조된 파일 id가 본인 소유인지 검증(타인 파일 참조 차단)
  const refIds = new Set<string>();
  for (const p of inputs) {
    if (p.cert?.id) refIds.add(String(p.cert.id));
    for (const ph of p.photos ?? []) if (ph?.id) refIds.add(String(ph.id));
  }
  const owned = new Set<string>();
  if (refIds.size) {
    const rows = await sql.query<{ id: string }>(
      `SELECT id FROM onboarding_files WHERE user_id=$1 AND id = ANY($2::text[])`,
      [me.id, Array.from(refIds)],
    );
    for (const r of rows.rows) owned.add(r.id);
  }

  const products = inputs.map((p) => ({
    nameKo: s(p.nameKo), nameEn: s(p.nameEn), cat: s(p.cat, 80), price: s(p.price, 40),
    cert: sanitizeFile(p.cert, owned),
    photos: (Array.isArray(p.photos) ? p.photos : []).map((f) => sanitizeFile(f, owned)).filter((f): f is OnbFile => !!f).slice(0, 8),
    label: {
      productName: !!p.label?.productName, netQuantity: !!p.label?.netQuantity, directions: !!p.label?.directions,
      ingredients: !!p.label?.ingredients, contact: !!p.label?.contact,
    },
    contactTypes: (Array.isArray(p.contactTypes) ? p.contactTypes : []).map((x) => s(x, 20)).filter((x) => CONTACT_TYPES.has(x)),
    realPhoto: !!p.realPhoto,
  }));

  const payload = (appRows.rows[0].payload && typeof appRows.rows[0].payload === "object" ? appRows.rows[0].payload : {}) as Record<string, unknown>;
  const details = (payload.details && typeof payload.details === "object" ? payload.details : {}) as Record<string, unknown>;
  details.products = products;
  payload.details = details;

  await sql`UPDATE onboarding_applications SET payload=${JSON.stringify(payload)}::jsonb, updated_at=now() WHERE user_id=${me.id}`;
  return NextResponse.json({ ok: true, count: products.length });
}

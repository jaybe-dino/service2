import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 관리자 CSV 내보내기 — /api/admin/export?type=payments|shopstats
//  payments: orders(paid)+users(+payments tid) → email, brand_name, amount, paid_at(KST), plan
//            ?kind=once|subscribe|mall 로 결제 종류 필터(기본 전체)
//  shopstats: brand_shop_stats(+대표 상품 URL) → brand_name, brand_url, est_gmv, collected_at(KST)
// 인증: 관리자 세션(쿠키). /admin 로그인 상태의 브라우저에서 링크 클릭 시 다운로드.

const KST = (v: unknown): string => {
  if (v == null || v === "") return "";
  const d = new Date(typeof v === "number" || /^\d+$/.test(String(v)) ? Number(v) : String(v));
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("sv-SE", { timeZone: "Asia/Seoul" }); // YYYY-MM-DD HH:mm:ss
};
const cell = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.join(","), ...rows.map((r) => r.map(cell).join(","))];
  return "﻿" + lines.join("\r\n"); // BOM — 엑셀 한글 깨짐 방지
}
function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  if (!(await isAdminAuthed())) return new Response("unauthorized — /admin 로그인 후 이용", { status: 401 });
  if (!isConfigured()) return new Response("DB 미설정", { status: 503 });
  await ensureSchema();

  const url = new URL(req.url);
  const type = url.searchParams.get("type") || "";
  const stamp = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

  if (type === "payments") {
    const kind = (url.searchParams.get("kind") || "").trim(); // once|subscribe|mall, ""=전체
    const r = await sql<{ email: string | null; brand: string | null; amount: number | null; charge_amount: number | null; created_at: string; plan: string | null; kind: string; tid: string | null; pay_at: string | null }>`
      SELECT u.email, u.brand, o.amount, o.charge_amount, o.created_at, o.plan, o.kind, o.tid, p.created_at AS pay_at
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN payments p ON p.payment_id = o.tid
      WHERE o.status = 'paid' AND (${kind} = '' OR o.kind = ${kind})
      ORDER BY o.created_at DESC LIMIT 5000`;
    const rows = r.rows.map((x) => [
      x.email ?? "", x.brand ?? "",
      Number(x.charge_amount ?? x.amount ?? 0),
      KST(x.pay_at ?? x.created_at),
      x.plan ?? "",
      x.kind, // 참고용: once(일회성)/subscribe(Pro정기)/mall(몰정기)
    ]);
    return csvResponse(`glovek-payments-${stamp}.csv`, toCsv(["email", "brand_name", "amount", "paid_at", "plan", "kind"], rows));
  }

  if (type === "shopstats") {
    // brand_url: 스키마에 브랜드 URL 컬럼이 없어 해당 브랜드 최다판매 상품의 TikTok Shop URL로 대체.
    const r = await sql<{ brand_name: string; est_gmv: string | number; updated_at: string; brand_url: string | null }>`
      SELECT bss.brand_name, bss.est_gmv, bss.updated_at,
             (SELECT p.url FROM products p
              WHERE lower(p.brand_name) = lower(bss.brand_name) AND p.url IS NOT NULL AND p.url <> ''
              ORDER BY p.sold_count DESC NULLS LAST LIMIT 1) AS brand_url
      FROM brand_shop_stats bss
      ORDER BY bss.est_gmv DESC LIMIT 5000`;
    const rows = r.rows.map((x) => [x.brand_url ?? "", Math.round(Number(x.est_gmv) || 0), KST(x.updated_at), x.brand_name]);
    return csvResponse(`glovek-shopstats-${stamp}.csv`, toCsv(["brand_url", "est_gmv", "collected_at", "brand_name"], rows));
  }

  return new Response("type=payments 또는 type=shopstats", { status: 400 });
}

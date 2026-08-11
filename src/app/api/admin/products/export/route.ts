import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { classifyProduct, subClassifyProduct } from "@/lib/ktrend/classify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 제품 CSV 익스포트 — 라이브 DB(products) 전량. key=product_id.
// 인증: 관리자 쿠키 또는 ?token=<CREATORS_EXPORT_TOKEN|PARTNER_ADMIN_TOKEN>.
// 옵션: ?country=US · ?brand=laka · ?limit=N (기본 전량)
function tokenOk(url: URL): boolean {
  const t = process.env.CREATORS_EXPORT_TOKEN || process.env.PARTNER_ADMIN_TOKEN || "";
  const got = url.searchParams.get("token") || "";
  return !!t && got.length === t.length && got === t;
}
const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!(await isAdminAuthed()) && !tokenOk(url)) return new Response("unauthorized", { status: 401 });
  if (!isConfigured()) return new Response("DB 미설정", { status: 503 });
  await ensureSchema();
  const country = (url.searchParams.get("country") || "").trim().toUpperCase();
  const brand = (url.searchParams.get("brand") || "").trim().toLowerCase();
  const limit = Math.min(500000, Math.max(1, Number(url.searchParams.get("limit")) || 500000));

  const r = await sql<{ product_id: string; brand_name: string | null; title: string | null; price: string | number | null; currency: string | null; sold_count: string | number | null; commission_rate: string | number | null; url: string | null; image_url: string | null; country: string | null; collected_at: string }>`
    SELECT product_id, brand_name, title, price, currency, sold_count, commission_rate, url, image_url, country, collected_at
    FROM products
    WHERE (${country} = '' OR upper(coalesce(country,'US')) = ${country})
      AND (${brand} = '' OR lower(coalesce(brand_name,'')) = ${brand})
      AND (brand_name IS NULL OR brand_name NOT IN (SELECT value FROM blocklist WHERE kind='brand'))
    ORDER BY coalesce(price,0)*coalesce(sold_count,0) DESC LIMIT ${limit}`;

  const head = ["product_id", "country", "brand", "title", "category", "sub_category", "price", "currency", "sold_count", "est_gmv", "commission_rate", "image_url", "url", "collected_at"];
  const lines = [head.join(",")];
  for (const p of r.rows) {
    const price = Number(p.price) || 0, sold = Number(p.sold_count) || 0;
    lines.push([
      cell(p.product_id), cell((p.country || "US").toUpperCase()), cell(p.brand_name || ""), cell(p.title || ""),
      cell(classifyProduct(p.title)), cell(subClassifyProduct(p.title).sub),
      cell(price), cell(p.currency || "USD"), cell(sold), cell(Math.round(price * sold)),
      cell(p.commission_rate ?? ""), cell(p.image_url || ""), cell(p.url || ""),
      cell(p.collected_at ? String(p.collected_at).slice(0, 10) : ""),
    ].join(","));
  }
  const csv = "﻿" + lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
      "X-Total-Count": String(r.rows.length),
      "Cache-Control": "no-store",
    },
  });
}

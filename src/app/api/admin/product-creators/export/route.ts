import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 제품↔크리에이터 매칭 익스포트 — kalodata형 "이 제품을 누가 얼마나 팔았나(유도 GMV)".
// 복합 key = (product_id, handle). 링크는 videos.product_ref = 제품 원시ID 로 파생.
// 인증: 관리자 쿠키 또는 ?token=. 옵션: ?country=US · ?product=<product_id> · ?handle=<handle> · ?limit=N
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
  const product = (url.searchParams.get("product") || "").trim();
  const handle = (url.searchParams.get("handle") || "").replace(/^@/, "").trim();
  const limit = Math.min(500000, Math.max(1, Number(url.searchParams.get("limit")) || 200000));

  // link: (product_id, handle) 별 videos·views·direct + 제품 gmv. tot: 제품별 총 조회수(유도 GMV 배분 기준).
  const r = await sql<{ product_id: string; country: string; brand_name: string | null; handle: string; videos: number; views: string | number; direct: boolean; induced_gmv: string | number }>`
    WITH link AS (
      SELECT p.product_id, upper(coalesce(p.country,'US')) AS country, p.brand_name,
             max(coalesce(p.price,0)*coalesce(p.sold_count,0))::bigint AS gmv,
             v.handle,
             count(*)::int AS videos,
             sum(v.views)::bigint AS views,
             bool_or(v.product_ref = split_part(p.product_id,':',2)) AS direct
      FROM products p
      JOIN videos v ON v.product_ref = split_part(p.product_id,':',2)
      WHERE v.handle IS NOT NULL AND v.handle <> '' AND v.product_ref IS NOT NULL AND v.product_ref <> ''
        AND (p.brand_name IS NULL OR p.brand_name NOT IN (SELECT value FROM blocklist WHERE kind='brand'))
        AND v.handle NOT IN (SELECT value FROM blocklist WHERE kind='handle')
      GROUP BY p.product_id, p.country, p.brand_name, v.handle
    ),
    tot AS (SELECT product_id, sum(views)::numeric AS tv FROM link GROUP BY product_id)
    SELECT l.product_id, l.country, l.brand_name, l.handle, l.videos, l.views, l.direct,
           CASE WHEN t.tv > 0 THEN round(l.gmv * l.views::numeric / t.tv) ELSE 0 END AS induced_gmv
    FROM link l JOIN tot t ON t.product_id = l.product_id
    WHERE (${country} = '' OR l.country = ${country})
      AND (${product} = '' OR l.product_id = ${product})
      AND (${handle} = '' OR lower(l.handle) = lower(${handle}))
    ORDER BY induced_gmv DESC, l.views DESC
    LIMIT ${limit}`;

  const head = ["product_id", "handle", "country", "brand", "videos", "views", "direct", "induced_gmv"];
  const lines = [head.join(",")];
  for (const x of r.rows) {
    lines.push([
      cell(x.product_id), cell(x.handle), cell(x.country), cell(x.brand_name || ""),
      cell(x.videos), cell(x.views), cell(x.direct ? "TRUE" : ""), cell(x.induced_gmv),
    ].join(","));
  }
  const csv = "﻿" + lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="product-creators-${new Date().toISOString().slice(0, 10)}.csv"`,
      "X-Total-Count": String(r.rows.length),
      "Cache-Control": "no-store",
    },
  });
}

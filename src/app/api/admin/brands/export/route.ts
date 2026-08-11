import { sql, ensureSchema, isConfigured } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { BRANDS, normKey } from "@/data/ktrend/brands";
import collectMaster from "@/data/ktrend/collect-brands.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 브랜드 CSV 익스포트 — 마스터 전체(403) 기준 + 라이브 수집 통계·상태 병합. key=brand_name.
// 인증: 관리자 쿠키 또는 ?token=. 옵션: ?collected=1(수집된 것만) · ?limit=N
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
  const onlyCollected = url.searchParams.get("collected") === "1";

  // 라이브 통계(정규화 키로 매칭)
  const vs = await sql<{ brand_name: string; videos: number; influencers: number; total_views: string | number; shop_count: number }>`
    SELECT brand_name, videos, influencers, total_views, shop_count FROM brand_stats`;
  const ss = await sql<{ brand_name: string; products: number; avg_commission: string | number | null; total_sold: string | number | null; est_gmv: string | number | null }>`
    SELECT brand_name, products, avg_commission, total_sold, est_gmv FROM brand_shop_stats`;
  const vMap = new Map(vs.rows.map((r) => [normKey(r.brand_name), r]));
  const sMap = new Map(ss.rows.map((r) => [normKey(r.brand_name), r]));

  // 마스터(403)에서 korean/handle 보강 맵
  const km = new Map<string, { korean?: string; handle?: string; subCategory?: string }>();
  for (const b of (collectMaster as { name: string; korean?: string; handle?: string; subCategory?: string }[])) km.set(normKey(b.name), { korean: b.korean, handle: b.handle, subCategory: b.subCategory });

  // 마스터 스파인 + 라이브 통계
  type Row = { name: string; korean: string; category: string; subCategory: string; handle: string; videos: unknown; influencers: unknown; total_views: unknown; shop_count: unknown; products: unknown; avg_commission: unknown; total_sold: unknown; shop_gmv: unknown; collected: boolean };
  const seen = new Set<string>();
  const rows: Row[] = [];
  const push = (name: string, category: string, subCategory: string, korean: string, handle: string) => {
    const k = normKey(name);
    if (seen.has(k)) return; seen.add(k);
    const v = vMap.get(k), s = sMap.get(k);
    const collected = !!(v || s);
    if (onlyCollected && !collected) return;
    rows.push({
      name, korean, category, subCategory, handle,
      videos: v?.videos ?? "", influencers: v?.influencers ?? "", total_views: v?.total_views ?? "", shop_count: v?.shop_count ?? "",
      products: s?.products ?? "", avg_commission: s?.avg_commission ?? "", total_sold: s?.total_sold ?? "", shop_gmv: s?.est_gmv ?? "",
      collected,
    });
  };
  for (const b of BRANDS) { const km2 = km.get(normKey(b.name)); push(b.name, b.category || "", (b as { subCategory?: string }).subCategory || km2?.subCategory || "", km2?.korean || "", km2?.handle || ""); }
  // 마스터에 없지만 수집된 브랜드도 추가(누락 방지)
  for (const [k, v] of vMap) if (!seen.has(k)) push(v.brand_name, "", "", km.get(k)?.korean || "", km.get(k)?.handle || "");
  for (const [k, s] of sMap) if (!seen.has(k)) push(s.brand_name, "", "", km.get(k)?.korean || "", km.get(k)?.handle || "");

  rows.sort((a, b) => (Number(b.total_views) || 0) - (Number(a.total_views) || 0));

  const head = ["brand_name", "korean", "category", "sub_category", "handle", "collected", "videos", "influencers", "total_views", "shop_count", "products", "avg_commission", "total_sold", "shop_est_gmv"];
  const lines = [head.join(",")];
  for (const r of rows) {
    lines.push([
      cell(r.name), cell(r.korean), cell(r.category), cell(r.subCategory), cell(r.handle), cell(r.collected ? "TRUE" : "FALSE"),
      cell(r.videos), cell(r.influencers), cell(r.total_views), cell(r.shop_count),
      cell(r.products), cell(r.avg_commission), cell(r.total_sold), cell(r.shop_gmv),
    ].join(","));
  }
  const csv = "﻿" + lines.join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="brands-${new Date().toISOString().slice(0, 10)}.csv"`,
      "X-Total-Count": String(rows.length),
      "Cache-Control": "no-store",
    },
  });
}

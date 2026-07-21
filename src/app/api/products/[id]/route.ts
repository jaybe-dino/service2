import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 제품 상세 — products 1건 + 같은 브랜드 관련 영상(영상↔제품 직접 링크는 P1에서 추가).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isConfigured()) return NextResponse.json({ configured: false }, { status: 503 });
  try {
    await ensureSchema();
    const { id } = await ctx.params;
    const pr = await sql<{
      product_id: string; brand_name: string | null; title: string | null;
      price: string | number | null; currency: string | null;
      sold_count: string | number | null; commission_rate: string | number | null; url: string | null;
    }>`SELECT product_id, brand_name, title, price, currency, sold_count, commission_rate, url
       FROM products WHERE product_id = ${id} LIMIT 1`;
    if (!pr.rows.length) return NextResponse.json({ error: "제품을 찾을 수 없습니다." }, { status: 404 });
    const p = pr.rows[0];
    const price = Number(p.price) || 0;
    const sold = Number(p.sold_count) || 0;

    const brand = p.brand_name || "";
    const vids = brand
      ? await sql<{ video_id: string; handle: string | null; views: string | number; url: string | null; country: string | null }>`
          SELECT video_id, handle, views, url, country FROM videos
          WHERE lower(coalesce(brand_name,'')) = lower(${brand})
          ORDER BY views DESC LIMIT 12`
      : { rows: [] as { video_id: string; handle: string | null; views: string | number; url: string | null; country: string | null }[] };

    return NextResponse.json({
      configured: true,
      product: {
        id: p.product_id, brand, title: p.title || "", price, currency: p.currency || "USD", sold,
        gmv: Math.round(price * sold), commission: p.commission_rate != null ? Number(p.commission_rate) : null, url: p.url || "",
      },
      relatedVideos: vids.rows.map((v) => ({ id: v.video_id, handle: v.handle || "", views: Number(v.views) || 0, url: v.url || "", country: v.country || "" })),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 160) }, { status: 500 });
  }
}

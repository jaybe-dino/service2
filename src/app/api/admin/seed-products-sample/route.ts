import { NextResponse } from "next/server";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";
import { ingestProducts } from "@/lib/collect-run";
import type { ShopProduct } from "@/lib/collector";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 샘플 제품 시드(데모/QA용) — 실 크롤(SHOP_ACTOR) 없이 /products·/shops UI를 검증.
// ⚠️ 명백한 샘플: 가짜 브랜드('샘플브랜드 …') + '[샘플]' 제목. { clear:true }로 언제든 제거.
// 롤백: 이 파일 삭제 + (원하면) POST {clear:true} 1회.
// 국가별로 흩뿌려 다국가 필터도 바로 검증되게.
const SAMPLE_BRANDS: [string, string][] = [["샘플브랜드 A", "US"], ["샘플브랜드 B", "TH"], ["샘플브랜드 C", "VN"]];
const SAMPLE_ITEMS: [string, number, number, number][] = [
  ["글로우 세럼", 24, 12800, 18],
  ["수분 크림", 32, 8400, 15],
  ["선스틱 SPF50", 18, 21000, 20],
  ["클렌징 폼", 14, 15600, 12],
  ["틴트 립밤", 16, 9800, 22],
  ["시카 마스크팩 10매", 22, 30500, 17],
];

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  const body = (await req.json().catch(() => ({}))) as { clear?: boolean };

  const names = SAMPLE_BRANDS.map(([n]) => n);
  if (body.clear) {
    await sql`DELETE FROM products WHERE product_id LIKE '%sample-%'`;
    await sql`DELETE FROM brand_shop_stats WHERE brand_name = ANY(${names as unknown as string})`;
    return NextResponse.json({ ok: true, cleared: true });
  }

  let total = 0;
  for (const [brand, country] of SAMPLE_BRANDS) {
    const products: ShopProduct[] = SAMPLE_ITEMS.map(([name, price, sold, comm], i) => ({
      productId: `sample-${encodeURIComponent(brand)}-${i}`,
      brandName: brand,
      title: `[샘플] ${brand} ${name}`,
      price,
      currency: "USD",
      soldCount: sold,
      commissionRate: comm,
      url: "",
      image: null,
    }));
    total += await ingestProducts(brand, products, country);
  }
  return NextResponse.json({ ok: true, seeded: total, brands: names, note: "샘플 데이터입니다(국가: US/TH/VN). {clear:true}로 제거." });
}

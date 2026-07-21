import { NextResponse } from "next/server";
import { sql, isConfigured, ensureSchema } from "@/lib/db";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 진단(관리자) — products 테이블 실상태를 필터 없이 직접 확인. '수집은 됐는데 /products가 0' 원인 파악용.
export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();
  // 어느 DB에 붙는지(호스트만, 크리덴셜 제외) — 수집 DB와 조회 DB가 같은지 대조용.
  const rawUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
  let dbHost = "(미설정)";
  try { dbHost = rawUrl ? new URL(rawUrl).host : "(미설정)"; } catch { dbHost = "(파싱실패)"; }
  try {
    const [cnt, byC, sample, bss, block, bstats, vids, jobs] = await Promise.all([
      sql`SELECT count(*)::int AS n FROM products`,
      sql`SELECT coalesce(country,'(null)') AS country, count(*)::int AS n FROM products GROUP BY country ORDER BY n DESC`,
      sql`SELECT product_id, brand_name, title, price, sold_count, commission_rate, country FROM products ORDER BY collected_at DESC LIMIT 5`,
      sql`SELECT count(*)::int AS n FROM brand_shop_stats`,
      sql`SELECT count(*)::int AS n FROM blocklist WHERE kind='brand'`,
      sql`SELECT count(*)::int AS n FROM brand_stats`,
      sql`SELECT count(*)::int AS n FROM videos`,
      sql`SELECT kind, status, count(*)::int AS n FROM collect_jobs GROUP BY kind, status ORDER BY kind, status`,
    ]);
    return NextResponse.json({
      dbHost,
      productsCount: cnt.rows[0]?.n ?? 0,
      byCountry: byC.rows,
      sample: sample.rows,
      brandShopStatsCount: bss.rows[0]?.n ?? 0,
      blocklistBrandCount: block.rows[0]?.n ?? 0,
      brandStatsCount: bstats.rows[0]?.n ?? 0,   // 샵 수집 대상 브랜드 수(0이면 대상 없음)
      videosCount: vids.rows[0]?.n ?? 0,
      collectJobs: jobs.rows,                     // kind(video/shop)·status별 잡 수
      note: "brandStatsCount>0이어야 샵 수집 대상이 생김. collectJobs에 shop 잡이 있는지 확인.",
    });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 500 });
  }
}

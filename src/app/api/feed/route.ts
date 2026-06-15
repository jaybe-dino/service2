import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 콘텐츠 성과 지표는 공개 정책 → 인증 없이 수집된 영상 피드를 제공.
// 클라이언트(loadContent)가 정적 videos.json과 병합해 소스 데이터로 노출한다.
export async function GET() {
  if (!isConfigured()) return NextResponse.json({ configured: false, videos: [], blockedHandles: [], blockedBrands: [], blockedVideos: [] });
  try {
    await ensureSchema();
    const block = await sql<{ kind: string; value: string }>`SELECT kind, value FROM blocklist`;
    const blockedHandles = block.rows.filter((b) => b.kind === "handle").map((b) => b.value);
    const blockedBrands = block.rows.filter((b) => b.kind === "brand").map((b) => b.value);
    const blockedVideos = block.rows.filter((b) => b.kind === "video").map((b) => b.value);
    // A안: 브랜드별 실 커미션율 + 추정 GMV (있는 브랜드만)
    const shop = await sql<{ brand_name: string; avg_commission: string | number | null; est_gmv: string | number | null; total_sold: string | number | null }>`
      SELECT brand_name, avg_commission, est_gmv, total_sold FROM brand_shop_stats`;
    const brandShop: Record<string, { commission: number | null; gmv: number; sold: number }> = {};
    for (const s of shop.rows) {
      if (s.brand_name) brandShop[s.brand_name.toLowerCase()] = {
        commission: s.avg_commission != null ? Number(s.avg_commission) : null,
        gmv: Number(s.est_gmv) || 0,
        sold: Number(s.total_sold) || 0,
      };
    }
    // 최신 수집분 우선, 과도한 페이로드 방지 위해 상한. 블락 대상은 제외.
    const r = await sql<{
      video_id: string;
      brand_name: string | null;
      handle: string | null;
      views: string | number;
      likes: string | number;
      comments: string | number;
      shares: string | number;
      is_ad: boolean;
      is_shop: boolean;
      posted_at: string | null;
      url: string | null;
      country: string | null;
    }>`SELECT video_id, brand_name, handle, views, likes, comments, shares, is_ad, is_shop, posted_at, url, country
       FROM videos
       WHERE handle IS NOT NULL AND brand_name IS NOT NULL
         AND handle NOT IN (SELECT value FROM blocklist WHERE kind='handle')
         AND brand_name NOT IN (SELECT value FROM blocklist WHERE kind='brand')
         AND video_id NOT IN (SELECT value FROM blocklist WHERE kind='video')
       ORDER BY collected_at DESC
       LIMIT 5000`;

    // 컴팩트 배열로 직렬화 (loadContent의 DB 매퍼가 해석)
    const videos = r.rows.map((v) => [
      v.video_id,
      v.brand_name,
      v.handle,
      Number(v.views) || 0,
      Number(v.likes) || 0,
      Number(v.comments) || 0,
      Number(v.shares) || 0,
      v.is_ad ? 1 : 0,
      v.is_shop ? 1 : 0,
      v.posted_at ?? "",
      v.url ?? "",
      v.country ?? "US",
    ]);

    return NextResponse.json({ configured: true, videos, blockedHandles, blockedBrands, blockedVideos, brandShop });
  } catch {
    // 수집 데이터가 아직 없거나 DB 일시 오류 → 정적 데이터만으로 동작하도록 빈 피드 반환
    return NextResponse.json({ configured: true, videos: [], blockedHandles: [], blockedBrands: [], blockedVideos: [] });
  }
}

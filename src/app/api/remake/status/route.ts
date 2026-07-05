import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { fetchStatus } from "@/lib/remake/higgsfield";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TERMINAL = new Set(["completed", "failed", "nsfw"]);
const MOCK_DONE_SEC = 6; // mock 잡 완료까지 경과시간(초)

// 생성 잡 상태 폴링. higgsfield 잡은 벤더에 조회, mock 잡은 경과시간으로 완료 처리.
export async function GET(req: Request) {
  if (!dbConfigured()) return NextResponse.json({ error: "DB 미설정" }, { status: 503 });
  await ensureSchema();

  const ids = (new URL(req.url).searchParams.get("ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
  if (!ids.length) return NextResponse.json({ jobs: [] });

  const { rows } = await sql`
    SELECT id, provider, request_id, variation, score, status, video_url, error,
           extract(epoch from (now() - created_at)) AS age
    FROM remake_jobs WHERE id = ANY(${ids as unknown as string})`;

  const out = [];
  for (const r of rows as Array<{
    id: string; provider: string; request_id: string | null; variation: number;
    score: number; status: string; video_url: string | null; error: string | null; age: number;
  }>) {
    let status = r.status;
    let videoUrl = r.video_url;
    let error = r.error;

    if (r.provider === "higgsfield" && !TERMINAL.has(status) && r.request_id) {
      const s = await fetchStatus(r.request_id);
      status = s.status;
      videoUrl = s.videoUrl ?? videoUrl;
      error = s.error ?? error;
      if (TERMINAL.has(status)) {
        await sql`UPDATE remake_jobs SET status=${status}, video_url=${videoUrl}, error=${error}, updated_at=now() WHERE id=${r.id}`;
      } else if (status !== r.status) {
        await sql`UPDATE remake_jobs SET status=${status}, updated_at=now() WHERE id=${r.id}`;
      }
    } else if (r.provider === "mock" && !TERMINAL.has(status) && Number(r.age) >= MOCK_DONE_SEC) {
      status = "completed";
      await sql`UPDATE remake_jobs SET status='completed', updated_at=now() WHERE id=${r.id}`;
    }

    out.push({
      id: r.id,
      variation: r.variation,
      score: r.score,
      status,
      videoUrl: videoUrl || null,
      error: error || null,
    });
  }

  return NextResponse.json({ jobs: out });
}

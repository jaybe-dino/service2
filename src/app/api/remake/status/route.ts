import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { providerById } from "@/lib/remake/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TERMINAL = new Set(["completed", "failed", "nsfw"]);
const MOCK_DONE_SEC = 6; // mock 잡 완료까지 경과시간(초)
const PREP_TIMEOUT_SEC = 90; // 마지막 활동 이후 이만큼 진전 없으면 죽은 컷으로 판단(process는 60s 내 종료)

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
    SELECT id, provider, request_id, variation, score, status, video_url, error, fidelity, debug,
           extract(epoch from (now() - created_at)) AS age,
           extract(epoch from (now() - updated_at)) AS stale
    FROM remake_jobs WHERE id = ANY(${ids as unknown as string})`;

  const out = [];
  for (const r of rows as Array<{
    id: string; provider: string; request_id: string | null; variation: number;
    score: number; status: string; video_url: string | null; error: string | null;
    fidelity: string | null; debug: string | null; age: number; stale: number;
  }>) {
    let status = r.status;
    let videoUrl = r.video_url;
    let error = r.error;

    if (r.provider !== "mock" && !TERMINAL.has(status) && r.request_id) {
      const s = await providerById(r.provider).status(r.request_id);
      status = s.status;
      videoUrl = s.videoUrl ?? videoUrl;
      error = s.error ?? error;
      if (TERMINAL.has(status)) {
        await sql`UPDATE remake_jobs SET status=${status}, video_url=${videoUrl}, error=${error}, updated_at=now() WHERE id=${r.id}`;
      } else if (status !== r.status) {
        await sql`UPDATE remake_jobs SET status=${status}, updated_at=now() WHERE id=${r.id}`;
      }
    } else if (r.provider !== "mock" && !TERMINAL.has(status) && !r.request_id && Number(r.stale) >= PREP_TIMEOUT_SEC) {
      // 마지막 활동(updated_at) 이후 오래 진전 없음 = 해당 컷 처리가 죽음 → 실패 확정(무한 폴링 방지).
      // (순차 처리로 뒤 컷이 늦게 시작해도, 처리가 시작되면 updated_at이 갱신되어 오탐하지 않음.)
      status = "failed";
      error = error || "장면 합성/제출 지연으로 이 컷이 완료되지 못했습니다. 다시 시도하거나 REMAKE_MAX_SCENES=1로 낮춰보세요.";
      await sql`UPDATE remake_jobs SET status='failed', error=${error}, updated_at=now() WHERE id=${r.id}`;
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
      // request_id 없이 non-terminal이면 아직 준비 중(제출 전).
      preparing: r.provider !== "mock" && !TERMINAL.has(status) && !r.request_id,
      fidelity: r.fidelity || null,
      debug: r.debug || null,
    });
  }

  return NextResponse.json({ jobs: out });
}

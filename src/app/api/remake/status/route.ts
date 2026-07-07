import { NextResponse } from "next/server";
import { sql, ensureSchema, isConfigured as dbConfigured } from "@/lib/db";
import { providerById } from "@/lib/remake/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TERMINAL = new Set(["completed", "failed", "nsfw"]);
const MOCK_DONE_SEC = 6; // mock 잡 완료까지 경과시간(초)
const PREP_TIMEOUT_SEC = 100; // 백그라운드 준비(제출 전) 최대 대기 — 초과 시 실패 처리

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
    SELECT id, provider, request_id, variation, score, status, video_url, error, fidelity,
           extract(epoch from (now() - created_at)) AS age
    FROM remake_jobs WHERE id = ANY(${ids as unknown as string})`;

  const out = [];
  for (const r of rows as Array<{
    id: string; provider: string; request_id: string | null; variation: number;
    score: number; status: string; video_url: string | null; error: string | null;
    fidelity: string | null; age: number;
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
    } else if (r.provider !== "mock" && !TERMINAL.has(status) && !r.request_id && Number(r.age) >= PREP_TIMEOUT_SEC) {
      // 백그라운드 준비(프레임·편집·제출)가 함수 수명 내에 끝나지 못함 → 실패로 확정(무한 폴링 방지).
      status = "failed";
      error = error || "준비 시간 초과(프레임 추출/제품 스왑 지연). AI 정교화를 먼저 실행해 프레임을 캐시하거나 REMAKE_MAX_SCENES=1로 설정 후 다시 시도하세요.";
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
      // request_id 없이 in_progress면 아직 백그라운드 준비 중(제출 전).
      preparing: r.provider !== "mock" && !TERMINAL.has(status) && !r.request_id,
      fidelity: r.fidelity || null,
    });
  }

  return NextResponse.json({ jobs: out });
}

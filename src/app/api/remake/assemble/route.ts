import { NextResponse } from "next/server";
import { validateReferenceSpec, type ReferenceSpec } from "@/lib/remake/spec";
import { buildAssemblyPlan, type AssemblyClipInput } from "@/lib/remake/assembler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ⑤ Assembler — 완성된 샷 클립[] + ReferenceSpec → 최종 편집 계획(EDL).
// 실제 mux는 워커가 수행(REMAKE_ASSEMBLE_WORKER_URL 있으면 위임, 없으면 계획만 반환).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    spec?: ReferenceSpec; clips?: AssemblyClipInput[];
  };
  const v = validateReferenceSpec(body.spec);
  if (!v.ok || !v.spec) return NextResponse.json({ error: `유효한 ReferenceSpec 필요: ${v.errors.join("; ")}` }, { status: 400 });
  const clipsRaw = Array.isArray(body.clips) ? body.clips : [];
  if (!clipsRaw.length) return NextResponse.json({ error: "완성된 샷 클립(videoUrl)이 필요합니다." }, { status: 400 });

  // 클립 URL 절대화 — 상대경로(/api/remake/video?...)는 워커가 못 받으므로 origin 결합.
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = process.env.NEXT_PUBLIC_SITE_URL || (host ? `${proto}://${host}` : "");
  const clips = clipsRaw.map((c) => ({
    shot_no: c.shot_no,
    videoUrl: c.videoUrl && c.videoUrl.startsWith("/") ? `${origin}${c.videoUrl}` : c.videoUrl,
  }));

  const plan = buildAssemblyPlan(v.spec, clips);

  // 워커가 설정돼 있으면 최종 렌더 위임(프레임 추출 워커와 동일 아웃바운드 패턴).
  const worker = process.env.REMAKE_ASSEMBLE_WORKER_URL;
  if (worker) {
    try {
      const svc = /^https?:\/\//.test(worker) ? worker : `https://${worker}`;
      const res = await fetch(svc.replace(/\/+$/, ""), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.REMAKE_ASSEMBLE_WORKER_KEY ? { authorization: `Bearer ${process.env.REMAKE_ASSEMBLE_WORKER_KEY}` } : {}),
        },
        body: JSON.stringify({ plan }),
      });
      const out = await res.json().catch(() => ({}));
      if (res.ok && (out?.videoUrl || out?.url)) {
        return NextResponse.json({ ok: true, plan, videoUrl: out.videoUrl || out.url });
      }
      return NextResponse.json({ ok: true, plan, warn: `워커 응답 이상(${res.status})`, missing: plan.missing_shots });
    } catch (e) {
      return NextResponse.json({ ok: true, plan, warn: `워커 호출 실패: ${String(e).slice(0, 140)}` });
    }
  }

  // 워커 미설정: EDL만 반환(클라이언트/외부 워커가 실행). 최종 mp4는 워커 필요.
  return NextResponse.json({
    ok: true,
    plan,
    note: "REMAKE_ASSEMBLE_WORKER_URL 미설정 — 편집 계획(EDL)만 반환합니다. 최종 mp4 렌더는 FFmpeg 워커가 필요합니다.",
  });
}

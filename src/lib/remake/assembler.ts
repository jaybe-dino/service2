// ⑤ Assembler — 클립[] + ReferenceSpec → 최종 편집 계획(EDL).
// ReferenceSpec의 t_start/t_end 페이싱대로 컷 순서·전환·자막 번인·BGM을 결정론적으로 계산한다.
// 실제 mux(FFmpeg)는 서버리스에서 불가 → 워커(프레임 추출 워커와 동일 패턴)가 이 계획을 실행한다.
import type { ReferenceSpec } from "./spec";

export interface AssemblyClipInput { shot_no: number; videoUrl: string }

export interface AssemblyPlan {
  ref_id: string;
  aspect_ratio: string;
  total_duration_sec: number;
  timeline: {
    shot_no: number;
    src: string;              // 클립 URL
    in_sec: number;           // 타임라인 시작(원본 t_start 페이싱)
    dur_sec: number;          // 이 컷 길이(t_end - t_start)
    transition_in: "cut" | "crossfade";
    sales_beat: string;
  }[];
  captions: { shot_no: number; text: string; in_sec: number; dur_sec: number }[]; // 번인(후처리)
  bgm_mood: string;
  render: { tool: string; container: string; fps: number; note: string };
  missing_shots: number[];    // 클립이 아직 없는 샷(폴링 미완료 등)
}

export function buildAssemblyPlan(spec: ReferenceSpec, clips: AssemblyClipInput[]): AssemblyPlan {
  const bySrc = new Map(clips.filter((c) => c && c.videoUrl).map((c) => [c.shot_no, c.videoUrl]));
  // 원본 샷 순서(shot_no) + t_start 페이싱으로 정렬
  const shots = [...spec.shots].sort((a, b) => (a.t_start - b.t_start) || (a.shot_no - b.shot_no));

  const timeline: AssemblyPlan["timeline"] = [];
  const captions: AssemblyPlan["captions"] = [];
  const missing: number[] = [];
  let cursor = 0;
  shots.forEach((s, idx) => {
    const src = bySrc.get(s.shot_no);
    if (!src) { missing.push(s.shot_no); return; }
    const dur = Math.max(0.8, Math.round(((s.t_end - s.t_start) || 2) * 100) / 100);
    timeline.push({
      shot_no: s.shot_no,
      src,
      in_sec: Math.round(cursor * 100) / 100,
      dur_sec: dur,
      transition_in: idx === 0 ? "cut" : "crossfade",
      sales_beat: s.sales_beat,
    });
    // 최종 자막은 '리메이크용 새 카피(caption)' 우선 — 원본 텍스트(on_screen_text) 복제 방지.
    const capText = (s.caption && s.caption.trim()) || "";
    if (capText) {
      captions.push({ shot_no: s.shot_no, text: capText, in_sec: Math.round(cursor * 100) / 100, dur_sec: dur });
    }
    cursor += dur;
  });

  return {
    ref_id: spec.ref_id,
    aspect_ratio: spec.aspect_ratio || "9:16",
    total_duration_sec: Math.round(cursor * 100) / 100,
    timeline,
    captions,
    bgm_mood: spec.style?.bgm_mood || "trendy upbeat",
    render: {
      tool: "ffmpeg-worker",
      container: "mp4",
      fps: 30,
      note: "concat(timeline) → crossfade 전환 → 자막 번인(captions) → BGM(bgm_mood) → 9:16 리사이즈. 서버리스 불가, 워커에서 실행.",
    },
    missing_shots: missing,
  };
}

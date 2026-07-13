"use client";

// Remake Studio v1 — 파이프라인 UI 배선 (decompose → keyframes 확인게이트 → animate → assemble).
// 내부 프로토타입. 각 단계는 대응 API를 호출하고 결과를 눈으로 확인한다.
import { useEffect, useRef, useState } from "react";
import type { ReferenceSpec } from "@/lib/remake/spec";

type Step = 0 | 1 | 2 | 3 | 4;
interface KF { shot_no: number; sales_beat: string; needs_product: boolean; ok: boolean; assetId?: string; url?: string }
interface JobRow { id: string; shot_no: number; failed?: boolean }
interface ClipRow { shot_no: number; status: string; videoUrl?: string | null; error?: string | null }

export default function RemakeStudioPage() {
  const [step, setStep] = useState<Step>(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 입력
  const [refUrl, setRefUrl] = useState("");
  const [productImg, setProductImg] = useState<string | null>(null); // dataURL
  const [stage, setStage] = useState<1 | 2>(1);
  const [preset, setPreset] = useState("avatar_B/clean_studio");

  // 산출물
  const [spec, setSpec] = useState<ReferenceSpec | null>(null);
  const [keyframes, setKeyframes] = useState<KF[]>([]);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [clips, setClips] = useState<Record<number, ClipRow>>({});
  const [plan, setPlan] = useState<unknown>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const onFile = (f: File | null) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setProductImg(String(r.result));
    r.readAsDataURL(f);
  };

  async function call<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false || data?.error) throw new Error(data?.error || `HTTP ${res.status}`);
    return data as T;
  }

  // ① Decompose
  const doDecompose = async () => {
    setErr(null); setBusy(true);
    try {
      const d = await call<{ spec: ReferenceSpec }>("/api/remake/decompose", { refTiktokUrl: refUrl });
      setSpec(d.spec); setStep(1);
    } catch (e) { setErr(`분석 실패: ${e instanceof Error ? e.message : e}`); }
    setBusy(false);
  };

  // ③ Keyframes (확인 게이트)
  const doKeyframes = async () => {
    if (!spec || !productImg) return;
    setErr(null); setBusy(true);
    try {
      const d = await call<{ keyframes: KF[] }>("/api/remake/keyframes", { spec, image: productImg, stage, preset });
      setKeyframes(d.keyframes);
      setApproved(new Set(d.keyframes.filter((k) => k.ok).map((k) => k.shot_no)));
      setStep(2);
    } catch (e) { setErr(`키프레임 실패: ${e instanceof Error ? e.message : e}`); }
    setBusy(false);
  };

  // ④ Animate + 폴링
  const doAnimate = async () => {
    if (!spec) return;
    const chosen = keyframes.filter((k) => k.ok && k.assetId && approved.has(k.shot_no)).map((k) => ({ shot_no: k.shot_no, assetId: k.assetId! }));
    if (!chosen.length) { setErr("승인된 키프레임이 없습니다."); return; }
    setErr(null); setBusy(true);
    try {
      const d = await call<{ jobs: JobRow[] }>("/api/remake/animate", { spec, keyframes: chosen });
      setStep(3);
      const jobs = d.jobs.filter((j) => !j.failed);
      const byId = new Map(jobs.map((j) => [j.id, j.shot_no]));
      const ids = jobs.map((j) => j.id);
      setClips(Object.fromEntries(jobs.map((j) => [j.shot_no, { shot_no: j.shot_no, status: "in_progress" }])));
      const started = Date.now();
      const poll = async () => {
        try {
          const r = await fetch(`/api/remake/status?ids=${ids.join(",")}`);
          const s = await r.json();
          const rows: { id: string; status: string; videoUrl?: string | null; error?: string | null }[] = s.jobs || [];
          setClips((prev) => {
            const next = { ...prev };
            for (const row of rows) { const sn = byId.get(row.id); if (sn != null) next[sn] = { shot_no: sn, status: row.status, videoUrl: row.videoUrl, error: row.error }; }
            return next;
          });
          const done = rows.length && rows.every((j) => ["completed", "failed", "nsfw"].includes(j.status));
          if (!done && Date.now() - started < 300_000) pollRef.current = setTimeout(poll, 2500);
        } catch { pollRef.current = setTimeout(poll, 3000); }
      };
      pollRef.current = setTimeout(poll, 2500);
    } catch (e) { setErr(`생성 실패: ${e instanceof Error ? e.message : e}`); }
    setBusy(false);
  };

  // ⑤ Assemble
  const doAssemble = async () => {
    if (!spec) return;
    const done = Object.values(clips).filter((c) => c.status === "completed" && c.videoUrl).map((c) => ({ shot_no: c.shot_no, videoUrl: c.videoUrl! }));
    if (!done.length) { setErr("완성된 클립이 없습니다."); return; }
    setErr(null); setBusy(true);
    try {
      const d = await call<{ plan: unknown }>("/api/remake/assemble", { spec, clips: done });
      setPlan(d.plan); setStep(4);
    } catch (e) { setErr(`편집 계획 실패: ${e instanceof Error ? e.message : e}`); }
    setBusy(false);
  };

  const StepBadge = ({ n, label }: { n: Step; label: string }) => (
    <div className={`flex items-center gap-1.5 text-[11px] font-bold ${step >= n ? "text-pink-600" : "text-slate-400"}`}>
      <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${step >= n ? "bg-pink-600 text-white" : "bg-slate-200 text-slate-500"}`}>{n === 0 ? "1" : n + 1}</span>
      {label}
    </div>
  );

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8 text-slate-800">
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-[20px] font-black">Remake Studio <span className="text-pink-600">v1</span></h1>
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">내부 프로토타입 · 파이프라인</span>
      </div>
      <p className="mb-4 text-[12px] text-slate-500">레퍼런스의 세일즈 구조를 보존하며 내 제품을 입힙니다: 분석 → 키프레임 확인 → 영상 → 편집.</p>

      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1">
        <StepBadge n={0} label="입력" /><StepBadge n={1} label="세일즈 분석" /><StepBadge n={2} label="키프레임 확인" /><StepBadge n={3} label="영상 생성" /><StepBadge n={4} label="편집 계획" />
      </div>

      {err && <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">{err}</div>}

      {/* STEP 0 — 입력 */}
      <section className="rounded-2xl border border-slate-200 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">레퍼런스 TikTok URL</span>
            <input value={refUrl} onChange={(e) => setRefUrl(e.target.value)} placeholder="https://www.tiktok.com/@.../video/..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-slate-500">내 제품 이미지</span>
            <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0] || null)} className="w-full text-[12px]" />
          </label>
        </div>
        {productImg && <img src={productImg} alt="product" className="mt-3 h-20 w-20 rounded-lg border border-slate-200 object-cover" />}
        <div className="mt-3 flex items-center gap-2">
          <button onClick={doDecompose} disabled={busy || !/tiktok\.com/.test(refUrl)} className="rounded-lg bg-pink-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40">
            {busy && step === 0 ? "분석 중…" : "① 세일즈 구조 분석"}
          </button>
          <span className="text-[11px] text-slate-400">Decomposer — 프레임에서 왜 팔리는지 추출</span>
        </div>
      </section>

      {/* STEP 1 — Spec 리뷰 */}
      {step >= 1 && spec && (
        <section className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="mb-2 text-[13px] font-black">① ReferenceSpec — 세일즈 구조</div>
          <div className="rounded-lg bg-slate-50 p-3 text-[12px]">
            <div><b>훅 원리:</b> {spec.sales?.hook_mechanism}</div>
            <div className="mt-1"><b>세일즈 아크:</b> {(spec.sales?.sales_arc || []).join(" → ")}</div>
            <div className="mt-1"><b>결정적 순간:</b> {spec.sales?.proof_moment}</div>
            <div className="mt-1 text-slate-500">{spec.sales?.why_it_works}</div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="text-slate-400"><tr><th className="p-1">#</th><th className="p-1">시간</th><th className="p-1">샷</th><th className="p-1">세일즈 비트</th><th className="p-1">동작</th><th className="p-1">제품</th></tr></thead>
              <tbody>
                {spec.shots.map((s) => (
                  <tr key={s.shot_no} className="border-t border-slate-100">
                    <td className="p-1">{s.shot_no}</td>
                    <td className="p-1">{s.t_start}–{s.t_end}s</td>
                    <td className="p-1">{s.shot_type}/{s.camera}</td>
                    <td className="p-1 font-semibold text-pink-600">{s.sales_beat}</td>
                    <td className="p-1">{s.action}</td>
                    <td className="p-1">{spec.product_slots?.some((p) => p.shot_no === s.shot_no) ? "✅" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select value={stage} onChange={(e) => setStage(Number(e.target.value) as 1 | 2)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px]">
              <option value={1}>1차 — 제품만 교체(최대 유사)</option>
              <option value={2}>2차 — 스타일 변형</option>
            </select>
            {stage === 2 && (
              <select value={preset} onChange={(e) => setPreset(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-[12px]">
                <option value="avatar_B/clean_studio">clean studio</option>
                <option value="avatar_C/cozy_home">cozy home</option>
                <option value="avatar_M/outdoor_cafe">outdoor cafe</option>
              </select>
            )}
            <button onClick={doKeyframes} disabled={busy || !productImg} className="rounded-lg bg-pink-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40">
              {busy && step === 1 ? "렌더 중…" : "② 키프레임 생성"}
            </button>
            {!productImg && <span className="text-[11px] text-rose-500">제품 이미지를 올려주세요</span>}
          </div>
        </section>
      )}

      {/* STEP 2 — 키프레임 확인 게이트 */}
      {step >= 2 && keyframes.length > 0 && (
        <section className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="mb-2 text-[13px] font-black">② 키프레임 확인 — 승인한 것만 영상화</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {keyframes.map((k) => (
              <div key={k.shot_no} className={`overflow-hidden rounded-xl border ${approved.has(k.shot_no) ? "border-pink-400 ring-2 ring-pink-200" : "border-slate-200"}`}>
                <div className="relative aspect-[9/16] bg-slate-100">
                  {k.ok && k.url ? <img src={k.url} alt={`shot ${k.shot_no}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[11px] text-rose-500">렌더 실패</div>}
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">#{k.shot_no} · {k.sales_beat}</span>
                </div>
                {k.ok && (
                  <button onClick={() => setApproved((p) => { const n = new Set(p); n.has(k.shot_no) ? n.delete(k.shot_no) : n.add(k.shot_no); return n; })}
                    className={`block w-full py-1.5 text-[11px] font-bold ${approved.has(k.shot_no) ? "bg-pink-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {approved.has(k.shot_no) ? "✓ 승인됨" : "승인"}
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={doKeyframes} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-2 text-[12px] font-bold disabled:opacity-40">다시 렌더</button>
            <button onClick={doAnimate} disabled={busy || approved.size === 0} className="rounded-lg bg-pink-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40">
              ③ 승인 {approved.size}컷 영상화 (I2V)
            </button>
          </div>
        </section>
      )}

      {/* STEP 3 — 영상 생성/폴링 */}
      {step >= 3 && (
        <section className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="mb-2 text-[13px] font-black">③ 샷별 영상 (image-to-video)</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.values(clips).sort((a, b) => a.shot_no - b.shot_no).map((c) => (
              <div key={c.shot_no} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="relative aspect-[9/16] bg-slate-900">
                  {c.videoUrl ? <video src={c.videoUrl} controls className="h-full w-full object-cover" />
                    : <div className="grid h-full place-items-center text-[11px] text-white/70">{c.status === "failed" ? `실패: ${c.error || ""}` : "생성 중…"}</div>}
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">#{c.shot_no}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <button onClick={doAssemble} disabled={busy || !Object.values(clips).some((c) => c.status === "completed")} className="rounded-lg bg-pink-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40">
              ④ 편집 계획 생성
            </button>
          </div>
        </section>
      )}

      {/* STEP 4 — 편집 계획(EDL) */}
      {step >= 4 && plan != null && (
        <section className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="mb-2 text-[13px] font-black">④ 편집 계획 (EDL) — 최종 mp4는 FFmpeg 워커에서 실행</div>
          <pre className="max-h-[320px] overflow-auto rounded-lg bg-slate-900 p-3 text-[11px] text-emerald-200">{JSON.stringify(plan, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}

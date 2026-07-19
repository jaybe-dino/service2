"use client";

// Remake Studio v1 — 파이프라인 UI 배선 (decompose → keyframes 확인게이트 → animate → assemble).
// 내부 프로토타입. 각 단계는 대응 API를 호출하고 결과를 눈으로 확인한다.
import { useEffect, useRef, useState } from "react";
import type { ReferenceSpec } from "@/lib/remake/spec";
import { STYLE_PRESET_LIST } from "@/lib/remake/spec";

type Step = 0 | 1 | 2 | 3 | 4;
interface KF { shot_no: number; sales_beat: string; needs_product: boolean; ok: boolean; assetId?: string; url?: string; error?: string }
interface JobRow { id: string; shot_no: number; failed?: boolean; error?: string }
interface ClipRow { shot_no: number; status: string; videoUrl?: string | null; error?: string | null }

// 키프레임 라우트는 일부 샷이 실패해도 200 + keyframes[](샷별 error)를 돌려준다.
// call()은 error가 있으면 throw하므로, 여기선 던지지 않고 본문을 그대로 읽어 게이트로 진입한다.
async function postRaw<T>(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

export default function RemakeStudioPage() {
  const [step, setStep] = useState<Step>(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null); // 경고성 안내(복제 폴백 등)

  // 입력
  const [refUrl, setRefUrl] = useState("");
  const [productImg, setProductImg] = useState<string | null>(null); // dataURL
  const [stage, setStage] = useState<1 | 2>(1);
  const [preset, setPreset] = useState("avatar_B/clean_studio");
  // 2차 멀티변형(A/B): 여러 프리셋을 미리보기 1컷으로 비교 → 고른 변형만 전체 렌더.
  const [selPresets, setSelPresets] = useState<Set<string>>(new Set(["avatar_B/clean_studio", "avatar_C/cozy_home"]));
  const [previews, setPreviews] = useState<Record<string, KF | null>>({});
  const [previewBusy, setPreviewBusy] = useState(false);

  // 산출물
  const [spec, setSpec] = useState<ReferenceSpec | null>(null);
  const [keyframes, setKeyframes] = useState<KF[]>([]);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [clips, setClips] = useState<Record<number, ClipRow>>({});
  const [animInfo, setAnimInfo] = useState<{ mode?: string; provider?: string }>({});
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

  // ③ Keyframes (확인 게이트). preset/stage를 인자로 받아 stale-closure 방지(A/B 경로).
  // 일부/전부 실패해도 게이트(step 2)로 진입시켜, 어떤 샷이 왜 실패했는지 보이게 한다(막다른 골목 제거).
  const doKeyframes = async (presetArg: string = preset, stageArg: 1 | 2 = stage) => {
    if (!spec || !productImg) return;
    setErr(null); setInfo(null); setBusy(true);
    try {
      const { ok, status, data } = await postRaw<{ keyframes?: KF[]; error?: string; replica?: boolean; replicaFallback?: boolean; framesLoaded?: number }>(
        "/api/remake/keyframes",
        { spec, image: productImg, stage: stageArg, preset: presetArg },
      );
      const kfs: KF[] = Array.isArray(data.keyframes) ? data.keyframes : [];
      // 라우트 자체가 못 뜬 경우(503 미설정 등)이고 결과도 없으면 완전 실패.
      if (!ok && !kfs.length) throw new Error(data.error || `HTTP ${status}`);
      setKeyframes(kfs);
      setApproved(new Set(kfs.filter((k) => k.ok).map((k) => k.shot_no)));
      setStep(2); // 성공/실패 섞여도 게이트로 진입
      // 복제 모드인데 레퍼 프레임이 없어 재창조로 폴백된 경우 → 원인(워커 미배포) 안내.
      if (data.replicaFallback) setInfo("‘제품만 교체(복제)’를 요청했지만 레퍼런스 프레임이 없어 재창조로 대체했습니다. 실제 복제를 하려면 프레임 추출 워커(REMAKE_FRAME_SERVICE_URL)를 배포해야 합니다.");
      else if (data.replica && data.framesLoaded) setInfo(`레퍼런스 프레임 ${data.framesLoaded}장을 기준으로 복제(제품만 교체)했습니다.`);
      const okN = kfs.filter((k) => k.ok).length;
      if (okN === 0) {
        const why = kfs.find((k) => k.error)?.error || data.error || "이미지 모델 오류";
        setErr(`키프레임이 렌더되지 않았습니다: ${why}`);
      }
    } catch (e) { setErr(`키프레임 실패: ${e instanceof Error ? e.message : e}`); }
    setBusy(false);
  };

  // M4 — 2차 멀티변형 미리보기: 선택 프리셋마다 대표 1컷만 렌더해 A/B 비교(비용 최소).
  // 제품이 등장하는 샷을 대표컷으로(제품 미노출 방지). 슬롯 없으면 마지막 샷(보통 CTA/제품 리빌).
  const previewShot = (): number => {
    if (!spec) return 1;
    const ps = spec.product_slots?.[0]?.shot_no;
    if (ps != null) return ps;
    const shots = spec.shots || [];
    return shots.length ? shots[shots.length - 1].shot_no : 1;
  };
  const doPreviews = async () => {
    if (!spec || !productImg || selPresets.size === 0) return;
    setErr(null); setPreviewBusy(true);
    const shot = previewShot();
    const entries = await Promise.all(
      [...selPresets].map(async (p) => {
        try {
          const d = await call<{ keyframes: KF[] }>("/api/remake/keyframes", { spec, image: productImg, stage: 2, preset: p, shotNos: [shot] });
          return [p, d.keyframes?.[0] ?? null] as const;
        } catch { return [p, null] as const; }
      }),
    );
    setPreviews(Object.fromEntries(entries));
    setPreviewBusy(false);
  };
  // 고른 변형으로 전체 키프레임 렌더 → 기존 승인/애니메이션 흐름으로 진입.
  // setState는 비동기라 doKeyframes에 값을 직접 넘겨 stale-closure를 피한다.
  const pickVariant = (p: string) => { setPreset(p); setStage(2); doKeyframes(p, 2); };

  // ④ Animate + 폴링
  const doAnimate = async () => {
    if (!spec) return;
    const chosen = keyframes.filter((k) => k.ok && k.assetId && approved.has(k.shot_no)).map((k) => ({ shot_no: k.shot_no, assetId: k.assetId! }));
    if (!chosen.length) { setErr("승인된 키프레임이 없습니다."); return; }
    setErr(null); setBusy(true);
    try {
      const d = await call<{ jobs: JobRow[]; mode?: string; provider?: string }>("/api/remake/animate", { spec, keyframes: chosen });
      setStep(3);
      setAnimInfo({ mode: d.mode, provider: d.provider });
      const jobs = d.jobs.filter((j) => !j.failed);
      // 제출 실패한 컷도 타일로 표시(진짜 사유 노출). 성공 컷만 폴링.
      setClips(Object.fromEntries(d.jobs.map((j) => [j.shot_no, { shot_no: j.shot_no, status: j.failed ? "failed" : "in_progress", error: j.failed ? (j.error || "영상 제출 실패") : null }])));
      // 제공자가 mock이면 실제 영상이 나오지 않음 → 즉시 안내(무한 대기 방지).
      if (d.mode === "mock") { setErr("영상 제공자가 설정되지 않아 시뮬레이션(mock)으로 실행됩니다 — 실제 영상은 생성되지 않습니다. GEMINI(Veo) 또는 Higgsfield 키/REMAKE_PROVIDER를 설정하세요."); }
      if (!jobs.length) { setErr("영상 제출에 모두 실패했습니다: " + (d.jobs.find((j) => j.error)?.error || "제공자/키프레임 확인")); setBusy(false); return; }
      const byId = new Map(jobs.map((j) => [j.id, j.shot_no]));
      const ids = jobs.map((j) => j.id);
      const started = Date.now();
      const WINDOW = 300_000; // 5분 폴링 창
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
          if (!done && Date.now() - started < WINDOW) { pollRef.current = setTimeout(poll, 2500); return; }
          // 폴링 창 종료: 아직 진행 중인 컷은 지연/무응답으로 확정 표시(무한 "생성 중…" 방지).
          if (!done) {
            setClips((prev) => {
              const next = { ...prev };
              for (const c of Object.values(prev)) {
                if (!["completed", "failed", "nsfw"].includes(c.status)) next[c.shot_no] = { ...c, status: "failed", error: c.error || "영상 생성 지연/무응답(5분 초과) — 제공자 응답 없음. draft 티어/제공자 상태를 확인하세요." };
              }
              return next;
            });
            setErr("일부 컷이 5분 내 완료되지 않았습니다 — 제공자(Veo/Omni) 지연 또는 크레딧/모델 문제일 수 있습니다.");
          }
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
      {info && <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700">{info}</div>}

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
              <option value={2}>2차 — 스타일 변형(멀티 A/B)</option>
            </select>
            {stage === 1 && (
              <button onClick={() => doKeyframes()} disabled={busy || !productImg} className="rounded-lg bg-pink-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40">
                {busy && step === 1 ? "렌더 중…" : "② 키프레임 생성"}
              </button>
            )}
            {stage === 2 && (
              <button onClick={doPreviews} disabled={previewBusy || !productImg || selPresets.size === 0} className="rounded-lg bg-pink-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40">
                {previewBusy ? "변형 미리보기 중…" : `② 변형 미리보기 (${selPresets.size})`}
              </button>
            )}
            {!productImg && <span className="text-[11px] text-rose-500">제품 이미지를 올려주세요</span>}
          </div>

          {stage === 2 && (
            <div className="mt-3">
              <div className="mb-1.5 text-[11px] font-semibold text-slate-500">캐릭터 라이브러리 — 비교할 변형 선택(세일즈 구조는 동일 유지)</div>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_PRESET_LIST.map((p) => {
                  const on = selPresets.has(p.id);
                  return (
                    <button key={p.id} onClick={() => setSelPresets((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? "border-pink-500 bg-pink-500 text-white" : "border-slate-300 text-slate-500"}`}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* M4 — 변형 미리보기 비교(A/B): 대표 1컷씩, 고른 변형만 전체 생성 */}
      {stage === 2 && Object.keys(previews).length > 0 && (
        <section className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="mb-2 text-[13px] font-black">변형 비교 — 같은 세일즈 구조, 다른 스타일</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {STYLE_PRESET_LIST.filter((p) => p.id in previews).map((p) => {
              const kf = previews[p.id];
              return (
                <div key={p.id} className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="relative aspect-[9/16] bg-slate-100">
                    {kf?.ok && kf.url ? <img src={kf.url} alt={p.label} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center px-1.5 text-center text-[10px] leading-tight text-rose-500">{kf?.error ? `실패: ${kf.error}` : "렌더 실패"}</div>}
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">{p.label}</span>
                  </div>
                  <button onClick={() => pickVariant(p.id)} disabled={busy || !kf?.ok} className="block w-full bg-pink-600 py-1.5 text-[11px] font-bold text-white disabled:opacity-40">
                    이 변형으로 전체 생성 →
                  </button>
                </div>
              );
            })}
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
                  {k.ok && k.url ? <img src={k.url} alt={`shot ${k.shot_no}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center px-1.5 text-center text-[10px] leading-tight text-rose-500">{k.error ? `실패: ${k.error}` : "렌더 실패"}</div>}
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
            <button onClick={() => doKeyframes()} disabled={busy} className="rounded-lg border border-slate-300 px-3 py-2 text-[12px] font-bold disabled:opacity-40">다시 렌더</button>
            <button onClick={doAnimate} disabled={busy || approved.size === 0} className="rounded-lg bg-pink-600 px-4 py-2 text-[13px] font-bold text-white disabled:opacity-40">
              ③ 승인 {approved.size}컷 영상화 (I2V)
            </button>
          </div>
        </section>
      )}

      {/* STEP 3 — 영상 생성/폴링 */}
      {step >= 3 && (
        <section className="mt-4 rounded-2xl border border-slate-200 p-4">
          <div className="mb-2 flex items-center gap-2 text-[13px] font-black">
            ③ 샷별 영상 (image-to-video)
            {animInfo.mode && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${animInfo.mode === "mock" ? "bg-amber-100 text-amber-700" : "bg-violet-100 text-violet-700"}`}>
                {animInfo.mode === "mock" ? "시뮬레이션(mock)" : `${animInfo.provider || animInfo.mode} 실제 생성`}
              </span>
            )}
          </div>
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

"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles, ArrowRight, ArrowLeft, Upload, Check, Loader2, Play, Download,
  RefreshCw, Star, X, Info, Wand2,
} from "lucide-react";
import {
  REMAKE_TEMPLATES, REMAKE_TEMPLATE_MAP, REMAKE_LANGS, REMAKE_LENGTHS, mockViralScore,
  type RemakeTemplate,
} from "@/data/ktrend/remake-templates";

const STEPS = ["템플릿 선택", "제품 등록", "생성 옵션", "생성", "결과"];
const ROLE_KO: Record<string, string> = { hook: "훅", apply: "발림", result: "결과", cta: "CTA", detail: "디테일" };

interface Variation { v: number; score: ReturnType<typeof mockViralScore>; videoUrl?: string | null; status?: string }

export default function RemakeStudioPage() {
  const [step, setStep] = useState(0);
  const [cat, setCat] = useState<"all" | RemakeTemplate["category"]>("all");
  const [tid, setTid] = useState<string | null>(null);

  // 제품
  const [images, setImages] = useState<string[]>([]);
  const [pname, setPname] = useState("");
  const [benefit, setBenefit] = useState("");
  const [concern, setConcern] = useState("");
  const [url, setUrl] = useState("");

  // 옵션
  const [lang, setLang] = useState<string>(REMAKE_LANGS[0]);
  const [length, setLength] = useState<number>(REMAKE_LENGTHS[1]);
  const [aiPerson, setAiPerson] = useState(true);
  const [brandColor, setBrandColor] = useState("#FF5C8D");

  // 생성
  const [genScene, setGenScene] = useState(0);
  const [results, setResults] = useState<Variation[]>([]);
  const [mode, setMode] = useState<"mock" | "higgsfield">("mock");
  const [genErr, setGenErr] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);

  const tmpl = tid ? REMAKE_TEMPLATE_MAP[tid] : null;
  const templates = REMAKE_TEMPLATES.filter((t) => cat === "all" || t.category === cat);

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).slice(0, 5 - images.length).forEach((f) => {
      if (!f.type.startsWith("image/")) return;
      const r = new FileReader();
      r.onload = () => setImages((p) => (p.length >= 5 ? p : [...p, String(r.result)]));
      r.readAsDataURL(f);
    });
  };

  const finish = (t: RemakeTemplate, jobs: { variation: number; videoUrl?: string | null; status?: string }[]) => {
    const vars: Variation[] = jobs
      .map((j) => ({ v: j.variation, score: mockViralScore(t.id, j.variation), videoUrl: j.videoUrl ?? null, status: j.status }))
      .sort((a, b) => b.score.total - a.score.total);
    setResults(vars);
    if (timerRef.current) clearTimeout(timerRef.current);
    setGenScene(t.scenes.length);
    timerRef.current = setTimeout(() => setStep(4), 500);
  };

  const startGen = async () => {
    if (!tmpl) return;
    const t = tmpl;
    setGenErr(null); setStep(3); setGenScene(0); setResults([]);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pollRef.current) clearTimeout(pollRef.current);

    // 시각적 진행 애니메이션 (실제 진행은 아래 폴링이 관장)
    let i = 0;
    const anim = () => {
      i = Math.min(i + 1, t.scenes.length);
      setGenScene(i);
      if (i < t.scenes.length) timerRef.current = setTimeout(anim, 900);
    };
    timerRef.current = setTimeout(anim, 900);

    try {
      const res = await fetch("/api/remake/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: t.id,
          image: images[0] || null,
          product: { pname, benefit, concern, url },
          options: { lang, length, aiPerson, brandColor },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.jobs?.length) throw new Error(data.error || "생성 시작에 실패했습니다.");
      setMode(data.mode === "higgsfield" ? "higgsfield" : "mock");
      const ids: string[] = data.jobs.map((j: { id: string }) => j.id);

      const poll = async () => {
        try {
          const r = await fetch(`/api/remake/status?ids=${ids.join(",")}`);
          const d = await r.json();
          const jobs: { variation: number; status: string; videoUrl?: string | null }[] = d.jobs || [];
          const done = jobs.length > 0 && jobs.every((j) => ["completed", "failed", "nsfw"].includes(j.status));
          if (done) finish(t, jobs);
          else pollRef.current = setTimeout(poll, 2500);
        } catch {
          pollRef.current = setTimeout(poll, 3000);
        }
      };
      pollRef.current = setTimeout(poll, 2500);
    } catch (e) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setGenErr(e instanceof Error ? e.message : String(e));
      setStep(2);
    }
  };

  const reset = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pollRef.current) clearTimeout(pollRef.current);
    setStep(0); setTid(null); setImages([]); setPname(""); setBenefit(""); setConcern(""); setUrl("");
    setResults([]); setGenScene(0); setGenErr(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-[var(--fg)]">
      {/* 상단 바 */}
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-3 px-4">
          <div className="flex items-center gap-2 font-black">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#FF5C8D] text-white"><Sparkles size={15} /></span>
            Glovek <span className="text-[var(--muted)]">Remake Studio</span>
          </div>
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">프로토타입 · 내부 테스트</span>
          {step > 0 && <button onClick={reset} className="ml-auto text-[12px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">처음부터</button>}
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 py-6">
        {/* 스텝 인디케이터 */}
        <div className="mb-6 flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex shrink-0 items-center">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                i === step ? "bg-[var(--accent)] text-white" : i < step ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                {i < step ? <Check size={12} /> : <span>{i + 1}</span>} {s}
              </div>
              {i < STEPS.length - 1 && <div className="mx-0.5 h-px w-4 bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* 프로토타입 안내 */}
        {step === 0 && (
          <div className="mb-5 flex items-start gap-2 rounded-xl border border-[var(--border)] bg-white p-4 text-[12px] leading-relaxed text-[var(--muted)]">
            <Info size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <div>
              <b className="text-[var(--fg)]">검증된 바이럴 레퍼런스 구조로 제품 영상을 자동 생성</b>하는 기능의 프로토타입입니다.
              템플릿마다 <b>실제 성과 데이터</b>(조회수·참여율·ROAS)가 붙어 있어, 무엇이 터지는지 알고 제작합니다.
              원본 영상은 저장하지 않고 <b>구조만</b> 재현합니다(저작권 안전). ※ 서버에 <code>HF_CREDENTIALS</code>가 설정되면 <b>Higgsfield</b>로 실제 영상을 생성하고, 없으면 시뮬레이션으로 동작합니다.
            </div>
          </div>
        )}

        {/* STEP 0: 템플릿 갤러리 */}
        {step === 0 && (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h1 className="text-[20px] font-black">리메이크 템플릿</h1>
              <span className="text-[12px] text-[var(--muted)]">지금 터지는 구조를 골라 내 제품에 입히세요</span>
              <div className="ml-auto flex gap-1.5">
                {[["all", "전체"], ["skincare", "스킨케어"], ["makeup", "메이크업"], ["haircare", "헤어케어"]].map(([k, v]) => (
                  <button key={k} onClick={() => setCat(k as typeof cat)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${cat === k ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{v}</button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <button key={t.id} onClick={() => { setTid(t.id); setStep(1); }}
                  className={`group overflow-hidden rounded-2xl border bg-white text-left transition hover:shadow-lg ${tid === t.id ? "border-[var(--accent)] ring-2 ring-[var(--accent)]" : "border-[var(--border)]"}`}>
                  <div className="relative h-40" style={{ background: t.grad }}>
                    <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">▶ {t.hookType}</span>
                    <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-bold text-[var(--fg)]">리메이크 가능</span>
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
                      <span className="text-[13px] font-black drop-shadow">👁 {t.perf.views}</span>
                      <span className="text-[11px] font-bold drop-shadow">참여 {t.perf.engagement}{t.perf.roas ? ` · ROAS ${t.perf.roas}` : ""}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-black">{t.name}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-[var(--muted)]">{t.categoryKo}</span>
                    </div>
                    <p className="mt-1 text-[11px] italic text-[var(--muted)]">“{t.hookCopy}”</p>
                    <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-[var(--muted)]">💡 {t.why}</p>
                    <div className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[var(--accent)]">이 구조로 내 제품 만들기 <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" /></div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: 제품 등록 */}
        {step === 1 && tmpl && (
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-3">
              <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <h2 className="text-[15px] font-black">제품 등록</h2>
                <p className="mt-1 text-[12px] text-[var(--muted)]">제품 이미지를 올리면 배경 제거·다각도 정규화 후 모든 장면에 일관되게 합성됩니다.</p>

                <div className="mt-4">
                  <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">제품 이미지 (1~5장, 정면·측면 권장)</span>
                  <div className="flex flex-wrap gap-2">
                    {images.map((src, i) => (
                      <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--border)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-full w-full object-cover" />
                        <button onClick={() => setImages((p) => p.filter((_, k) => k !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"><X size={12} /></button>
                      </div>
                    ))}
                    {images.length < 5 && (
                      <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]">
                        <Upload size={18} />
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ""; }} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="제품명" value={pname} onChange={setPname} placeholder="예) 글로우 리페어 세럼" />
                  <Field label="핵심 효능" value={benefit} onChange={setBenefit} placeholder="예) 수분·광채·진정" />
                  <Field label="타깃 피부 고민" value={concern} onChange={setConcern} placeholder="예) 건조·칙칙함" />
                  <Field label="상세페이지 URL (선택)" value={url} onChange={setUrl} placeholder="https://…" />
                </div>
                <p className="mt-2 text-[10px] text-[var(--muted)]">※ URL 입력 시 상세페이지에서 제품 정보를 자동 추출합니다(프로토타입 데모).</p>
              </div>

              <div className="mt-3 flex gap-2">
                <button onClick={() => setStep(0)} className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-[12px] font-bold text-[var(--muted)] hover:bg-white"><ArrowLeft size={14} className="mr-1 inline" /> 템플릿</button>
                <button onClick={() => setStep(2)} disabled={!images.length}
                  className="flex-1 rounded-lg bg-[var(--accent)] py-2.5 text-[12px] font-bold text-white disabled:opacity-50">
                  다음: 생성 옵션 <ArrowRight size={14} className="ml-1 inline" />
                </button>
              </div>
              {!images.length && <p className="mt-2 text-center text-[10px] text-[var(--muted)]">제품 이미지를 1장 이상 올리면 다음으로 넘어갈 수 있어요.</p>}
            </div>

            <TemplateSide tmpl={tmpl} />
          </div>
        )}

        {/* STEP 2: 생성 옵션 */}
        {step === 2 && tmpl && (
          <div className="grid gap-4 md:grid-cols-5">
            <div className="md:col-span-3">
              <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <h2 className="text-[15px] font-black">생성 옵션</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">언어</span>
                    <div className="flex flex-wrap gap-1.5">
                      {REMAKE_LANGS.map((l) => (
                        <button key={l} onClick={() => setLang(l)} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${lang === l ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="mb-1.5 block text-[11px] font-semibold text-[var(--muted)]">길이</span>
                    <div className="flex gap-1.5">
                      {REMAKE_LENGTHS.map((s) => (
                        <button key={s} onClick={() => setLength(s)} className={`rounded-full border px-4 py-1.5 text-[11px] font-semibold ${length === s ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{s}초</button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-[12px]">
                    <input type="checkbox" checked={aiPerson} onChange={(e) => setAiPerson(e.target.checked)} />
                    AI 인물 포함 (셀피형 UGC) <span className="text-[10px] text-[var(--muted)]">— 실존 인물 유사성은 차단됩니다</span>
                  </label>
                  <div className="flex items-center gap-2 text-[12px]">
                    <span className="text-[11px] font-semibold text-[var(--muted)]">브랜드 컬러</span>
                    <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-8 w-12 rounded border border-[var(--border)]" />
                    <span className="text-[11px] text-[var(--muted)]">CTA·자막 강조색으로 사용</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setStep(1)} className="rounded-lg border border-[var(--border)] px-5 py-2.5 text-[12px] font-bold text-[var(--muted)] hover:bg-white"><ArrowLeft size={14} className="mr-1 inline" /> 제품</button>
                <button onClick={startGen} className="flex-1 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#FF5C8D] py-2.5 text-[12px] font-black text-white">
                  <Wand2 size={14} className="mr-1 inline" /> 영상 생성 시작
                </button>
              </div>
              {genErr && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-center text-[11px] font-semibold text-rose-600">{genErr}</p>}
            </div>
            <TemplateSide tmpl={tmpl} />
          </div>
        )}

        {/* STEP 3: 생성 중 */}
        {step === 3 && tmpl && (
          <div className="mx-auto max-w-xl rounded-2xl border border-[var(--border)] bg-white p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#FF5C8D] text-white">
              <Loader2 size={26} className="animate-spin" />
            </div>
            <h2 className="mt-4 text-[16px] font-black">영상 생성 중…</h2>
            <p className="mt-1 text-[12px] text-[var(--muted)]">제품 레퍼런스를 컨디셔닝해 변형을 생성합니다. 실제 모델 연결 시 수십 초~수 분 걸릴 수 있습니다.</p>
            <div className="mt-5 space-y-2 text-left">
              {tmpl.scenes.map((sc, i) => {
                const done = i < genScene; const active = i === genScene;
                return (
                  <div key={i} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-[12px] ${done ? "border-emerald-200 bg-emerald-50" : active ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)]"}`}>
                    <span className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: done ? "#0E9F6E" : active ? "var(--accent)" : "#CBD5E1" }}>
                      {done ? <Check size={13} /> : active ? <Loader2 size={13} className="animate-spin" /> : i + 1}
                    </span>
                    <span className="font-semibold">{ROLE_KO[sc.role]}</span>
                    <span className="text-[var(--muted)]">{sc.camera} · {sc.sec}s</span>
                    <span className="ml-auto text-[10px] text-[var(--muted)]">{sc.productSlot !== "none" ? "제품 합성" : "연출"}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${Math.round((genScene / tmpl.scenes.length) * 100)}%` }} />
            </div>
          </div>
        )}

        {/* STEP 4: 결과 */}
        {step === 4 && tmpl && (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-black">생성 결과 · 변형 {results.length}종</h2>
              {mode === "higgsfield" ? (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">Higgsfield 실제 생성</span>
              ) : (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">시뮬레이션 (모델 미연결)</span>
              )}
              <span className="text-[12px] text-[var(--muted)]">바이럴 예측 점수 상위부터 테스트하세요</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {results.map(({ v, score, videoUrl, status }, rank) => {
                const failed = status === "failed" || status === "nsfw";
                return (
                <div key={v} className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                  <div className="relative aspect-[9/16]" style={{ background: tmpl.grad }}>
                    {videoUrl ? (
                      <video src={videoUrl} controls loop playsInline className="absolute inset-0 h-full w-full bg-black object-cover" />
                    ) : (
                      <>
                        {images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={images[0]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-multiply" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        {failed ? (
                          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-rose-600/90 px-3 py-1 text-[11px] font-bold text-white">생성 실패</span>
                        ) : (
                          <button className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-[var(--accent)]"><Play size={20} fill="currentColor" /></button>
                        )}
                      </>
                    )}
                    {rank === 0 && !failed && <span className="absolute left-2 top-2 z-10 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-black text-white">추천</span>}
                    <span className="absolute right-2 top-2 z-10 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-bold">변형 {v + 1}</span>
                    {!videoUrl && !failed && (
                      <div className="absolute bottom-2 left-2 right-2 text-white">
                        <div className="flex items-center gap-1 text-[11px] font-bold"><Star size={12} fill="currentColor" className="text-amber-300" /> 바이럴 예측 {score.total}</div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 text-[11px]">
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <Metric l="훅" v={score.hook} />
                      <Metric l="유지" v={score.retention} />
                      <Metric l="적합" v={score.fit} />
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      {videoUrl ? (
                        <a href={videoUrl} target="_blank" rel="noopener noreferrer" download className="flex-1 rounded-lg bg-[var(--accent)] py-1.5 text-center font-bold text-white"><Download size={12} className="mr-1 inline" />다운로드</a>
                      ) : (
                        <button onClick={() => alert(failed ? "이 변형은 생성에 실패했습니다. 다시 시도해 주세요." : "시뮬레이션 결과입니다. 실제 영상은 HF_CREDENTIALS 설정 후 생성됩니다.")} className="flex-1 rounded-lg bg-[var(--accent)] py-1.5 font-bold text-white disabled:opacity-50"><Download size={12} className="mr-1 inline" />다운로드</button>
                      )}
                      <button onClick={() => startGen()} className="rounded-lg border border-[var(--border)] px-2 py-1.5 text-[var(--muted)]" title="다시 생성"><RefreshCw size={13} /></button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-2 rounded-xl bg-white p-4 text-[11px] text-[var(--muted)] sm:flex-row sm:items-center">
              <Info size={15} className="shrink-0 text-[var(--accent)]" />
              <span>틱톡 업로드 시 <b className="text-[var(--fg)]">AIGC(AI 생성) 라벨</b>을 부착하세요. 업로드 후 성과는 Glovek 대시보드로 회수되어 템플릿 추천을 고도화합니다(플라이휠).</span>
              <button onClick={reset} className="rounded-lg border border-[var(--border)] px-4 py-2 font-bold text-[var(--fg)] sm:ml-auto">새 영상 만들기</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateSide({ tmpl }: { tmpl: RemakeTemplate }) {
  return (
    <div className="md:col-span-2">
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
        <div className="relative h-32" style={{ background: tmpl.grad }}>
          <span className="absolute bottom-2 left-3 text-[13px] font-black text-white drop-shadow">👁 {tmpl.perf.views} · 참여 {tmpl.perf.engagement}</span>
        </div>
        <div className="p-4 text-[12px]">
          <div className="text-[14px] font-black">{tmpl.name}</div>
          <p className="mt-1 italic text-[var(--muted)]">“{tmpl.hookCopy}”</p>
          <div className="mt-3 space-y-1.5">
            <div className="text-[11px] font-bold text-[var(--muted)]">장면 그래프</div>
            {tmpl.scenes.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="w-10 shrink-0 rounded bg-slate-100 px-1 py-0.5 text-center font-bold text-[var(--muted)]">{ROLE_KO[s.role]}</span>
                <span className="text-[var(--muted)]">{s.camera}</span>
                <span className="ml-auto text-[var(--muted)]">{s.sec}s</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 p-2 text-[10px] leading-relaxed text-[var(--muted)]">
            톤: {tmpl.tone} · 사운드: {tmpl.sound}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[12px]" />
    </label>
  );
}

function Metric({ l, v }: { l: string; v: number }) {
  return (
    <div className="rounded bg-slate-50 py-1">
      <div className="font-black text-[var(--accent)]">{v}</div>
      <div className="text-[9px] text-[var(--muted)]">{l}</div>
    </div>
  );
}

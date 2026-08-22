"use client";

// Remake Studio v2 — 브랜드 제품 자산 사전등록 → 트렌드 포맷 선택(또는 레퍼런스 업로드) → 우리 제품 영상화.
// v1(/remake/studio) 파이프라인(keyframes→animate→assemble) 재사용. 관리자 세션 게이트.
import { useCallback, useEffect, useRef, useState } from "react";
import { REMAKE_TEMPLATES, type RemakeTemplate } from "@/data/ktrend/remake-templates";
import { templateToSpec } from "@/lib/remake/template-spec";
import { STYLE_PRESET_LIST, type ReferenceSpec } from "@/lib/remake/spec";

type Kind = "package" | "texture" | "logo" | "shot";
const KIND_KO: Record<Kind, string> = { package: "패키지 디자인", texture: "제형 에셋", logo: "로고", shot: "제품컷" };
interface Product { id: string; brand: string | null; name: string; category: string | null; concept: string | null; usp: string | null; asset_count?: number; cover_asset?: string | null; }
interface Asset { id: number; asset_id: string; kind: Kind; label: string | null; is_primary: boolean; }
interface KF { shot_no: number; sales_beat: string; needs_product: boolean; ok: boolean; assetId?: string; url?: string; error?: string }
interface ClipRow { shot_no: number; status: string; videoUrl?: string | null; error?: string | null }

async function assetToDataUrl(assetId: string): Promise<string> {
  const res = await fetch(`/api/remake/asset/${assetId}`);
  const blob = await res.blob();
  return await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.readAsDataURL(blob); });
}
async function postRaw<T>(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

export default function RemakeStudio2() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [loginErr, setLoginErr] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [sel, setSel] = useState<Product | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState({ id: "", brand: "", name: "", category: "", concept: "", usp: "" });

  // 영상화
  const [mode, setMode] = useState<"template" | "reference">("template");
  const [tpl, setTpl] = useState<RemakeTemplate | null>(null);
  const [refUrl, setRefUrl] = useState("");
  const [preset, setPreset] = useState(STYLE_PRESET_LIST[0]?.id || "avatar_B/clean_studio");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [spec, setSpec] = useState<ReferenceSpec | null>(null);
  const [keyframes, setKeyframes] = useState<KF[]>([]);
  const [approved, setApproved] = useState<Set<number>>(new Set());
  const [clips, setClips] = useState<Record<number, ClipRow>>({});
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fetch("/api/admin/session", { cache: "no-store" }).then((r) => r.json()).then((j) => setAuthed(!!j.authed)).catch(() => setAuthed(false)); }, []);
  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const loadProducts = useCallback(() => { fetch("/api/remake2/products").then((r) => r.json()).then((j) => setProducts(j.rows || [])).catch(() => {}); }, []);
  useEffect(() => { if (authed) loadProducts(); }, [authed, loadProducts]);

  async function loadProduct(id: string) {
    const r = await fetch(`/api/remake2/products?id=${id}`); const j = await r.json();
    if (r.ok) { setSel(j.product); setAssets(j.assets || []); setForm({ id: j.product.id, brand: j.product.brand || "", name: j.product.name, category: j.product.category || "", concept: j.product.concept || "", usp: j.product.usp || "" }); }
  }
  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoginErr(null);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
    const d = await r.json().catch(() => ({})); if (r.ok && d.ok) setAuthed(true); else setLoginErr(d.error || "로그인 실패");
  }
  async function saveProduct() {
    if (!form.name.trim()) { alert("제품명을 입력하세요"); return; }
    const r = await fetch("/api/remake2/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json(); if (!r.ok) { alert(j.error || "저장 실패"); return; }
    loadProducts(); loadProduct(j.id);
  }
  function newProduct() { setSel(null); setAssets([]); setForm({ id: "", brand: "", name: "", category: "", concept: "", usp: "" }); }
  async function delProduct(id: string) { if (!confirm("제품과 자산을 삭제할까요?")) return; await fetch(`/api/remake2/products?id=${id}`, { method: "DELETE" }); newProduct(); loadProducts(); }

  async function uploadAsset(kind: Kind, file: File) {
    if (!sel) return;
    const dataUrl = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(file); });
    const r = await fetch("/api/remake2/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: sel.id, kind, image: dataUrl }) });
    const j = await r.json(); if (!r.ok) { alert(j.error || "업로드 실패"); return; }
    loadProduct(sel.id); loadProducts();
  }
  async function delAsset(id: number) { await fetch(`/api/remake2/assets?id=${id}`, { method: "DELETE" }); if (sel) loadProduct(sel.id); loadProducts(); }
  async function makePrimary(id: number) { await fetch("/api/remake2/assets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (sel) loadProduct(sel.id); loadProducts(); }

  const primaryAsset = () => assets.find((a) => a.is_primary) || assets[0] || null;

  // ── 영상화: 스펙 확보 → 키프레임 → (승인) → 애니메이트 → 폴링 ──
  async function generate() {
    if (!sel) { setErr("제품을 선택하세요"); return; }
    const pa = primaryAsset();
    if (!pa) { setErr("제품 자산(패키지/제형 등)을 1개 이상 등록하세요"); return; }
    setErr(null); setInfo(null); setBusy(true); setKeyframes([]); setClips({}); setFinalVideo(null);
    try {
      // 1) 스펙
      let sp: ReferenceSpec;
      if (mode === "template") {
        if (!tpl) { setErr("트렌드 포맷을 선택하세요"); setBusy(false); return; }
        sp = templateToSpec(tpl);
      } else {
        if (!/tiktok\.com/.test(refUrl)) { setErr("틱톡 레퍼런스 URL을 입력하세요"); setBusy(false); return; }
        const d = await postRaw<{ spec?: ReferenceSpec; error?: string }>("/api/remake/decompose", { refTiktokUrl: refUrl });
        if (!d.ok || !d.data.spec) throw new Error(d.data.error || "레퍼런스 분석 실패");
        sp = d.data.spec;
      }
      setSpec(sp);
      // 2) 제품 이미지(dataURL) → 키프레임
      const img = await assetToDataUrl(pa.asset_id);
      const kf = await postRaw<{ keyframes?: KF[]; error?: string; replicaFallback?: boolean }>(
        "/api/remake/keyframes", { spec: sp, image: img, stage: 2, preset },
      );
      const kfs: KF[] = Array.isArray(kf.data.keyframes) ? kf.data.keyframes : [];
      if (!kf.ok && !kfs.length) throw new Error(kf.data.error || "키프레임 생성 실패");
      setKeyframes(kfs);
      setApproved(new Set(kfs.filter((k) => k.ok).map((k) => k.shot_no)));
      if (kfs.filter((k) => k.ok).length === 0) setErr("키프레임이 렌더되지 않았습니다: " + (kfs.find((k) => k.error)?.error || kf.data.error || "이미지 모델 오류"));
    } catch (e) { setErr(String(e instanceof Error ? e.message : e)); }
    setBusy(false);
  }

  async function animate() {
    if (!spec) return;
    const chosen = keyframes.filter((k) => k.ok && k.assetId && approved.has(k.shot_no)).map((k) => ({ shot_no: k.shot_no, assetId: k.assetId! }));
    if (!chosen.length) { setErr("승인된 키프레임이 없습니다"); return; }
    setErr(null); setBusy(true);
    try {
      const d = await postRaw<{ jobs?: { id: string; shot_no: number; failed?: boolean; error?: string }[]; mode?: string; error?: string }>(
        "/api/remake/animate", { spec, keyframes: chosen });
      if (!d.ok) throw new Error(d.data.error || "생성 실패");
      const jobs = (d.data.jobs || []);
      setClips(Object.fromEntries(jobs.map((j) => [j.shot_no, { shot_no: j.shot_no, status: j.failed ? "failed" : "in_progress", error: j.failed ? (j.error || "제출 실패") : null }])));
      if (d.data.mode === "mock") setInfo("영상 제공자 미설정 → mock 시뮬레이션(실제 영상 없음). GEMINI(Veo)/Higgsfield 키·REMAKE_PROVIDER 설정 필요.");
      const live = jobs.filter((j) => !j.failed);
      if (!live.length) { setErr("영상 제출 실패: " + (jobs.find((j) => j.error)?.error || "제공자/키프레임 확인")); setBusy(false); return; }
      const byId = new Map(live.map((j) => [j.id, j.shot_no]));
      const ids = live.map((j) => j.id); const started = Date.now();
      const poll = async () => {
        try {
          const r = await fetch(`/api/remake/status?ids=${ids.join(",")}`); const s = await r.json();
          const rows: { id: string; status: string; videoUrl?: string | null; error?: string | null }[] = s.jobs || [];
          setClips((prev) => { const next = { ...prev }; for (const row of rows) { const sn = byId.get(row.id); if (sn != null) next[sn] = { shot_no: sn, status: row.status, videoUrl: row.videoUrl, error: row.error }; } return next; });
          const done = rows.length && rows.every((j) => ["completed", "failed", "nsfw"].includes(j.status));
          if (!done && Date.now() - started < 300000) { pollRef.current = setTimeout(poll, 2500); }
        } catch { pollRef.current = setTimeout(poll, 3000); }
      };
      pollRef.current = setTimeout(poll, 2500);
    } catch (e) { setErr(String(e instanceof Error ? e.message : e)); }
    setBusy(false);
  }

  async function assemble() {
    const done = Object.values(clips).filter((c) => c.status === "completed" && c.videoUrl);
    if (!done.length) { setErr("완성된 클립이 없습니다"); return; }
    setBusy(true); setErr(null);
    try {
      const d = await postRaw<{ videoUrl?: string; error?: string }>("/api/remake/assemble", { spec, clips: done.map((c) => ({ shot_no: c.shot_no, videoUrl: c.videoUrl })) });
      if (d.data.videoUrl) setFinalVideo(d.data.videoUrl); else setInfo("합본 워커 미배포 — 개별 클립을 그대로 사용하세요.");
    } catch (e) { setErr(String(e instanceof Error ? e.message : e)); }
    setBusy(false);
  }

  if (authed === null) return <div className="grid min-h-screen place-items-center text-slate-400">불러오는 중…</div>;
  if (!authed) return (
    <div className="grid min-h-screen place-items-center bg-slate-950 p-6">
      <form onSubmit={login} className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 text-white">
        <h1 className="text-[18px] font-black">Remake Studio v2 · 관리자</h1>
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder="아이디" className="mt-4 w-full rounded-md bg-slate-800 px-3 py-2 text-[13px] outline-none" />
        <input type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder="비밀번호" className="mt-2 w-full rounded-md bg-slate-800 px-3 py-2 text-[13px] outline-none" />
        {loginErr && <p className="mt-2 text-[12px] text-rose-400">{loginErr}</p>}
        <button className="mt-4 w-full rounded-md bg-[var(--accent,#ec4899)] py-2.5 text-[13px] font-bold">로그인</button>
      </form>
    </div>
  );

  const card = "rounded-2xl border border-[var(--border,#e2e8f0)] bg-white p-5";
  const inp = "w-full rounded-md border border-[var(--border,#e2e8f0)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent,#ec4899)]";

  return (
    <div className="min-h-screen bg-[var(--bg,#fff)] text-[var(--fg,#2d3748)]">
      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[3px] text-[var(--accent,#ec4899)]">Remake Studio · v2</div>
            <h1 className="mt-1 text-[24px] font-black tracking-tight sm:text-[30px]">제품 자산 → 트렌드 포맷 영상화</h1>
            <p className="mt-1 text-[13px] text-[var(--muted,#64748b)]">제품·에셋을 등록해두고, 트렌디한 포맷을 골라 우리 제품 영상을 만듭니다.</p>
          </div>
          <a href="/remake/studio" className="rounded-md border border-[var(--border,#e2e8f0)] px-3 py-1.5 text-[11px] text-[var(--muted,#64748b)]">v1 스튜디오 →</a>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[380px_1fr]">
          {/* 좌: 제품 등록/관리 */}
          <div className="space-y-4">
            <div className={card}>
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-black">제품 {sel ? "수정" : "등록"}</h2>
                {sel && <button onClick={newProduct} className="text-[11px] text-[var(--muted,#64748b)] underline">새 제품</button>}
              </div>
              <div className="mt-3 space-y-2">
                <input className={inp} placeholder="제품명 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inp} placeholder="브랜드" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                  <input className={inp} placeholder="카테고리" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <input className={inp} placeholder="컨셉" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} />
                <input className={inp} placeholder="USP" value={form.usp} onChange={(e) => setForm({ ...form, usp: e.target.value })} />
                <button onClick={saveProduct} className="w-full rounded-md bg-[var(--accent,#ec4899)] py-2 text-[12px] font-bold text-white">{sel ? "수정 저장" : "제품 등록"}</button>
              </div>

              {/* 자산 업로드 */}
              {sel && (
                <div className="mt-4 border-t border-[var(--border,#e2e8f0)] pt-3">
                  <div className="text-[12px] font-bold">자산 등록</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(Object.keys(KIND_KO) as Kind[]).map((k) => (
                      <label key={k} className="cursor-pointer rounded-md border border-dashed border-[var(--border,#e2e8f0)] px-2 py-2 text-center text-[11px] text-[var(--muted,#64748b)] hover:border-[var(--accent,#ec4899)]">
                        + {KIND_KO[k]}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAsset(k, f); e.target.value = ""; }} />
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {assets.map((a) => (
                      <div key={a.id} className="group relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/remake/asset/${a.asset_id}`} alt={a.kind} className="aspect-square w-full rounded-md object-cover ring-1 ring-[var(--border,#e2e8f0)]" />
                        <div className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] text-white">{KIND_KO[a.kind]}</div>
                        {a.is_primary && <div className="absolute right-1 top-1 rounded bg-[var(--accent,#ec4899)] px-1 text-[9px] font-bold text-white">대표</div>}
                        <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-0.5 opacity-0 group-hover:opacity-100">
                          {!a.is_primary && <button onClick={() => makePrimary(a.id)} className="text-[9px] text-white">대표</button>}
                          <button onClick={() => delAsset(a.id)} className="text-[9px] text-rose-300">삭제</button>
                        </div>
                      </div>
                    ))}
                    {!assets.length && <p className="col-span-3 text-[11px] text-[var(--muted,#64748b)]">패키지·제형 이미지를 등록하세요(대표 이미지가 영상 제품으로 사용됩니다).</p>}
                  </div>
                </div>
              )}
            </div>

            {/* 제품 목록 */}
            <div className={card}>
              <h2 className="text-[14px] font-black">등록 제품 ({products.length})</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {products.map((pr) => (
                  <button key={pr.id} onClick={() => loadProduct(pr.id)} className={`rounded-lg border p-2 text-left ${sel?.id === pr.id ? "border-[var(--accent,#ec4899)]" : "border-[var(--border,#e2e8f0)]"}`}>
                    {pr.cover_asset
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={`/api/remake/asset/${pr.cover_asset}`} alt="" className="aspect-video w-full rounded object-cover" />
                      : <div className="grid aspect-video w-full place-items-center rounded bg-slate-100 text-[10px] text-slate-400">이미지 없음</div>}
                    <div className="mt-1 truncate text-[12px] font-bold">{pr.name}</div>
                    <div className="truncate text-[10px] text-[var(--muted,#64748b)]">{pr.brand || "—"} · 자산 {pr.asset_count || 0}</div>
                  </button>
                ))}
                {!products.length && <p className="col-span-2 text-[12px] text-[var(--muted,#64748b)]">등록된 제품이 없습니다.</p>}
              </div>
              {sel && <button onClick={() => delProduct(sel.id)} className="mt-3 text-[11px] text-rose-500">선택 제품 삭제</button>}
            </div>
          </div>

          {/* 우: 영상화 */}
          <div className="space-y-4">
            <div className={card}>
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-black">영상화 {sel && <span className="text-[12px] font-normal text-[var(--muted,#64748b)]">· {sel.name}</span>}</h2>
                <div className="flex gap-1">
                  {(["template", "reference"] as const).map((m) => (
                    <button key={m} onClick={() => setMode(m)} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${mode === m ? "bg-[var(--accent,#ec4899)] text-white" : "border border-[var(--border,#e2e8f0)] text-[var(--muted,#64748b)]"}`}>{m === "template" ? "트렌드 포맷" : "레퍼런스 URL"}</button>
                  ))}
                </div>
              </div>

              {mode === "template" ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {REMAKE_TEMPLATES.map((t) => (
                    <button key={t.id} onClick={() => setTpl(t)} className={`rounded-lg border p-2 text-left ${tpl?.id === t.id ? "border-[var(--accent,#ec4899)] ring-1 ring-[var(--accent,#ec4899)]" : "border-[var(--border,#e2e8f0)]"}`}>
                      <div className="h-16 w-full rounded" style={{ background: t.grad }} />
                      <div className="mt-1 text-[12px] font-bold leading-tight">{t.name}</div>
                      <div className="text-[10px] text-[var(--muted,#64748b)]">{t.categoryKo} · {t.hookType}</div>
                      <div className="mt-0.5 text-[10px] text-[var(--muted,#64748b)]">▶ {t.perf.views} · 참여 {t.perf.engagement}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3">
                  <input className={inp} placeholder="틱톡 레퍼런스 URL (https://www.tiktok.com/...)" value={refUrl} onChange={(e) => setRefUrl(e.target.value)} />
                  <p className="mt-1 text-[11px] text-[var(--muted,#64748b)]">원본은 저장하지 않고 구조(훅·컷 구성)만 분석해 우리 제품에 적용합니다.</p>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-[var(--muted,#64748b)]">스타일</span>
                <select className="rounded-md border border-[var(--border,#e2e8f0)] px-2 py-1 text-[11px]" value={preset} onChange={(e) => setPreset(e.target.value)}>
                  {STYLE_PRESET_LIST.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <button onClick={generate} disabled={busy || !sel} className="ml-auto rounded-md bg-[var(--accent,#ec4899)] px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50">{busy ? "생성 중…" : "① 키프레임 생성"}</button>
              </div>
              {err && <p className="mt-2 text-[12px] font-semibold text-rose-600">{err}</p>}
              {info && <p className="mt-2 text-[12px] text-amber-600">{info}</p>}
            </div>

            {/* 키프레임 승인 게이트 */}
            {keyframes.length > 0 && (
              <div className={card}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-black">② 키프레임 확인 · 승인</h2>
                  <button onClick={animate} disabled={busy} className="rounded-md bg-[var(--accent,#ec4899)] px-3 py-1.5 text-[11px] font-bold text-white">③ 영상 생성 ({approved.size})</button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {keyframes.map((k) => (
                    <div key={k.shot_no} className={`rounded-lg border p-1.5 ${approved.has(k.shot_no) ? "border-[var(--accent,#ec4899)]" : "border-[var(--border,#e2e8f0)]"}`}>
                      {k.ok && k.url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={k.url} alt={`shot ${k.shot_no}`} className="aspect-[9/16] w-full rounded object-cover" />
                        : <div className="grid aspect-[9/16] w-full place-items-center rounded bg-rose-50 p-1 text-center text-[9px] text-rose-500">{k.error || "실패"}</div>}
                      <label className="mt-1 flex items-center gap-1 text-[10px]">
                        <input type="checkbox" checked={approved.has(k.shot_no)} disabled={!k.ok} onChange={(e) => setApproved((prev) => { const n = new Set(prev); if (e.target.checked) n.add(k.shot_no); else n.delete(k.shot_no); return n; })} />
                        컷{k.shot_no} · {k.sales_beat}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 클립/결과 */}
            {Object.keys(clips).length > 0 && (
              <div className={card}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-black">④ 영상 클립</h2>
                  <button onClick={assemble} disabled={busy} className="rounded-md border border-[var(--border,#e2e8f0)] px-3 py-1.5 text-[11px] font-bold">⑤ 합본</button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {Object.values(clips).sort((a, b) => a.shot_no - b.shot_no).map((c) => (
                    <div key={c.shot_no} className="rounded-lg border border-[var(--border,#e2e8f0)] p-1.5">
                      {c.status === "completed" && c.videoUrl
                        ? <video src={c.videoUrl} controls className="aspect-[9/16] w-full rounded bg-black object-cover" />
                        : <div className="grid aspect-[9/16] w-full place-items-center rounded bg-slate-100 p-1 text-center text-[10px] text-slate-500">{c.status === "failed" ? (c.error || "실패") : "생성 중…"}</div>}
                      <div className="mt-1 text-[10px] text-[var(--muted,#64748b)]">컷{c.shot_no} · {c.status}</div>
                    </div>
                  ))}
                </div>
                {finalVideo && (
                  <div className="mt-4">
                    <div className="text-[12px] font-bold">최종 합본</div>
                    <video src={finalVideo} controls className="mt-1 aspect-[9/16] w-full max-w-[280px] rounded bg-black" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

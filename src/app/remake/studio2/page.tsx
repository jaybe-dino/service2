"use client";

// Remake Studio v2 — 브랜드 자산 / 제품 자산 분리 관리 → 트렌드 포맷 영상화.
// 계층: 브랜드(로고·가이드·공통) → 제품(패키지·제형·제품컷) → 영상화(v1 파이프라인 재사용).
import { useCallback, useEffect, useRef, useState } from "react";
import { REMAKE_TEMPLATES, type RemakeTemplate } from "@/data/ktrend/remake-templates";
import { templateToSpec } from "@/lib/remake/template-spec";
import { STYLE_PRESET_LIST, type ReferenceSpec } from "@/lib/remake/spec";

interface Brand { id: string; name: string; notes: string | null; asset_count?: number; product_count?: number; logo_asset?: string | null; }
interface Product { id: string; brand_id: string | null; brand: string | null; name: string; category: string | null; concept: string | null; usp: string | null; asset_count?: number; cover_asset?: string | null; }
interface Asset { id: number; asset_id: string; kind: string; label: string | null; is_primary?: boolean; }
interface KF { shot_no: number; sales_beat: string; needs_product: boolean; ok: boolean; assetId?: string; url?: string; error?: string }
interface ClipRow { shot_no: number; status: string; videoUrl?: string | null; error?: string | null }

const BRAND_KINDS = [{ k: "logo", ko: "로고" }, { k: "guide", ko: "브랜드 가이드" }, { k: "common", ko: "공통 이미지" }, { k: "other", ko: "기타" }];
const PROD_KINDS = [{ k: "package", ko: "패키지" }, { k: "texture", ko: "제형" }, { k: "shot", ko: "제품컷" }, { k: "detail", ko: "디테일" }, { k: "logo", ko: "로고" }, { k: "other", ko: "기타" }];
const KIND_KO: Record<string, string> = Object.fromEntries([...BRAND_KINDS, ...PROD_KINDS].map((x) => [x.k, x.ko]));

async function downscale(file: File, max = 1280, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(file); });
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    if (scale >= 1 && dataUrl.length < 3_000_000) return dataUrl;
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d"); if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } catch { return dataUrl; }
}
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

// 자산 그리드 — 브랜드/제품 공용. 업로드(종류별)·라벨수정·종류변경·대표·삭제.
function AssetGrid({ assets, kinds, onUpload, onRelabel, onKind, onDelete, onPrimary }: {
  assets: Asset[]; kinds: { k: string; ko: string }[];
  onUpload: (kind: string, file: File) => void; onRelabel: (id: number, label: string) => void;
  onKind: (id: number, kind: string) => void; onDelete: (id: number) => void; onPrimary?: (id: number) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {kinds.map((k) => (
          <label key={k.k} className="cursor-pointer rounded-md border border-dashed border-[var(--border,#e2e8f0)] px-2 py-1 text-[11px] text-[var(--muted,#64748b)] hover:border-[var(--accent,#ec4899)]">
            + {k.ko}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { Array.from(e.target.files || []).forEach((f) => onUpload(k.k, f)); e.target.value = ""; }} />
          </label>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {assets.map((a) => (
          <div key={a.id} className="group relative overflow-hidden rounded-md ring-1 ring-[var(--border,#e2e8f0)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/remake/asset/${a.asset_id}`} alt={a.kind} className="aspect-square w-full object-cover" />
            <div className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] text-white">{KIND_KO[a.kind] || a.kind}</div>
            {a.is_primary && <div className="absolute right-1 top-1 rounded bg-[var(--accent,#ec4899)] px-1 text-[9px] font-bold text-white">대표</div>}
            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100">
              <div className="truncate text-[9px]">{a.label || "(라벨 없음)"}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px]">
                <button onClick={() => { const v = prompt("라벨", a.label || ""); if (v !== null) onRelabel(a.id, v); }}>✎</button>
                <select value={a.kind} onChange={(e) => onKind(a.id, e.target.value)} className="rounded bg-white/20 text-[8px]">
                  {kinds.map((k) => <option key={k.k} value={k.k} className="text-black">{k.ko}</option>)}
                </select>
                {onPrimary && !a.is_primary && <button onClick={() => onPrimary(a.id)}>대표</button>}
                <button onClick={() => onDelete(a.id)} className="text-rose-300">삭제</button>
              </div>
            </div>
          </div>
        ))}
        {!assets.length && <p className="col-span-3 text-[11px] text-[var(--muted,#64748b)] sm:col-span-4">등록된 자산이 없습니다.</p>}
      </div>
    </div>
  );
}

export default function RemakeStudio2() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [u, setU] = useState(""); const [pw, setPw] = useState(""); const [loginErr, setLoginErr] = useState<string | null>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selBrand, setSelBrand] = useState<string | null>(null);
  const [brandAssets, setBrandAssets] = useState<Asset[]>([]);
  const [brandForm, setBrandForm] = useState({ id: "", name: "", notes: "" });

  const [products, setProducts] = useState<Product[]>([]);
  const [sel, setSel] = useState<Product | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState({ id: "", name: "", category: "", concept: "", usp: "" });

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

  const loadBrands = useCallback(() => { fetch("/api/remake2/brands").then((r) => r.json()).then((j) => setBrands(j.rows || [])).catch(() => {}); }, []);
  useEffect(() => { if (authed) loadBrands(); }, [authed, loadBrands]);

  const loadProducts = useCallback((brandId: string) => { fetch(`/api/remake2/products?brandId=${brandId}`).then((r) => r.json()).then((j) => setProducts(j.rows || [])).catch(() => {}); }, []);
  async function selectBrand(id: string) {
    const r = await fetch(`/api/remake2/brands?id=${id}`); const j = await r.json();
    if (r.ok) { setSelBrand(id); setBrandAssets(j.assets || []); setBrandForm({ id, name: j.brand.name, notes: j.brand.notes || "" }); loadProducts(id); setSel(null); setAssets([]); setForm({ id: "", name: "", category: "", concept: "", usp: "" }); }
  }
  async function selectProduct(id: string) {
    const r = await fetch(`/api/remake2/products?id=${id}`); const j = await r.json();
    if (r.ok) { setSel(j.product); setAssets(j.assets || []); setForm({ id, name: j.product.name, category: j.product.category || "", concept: j.product.concept || "", usp: j.product.usp || "" }); }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoginErr(null);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: pw }) });
    const d = await r.json().catch(() => ({})); if (r.ok && d.ok) setAuthed(true); else setLoginErr(d.error || "로그인 실패");
  }

  // 브랜드 CRUD
  async function saveBrand() {
    if (!brandForm.name.trim()) { alert("브랜드명을 입력하세요"); return; }
    const r = await fetch("/api/remake2/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(brandForm) });
    const j = await r.json(); if (!r.ok) { alert(j.error || "저장 실패"); return; }
    loadBrands(); selectBrand(j.id);
  }
  function newBrand() { setSelBrand(null); setBrandAssets([]); setBrandForm({ id: "", name: "", notes: "" }); setProducts([]); setSel(null); }
  async function delBrand(id: string) { if (!confirm("브랜드 삭제?")) return; const r = await fetch(`/api/remake2/brands?id=${id}`, { method: "DELETE" }); const j = await r.json(); if (!r.ok) { alert(j.error); return; } newBrand(); loadBrands(); }
  async function uploadBrandAsset(kind: string, file: File) {
    if (!selBrand) return; const image = await downscale(file);
    const r = await fetch("/api/remake2/brand-assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandId: selBrand, kind, image }) });
    if (!r.ok) { alert((await r.json()).error || "업로드 실패"); return; } selectBrand(selBrand); loadBrands();
  }
  async function brandAssetPatch(id: number, body: object) { await fetch("/api/remake2/brand-assets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }); if (selBrand) selectBrand(selBrand); }
  async function delBrandAsset(id: number) { await fetch(`/api/remake2/brand-assets?id=${id}`, { method: "DELETE" }); if (selBrand) selectBrand(selBrand); }

  // 제품 CRUD
  async function saveProduct() {
    if (!selBrand) { alert("브랜드를 먼저 선택하세요"); return; }
    if (!form.name.trim()) { alert("제품명을 입력하세요"); return; }
    const brandName = brands.find((b) => b.id === selBrand)?.name || "";
    const r = await fetch("/api/remake2/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, brandId: selBrand, brand: brandName }) });
    const j = await r.json(); if (!r.ok) { alert(j.error || "저장 실패"); return; }
    loadProducts(selBrand); selectProduct(j.id);
  }
  function newProduct() { setSel(null); setAssets([]); setForm({ id: "", name: "", category: "", concept: "", usp: "" }); }
  async function delProduct(id: string) { if (!confirm("제품 삭제?")) return; await fetch(`/api/remake2/products?id=${id}`, { method: "DELETE" }); newProduct(); if (selBrand) loadProducts(selBrand); }
  async function uploadProdAsset(kind: string, file: File) {
    if (!sel) return; const image = await downscale(file);
    const r = await fetch("/api/remake2/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: sel.id, kind, image }) });
    if (!r.ok) { alert((await r.json()).error || "업로드 실패"); return; } selectProduct(sel.id); if (selBrand) loadProducts(selBrand);
  }
  async function prodAssetPatch(id: number, body: object) { await fetch("/api/remake2/assets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) }); if (sel) selectProduct(sel.id); }
  async function delProdAsset(id: number) { await fetch(`/api/remake2/assets?id=${id}`, { method: "DELETE" }); if (sel) selectProduct(sel.id); }

  const primaryAsset = () => assets.find((a) => a.is_primary) || assets[0] || null;

  async function generate() {
    if (!sel) { setErr("제품을 선택하세요"); return; }
    const pa = primaryAsset();
    if (!pa) { setErr("제품 자산(패키지/제형 등)을 1개 이상 등록하세요"); return; }
    setErr(null); setInfo(null); setBusy(true); setKeyframes([]); setClips({}); setFinalVideo(null);
    try {
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
      const img = await assetToDataUrl(pa.asset_id);
      const kf = await postRaw<{ keyframes?: KF[]; error?: string }>("/api/remake/keyframes", { spec: sp, image: img, stage: 2, preset });
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
      const d = await postRaw<{ jobs?: { id: string; shot_no: number; failed?: boolean; error?: string }[]; mode?: string; error?: string }>("/api/remake/animate", { spec, keyframes: chosen });
      if (!d.ok) throw new Error(d.data.error || "생성 실패");
      const jobs = d.data.jobs || [];
      setClips(Object.fromEntries(jobs.map((j) => [j.shot_no, { shot_no: j.shot_no, status: j.failed ? "failed" : "in_progress", error: j.failed ? (j.error || "제출 실패") : null }])));
      if (d.data.mode === "mock") setInfo("영상 제공자 미설정 → mock 시뮬레이션(실제 영상 없음).");
      const live = jobs.filter((j) => !j.failed);
      if (!live.length) { setErr("영상 제출 실패: " + (jobs.find((j) => j.error)?.error || "제공자/키프레임 확인")); setBusy(false); return; }
      const byId = new Map(live.map((j) => [j.id, j.shot_no])); const ids = live.map((j) => j.id); const started = Date.now();
      const poll = async () => {
        try {
          const r = await fetch(`/api/remake/status?ids=${ids.join(",")}`); const s = await r.json();
          const rows: { id: string; status: string; videoUrl?: string | null; error?: string | null }[] = s.jobs || [];
          setClips((prev) => { const next = { ...prev }; for (const row of rows) { const sn = byId.get(row.id); if (sn != null) next[sn] = { shot_no: sn, status: row.status, videoUrl: row.videoUrl, error: row.error }; } return next; });
          const done = rows.length && rows.every((j) => ["completed", "failed", "nsfw"].includes(j.status));
          if (!done && Date.now() - started < 300000) pollRef.current = setTimeout(poll, 2500);
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
      if (d.data.videoUrl) setFinalVideo(d.data.videoUrl); else setInfo("합본 워커 미배포 — 개별 클립을 사용하세요.");
    } catch (e) { setErr(String(e instanceof Error ? e.message : e)); }
    setBusy(false);
  }

  if (authed === null) return <div className="grid min-h-screen place-items-center text-slate-400">불러오는 중…</div>;
  if (!authed) return (
    <div className="grid min-h-screen place-items-center bg-slate-950 p-6">
      <form onSubmit={login} className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 text-white">
        <h1 className="text-[18px] font-black">Remake Studio v2 · 관리자</h1>
        <input value={u} onChange={(e) => setU(e.target.value)} placeholder="아이디" className="mt-4 w-full rounded-md bg-slate-800 px-3 py-2 text-[13px] outline-none" />
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="비밀번호" className="mt-2 w-full rounded-md bg-slate-800 px-3 py-2 text-[13px] outline-none" />
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
            <h1 className="mt-1 text-[24px] font-black tracking-tight sm:text-[30px]">브랜드·제품 자산 → 트렌드 포맷 영상화</h1>
          </div>
          <a href="/remake/studio" className="rounded-md border border-[var(--border,#e2e8f0)] px-3 py-1.5 text-[11px] text-[var(--muted,#64748b)]">v1 →</a>
        </div>

        {/* 브랜드 선택 바 */}
        <div className="mt-5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-[var(--muted,#64748b)]">브랜드</span>
          {brands.map((b) => (
            <button key={b.id} onClick={() => selectBrand(b.id)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] ${selBrand === b.id ? "border-[var(--accent,#ec4899)] bg-[var(--accent,#ec4899)] text-white" : "border-[var(--border,#e2e8f0)] text-[var(--fg,#2d3748)]"}`}>
              {b.logo_asset &&
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/remake/asset/${b.logo_asset}`} alt="" className="h-4 w-4 rounded-full object-cover" />}
              {b.name} <span className="opacity-60">{b.product_count || 0}</span>
            </button>
          ))}
          <button onClick={newBrand} className="rounded-full border border-dashed border-[var(--border,#e2e8f0)] px-3 py-1 text-[12px] text-[var(--muted,#64748b)]">+ 새 브랜드</button>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-[440px_1fr]">
          {/* 좌: 브랜드 자산 + 제품 자산 */}
          <div className="space-y-4">
            {/* 브랜드 자산 */}
            <div className={card}>
              <h2 className="text-[14px] font-black">브랜드 {selBrand ? "정보·자산" : "등록"}</h2>
              <div className="mt-2 space-y-2">
                <input className={inp} placeholder="브랜드명 *" value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} />
                <input className={inp} placeholder="메모(브랜드 톤·주의사항 등)" value={brandForm.notes} onChange={(e) => setBrandForm({ ...brandForm, notes: e.target.value })} />
                <div className="flex gap-2">
                  <button onClick={saveBrand} className="flex-1 rounded-md bg-[var(--accent,#ec4899)] py-2 text-[12px] font-bold text-white">{selBrand ? "수정 저장" : "브랜드 등록"}</button>
                  {selBrand && <button onClick={() => delBrand(selBrand)} className="rounded-md border border-[var(--border,#e2e8f0)] px-3 text-[11px] text-rose-500">삭제</button>}
                </div>
              </div>
              {selBrand && (
                <div className="mt-3 border-t border-[var(--border,#e2e8f0)] pt-3">
                  <div className="mb-2 text-[12px] font-bold">브랜드 자산 <span className="font-normal text-[var(--muted,#64748b)]">(로고·가이드·공통 — 여러 장 가능)</span></div>
                  <AssetGrid assets={brandAssets} kinds={BRAND_KINDS}
                    onUpload={uploadBrandAsset}
                    onRelabel={(id, label) => brandAssetPatch(id, { label })}
                    onKind={(id, kind) => brandAssetPatch(id, { kind })}
                    onDelete={delBrandAsset} />
                </div>
              )}
            </div>

            {/* 제품 자산 */}
            {selBrand && (
              <div className={card}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-black">제품 {sel ? "정보·자산" : "등록"}</h2>
                  {sel && <button onClick={newProduct} className="text-[11px] text-[var(--muted,#64748b)] underline">새 제품</button>}
                </div>
                {/* 제품 목록 */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {products.map((pr) => (
                    <button key={pr.id} onClick={() => selectProduct(pr.id)} className={`rounded-md border px-2 py-1 text-[11px] ${sel?.id === pr.id ? "border-[var(--accent,#ec4899)] text-[var(--accent,#ec4899)]" : "border-[var(--border,#e2e8f0)] text-[var(--muted,#64748b)]"}`}>{pr.name} <span className="opacity-60">{pr.asset_count || 0}</span></button>
                  ))}
                  {!products.length && <span className="text-[11px] text-[var(--muted,#64748b)]">제품 없음</span>}
                </div>
                <div className="mt-3 space-y-2">
                  <input className={inp} placeholder="제품명 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inp} placeholder="카테고리" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                    <input className={inp} placeholder="컨셉" value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} />
                  </div>
                  <input className={inp} placeholder="USP" value={form.usp} onChange={(e) => setForm({ ...form, usp: e.target.value })} />
                  <div className="flex gap-2">
                    <button onClick={saveProduct} className="flex-1 rounded-md bg-[var(--accent,#ec4899)] py-2 text-[12px] font-bold text-white">{sel ? "수정 저장" : "제품 등록"}</button>
                    {sel && <button onClick={() => delProduct(sel.id)} className="rounded-md border border-[var(--border,#e2e8f0)] px-3 text-[11px] text-rose-500">삭제</button>}
                  </div>
                </div>
                {sel && (
                  <div className="mt-3 border-t border-[var(--border,#e2e8f0)] pt-3">
                    <div className="mb-2 text-[12px] font-bold">제품 자산 <span className="font-normal text-[var(--muted,#64748b)]">(대표 이미지가 영상 제품으로 사용)</span></div>
                    <AssetGrid assets={assets} kinds={PROD_KINDS}
                      onUpload={uploadProdAsset}
                      onRelabel={(id, label) => prodAssetPatch(id, { label })}
                      onKind={(id, kind) => prodAssetPatch(id, { kind })}
                      onDelete={delProdAsset}
                      onPrimary={(id) => prodAssetPatch(id, { primary: true })} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 우: 영상화 */}
          <div className="space-y-4">
            {!sel ? (
              <div className={`${card} text-[13px] text-[var(--muted,#64748b)]`}>브랜드 → 제품을 선택하고 자산을 등록하면 영상화를 시작할 수 있습니다.</div>
            ) : (
              <div className={card}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-black">영상화 <span className="text-[12px] font-normal text-[var(--muted,#64748b)]">· {sel.name}</span></h2>
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
                        <div className="text-[10px] text-[var(--muted,#64748b)]">{t.categoryKo} · {t.hookType} · ▶{t.perf.views}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <input className={`${inp} mt-3`} placeholder="틱톡 레퍼런스 URL" value={refUrl} onChange={(e) => setRefUrl(e.target.value)} />
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-[var(--muted,#64748b)]">스타일</span>
                  <select className="rounded-md border border-[var(--border,#e2e8f0)] px-2 py-1 text-[11px]" value={preset} onChange={(e) => setPreset(e.target.value)}>
                    {STYLE_PRESET_LIST.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <button onClick={generate} disabled={busy} className="ml-auto rounded-md bg-[var(--accent,#ec4899)] px-4 py-2 text-[12px] font-bold text-white disabled:opacity-50">{busy ? "생성 중…" : "① 키프레임 생성"}</button>
                </div>
                {err && <p className="mt-2 text-[12px] font-semibold text-rose-600">{err}</p>}
                {info && <p className="mt-2 text-[12px] text-amber-600">{info}</p>}
              </div>
            )}

            {keyframes.length > 0 && (
              <div className={card}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-black">② 키프레임 확인·승인</h2>
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
                        컷{k.shot_no}·{k.sales_beat}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(clips).length > 0 && (
              <div className={card}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-black">④ 클립</h2>
                  <button onClick={assemble} disabled={busy} className="rounded-md border border-[var(--border,#e2e8f0)] px-3 py-1.5 text-[11px] font-bold">⑤ 합본</button>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {Object.values(clips).sort((a, b) => a.shot_no - b.shot_no).map((c) => (
                    <div key={c.shot_no} className="rounded-lg border border-[var(--border,#e2e8f0)] p-1.5">
                      {c.status === "completed" && c.videoUrl
                        ? <video src={c.videoUrl} controls className="aspect-[9/16] w-full rounded bg-black object-cover" />
                        : <div className="grid aspect-[9/16] w-full place-items-center rounded bg-slate-100 p-1 text-center text-[10px] text-slate-500">{c.status === "failed" ? (c.error || "실패") : "생성 중…"}</div>}
                      <div className="mt-1 text-[10px] text-[var(--muted,#64748b)]">컷{c.shot_no}·{c.status}</div>
                    </div>
                  ))}
                </div>
                {finalVideo && <video src={finalVideo} controls className="mt-4 aspect-[9/16] w-full max-w-[280px] rounded bg-black" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

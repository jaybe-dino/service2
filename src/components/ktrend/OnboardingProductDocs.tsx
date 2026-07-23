"use client";

// 결제(입점)한 사용자의 '제품별 추가 서류/정보' 관리 — 마이페이지에서 입력·수정.
// 기본(제품명·카테고리·가격·인증서)은 유지, 추가로 라벨/실물 사진(최소 2장)·라벨 필수표시 확인.
import { useState } from "react";
import { Package, Plus, Trash2, Upload, Loader2, Check, FileText, ImageIcon, X } from "lucide-react";

interface OnbFile { id: string; filename: string }
interface LabelChecks { productName?: boolean; netQuantity?: boolean; directions?: boolean; ingredients?: boolean; contact?: boolean }
export interface ProductDoc {
  nameKo?: string; nameEn?: string; cat?: string; price?: string;
  cert?: OnbFile | null;
  photos?: OnbFile[];
  label?: LabelChecks;
  contactTypes?: string[];
  realPhoto?: boolean;
}

const LABEL_FIELDS: { key: keyof LabelChecks; en: string; ko: string }[] = [
  { key: "productName", en: "Product Name", ko: "제품명" },
  { key: "netQuantity", en: "Net Quantity", ko: "내용량" },
  { key: "directions", en: "Directions for Use", ko: "사용방법" },
  { key: "ingredients", en: "Full Ingredient List", ko: "전성분" },
  { key: "contact", en: "Contact Information", ko: "연락처 정보" },
];
const CONTACT_TYPES: { key: string; label: string }[] = [
  { key: "address", label: "주소 (Address)" },
  { key: "phone", label: "전화번호 (Phone)" },
  { key: "website", label: "웹사이트 (Website)" },
];

const emptyProduct = (): ProductDoc => ({ nameKo: "", nameEn: "", cat: "", price: "", cert: null, photos: [], label: {}, contactTypes: [], realPhoto: false });

export default function OnboardingProductDocs({ initial, onSaved }: { initial: ProductDoc[]; onSaved?: () => void }) {
  const [products, setProducts] = useState<ProductDoc[]>(initial.length ? initial.map((p) => ({ ...emptyProduct(), ...p, label: { ...p.label }, photos: p.photos ?? [], contactTypes: p.contactTypes ?? [] })) : [emptyProduct()]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  const update = (i: number, patch: Partial<ProductDoc>) => setProducts((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const addProduct = () => setProducts((ps) => [...ps, emptyProduct()]);
  const removeProduct = (i: number) => setProducts((ps) => ps.filter((_, j) => j !== i));

  async function upload(file: File, kind: "product_cert" | "product_photo", productIndex: number): Promise<OnbFile | null> {
    const fd = new FormData();
    fd.append("file", file); fd.append("kind", kind); fd.append("productIndex", String(productIndex));
    const r = await fetch("/api/onboarding/upload", { method: "POST", body: fd });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) { setErr(d?.error ?? "업로드 실패"); return null; }
    return { id: d.id, filename: d.filename };
  }

  const onCert = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setErr(null); setUploading(`cert-${i}`);
    const f = await upload(file, "product_cert", i);
    if (f) update(i, { cert: f });
    setUploading(null); e.target.value = "";
  };
  const onPhotos = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []); if (!files.length) return;
    setErr(null); setUploading(`photo-${i}`);
    const uploaded: OnbFile[] = [];
    for (const file of files.slice(0, 8)) { const f = await upload(file, "product_photo", i); if (f) uploaded.push(f); }
    if (uploaded.length) update(i, { photos: [...(products[i].photos ?? []), ...uploaded].slice(0, 8) });
    setUploading(null); e.target.value = "";
  };
  const removePhoto = (i: number, id: string) => update(i, { photos: (products[i].photos ?? []).filter((p) => p.id !== id) });
  const toggleLabel = (i: number, key: keyof LabelChecks) => update(i, { label: { ...products[i].label, [key]: !products[i].label?.[key] } });
  const toggleContact = (i: number, key: string) => {
    const cur = products[i].contactTypes ?? [];
    update(i, { contactTypes: cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key] });
  };

  const save = async () => {
    setSaving(true); setErr(null); setSaved(false);
    try {
      const r = await fetch("/api/onboarding/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) { setErr(d?.error ?? "저장 실패"); setSaving(false); return; }
      setSaved(true); onSaved?.();
      setTimeout(() => setSaved(false), 2500);
    } catch { setErr("저장 중 오류가 발생했습니다."); }
    setSaving(false);
  };

  return (
    <div className="mt-4 kt-card p-5">
      <h2 className="mb-1 flex items-center gap-1.5 text-[13px] font-bold"><Package size={14} className="text-[var(--accent)]" /> 제품별 서류·정보 관리</h2>
      <p className="mb-3 text-[11px] text-[var(--muted)]">입점 심사에 필요한 제품별 인증서류와 라벨/실물 사진을 등록·수정합니다. (직접 저장 시 즉시 반영)</p>

      {/* 안내 */}
      <div className="mb-3 rounded-lg bg-slate-50 p-3 text-[11px] text-[var(--muted)]">
        <div className="font-bold text-[var(--fg)]">제품별 필요 자료</div>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li><b>제품 인증 서류</b> (인증서) — PDF·JPG·PNG</li>
          <li><b>제품 라벨 및 실물 사진</b> (영문 라벨 기준) — <b>최소 2장</b>, 고해상도. 아래 필수 표시사항이 모두 보여야 하며 <b>실물 촬영 사진 1장 이상</b> 포함(렌더/CG 불가)</li>
        </ol>
      </div>

      <div className="space-y-3">
        {products.map((p, i) => {
          const photos = p.photos ?? [];
          return (
            <div key={i} className="rounded-xl border border-[var(--border)] p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent-light)] text-[11px] font-black text-[var(--accent)]">{i + 1}</span>
                <span className="text-[12px] font-bold">제품 {i + 1}</span>
                {products.length > 1 && <button onClick={() => removeProduct(i)} className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-500 hover:underline"><Trash2 size={12} /> 삭제</button>}
              </div>

              {/* 기본 정보 */}
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={p.nameKo ?? ""} onChange={(e) => update(i, { nameKo: e.target.value })} className="di" placeholder="제품명(국문)" />
                <input value={p.nameEn ?? ""} onChange={(e) => update(i, { nameEn: e.target.value })} className="di" placeholder="Product Name (영문)" />
                <input value={p.cat ?? ""} onChange={(e) => update(i, { cat: e.target.value })} className="di" placeholder="카테고리 (예: 스킨케어)" />
                <input value={p.price ?? ""} onChange={(e) => update(i, { price: e.target.value })} className="di" placeholder="소비자가(원)" inputMode="numeric" />
              </div>

              {/* 1. 인증 서류 */}
              <div className="mt-2.5">
                <div className="mb-1 flex items-center gap-1 text-[11px] font-bold"><FileText size={12} className="text-[var(--accent)]" /> 제품 인증 서류 (인증서)</div>
                {p.cert ? (
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]">
                    <a href={`/api/onboarding/file/${p.cert.id}`} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">{p.cert.filename} ↓</a>
                    <button onClick={() => update(i, { cert: null })} className="ml-auto text-slate-400 hover:text-rose-500"><X size={13} /></button>
                  </div>
                ) : (
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                    {uploading === `cert-${i}` ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} 인증서 업로드
                    <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => onCert(i, e)} />
                  </label>
                )}
              </div>

              {/* 2. 라벨/실물 사진 */}
              <div className="mt-2.5">
                <div className="mb-1 flex items-center gap-1 text-[11px] font-bold"><ImageIcon size={12} className="text-[var(--accent)]" /> 라벨/실물 사진 <span className="font-normal text-[var(--muted)]">(최소 2장)</span></div>
                {photos.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {photos.map((ph) => (
                      <span key={ph.id} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[10px]">
                        <a href={`/api/onboarding/file/${ph.id}`} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">{ph.filename}</a>
                        <button onClick={() => removePhoto(i, ph.id)} className="text-slate-400 hover:text-rose-500"><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
                  {uploading === `photo-${i}` ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} 사진 추가 (여러 장 가능)
                  <input type="file" accept="image/jpeg,image/png" multiple className="hidden" onChange={(e) => onPhotos(i, e)} />
                </label>
                <span className={`ml-2 text-[10px] font-semibold ${photos.length >= 2 ? "text-emerald-600" : "text-amber-600"}`}>{photos.length}/2장</span>

                {/* 라벨 필수 표시 확인 */}
                <div className="mt-2 rounded-lg bg-slate-50 p-2.5">
                  <div className="text-[10px] font-bold text-[var(--fg)]">라벨 필수 표시 사항 (사진에서 확인 가능해야 함)</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {LABEL_FIELDS.map((lf) => (
                      <button key={lf.key} type="button" onClick={() => toggleLabel(i, lf.key)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${p.label?.[lf.key] ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-[var(--border)] text-[var(--muted)]"}`}>
                        {p.label?.[lf.key] && <Check size={10} />} {lf.en} <span className="opacity-60">{lf.ko}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-[10px] font-bold text-[var(--fg)]">연락처 정보 유형 (1개 이상 포함)</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {CONTACT_TYPES.map((ct) => (
                      <button key={ct.key} type="button" onClick={() => toggleContact(i, ct.key)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${(p.contactTypes ?? []).includes(ct.key) ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-[var(--border)] text-[var(--muted)]"}`}>
                        {(p.contactTypes ?? []).includes(ct.key) && <Check size={10} />} {ct.label}
                      </button>
                    ))}
                  </div>
                  <label className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-[var(--fg)]">
                    <input type="checkbox" checked={!!p.realPhoto} onChange={() => update(i, { realPhoto: !p.realPhoto })} />
                    실물 촬영 사진(Real-world Photo)을 1장 이상 포함했습니다. (렌더/CG 아님)
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={addProduct} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-[12px] font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"><Plus size={14} /> 제품 추가</button>

      {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600">{err}</p>}

      <div className="mt-3 flex items-center gap-2">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-bold text-white hover:opacity-95 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 제품 정보 저장
        </button>
        {saved && <span className="text-[11px] font-semibold text-emerald-600">저장되었습니다 ✓</span>}
      </div>

      <style>{`.di{width:100%;border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-size:12px;background:#fff}.di:focus{outline:2px solid color-mix(in srgb,var(--accent) 20%,transparent);border-color:var(--accent)}`}</style>
    </div>
  );
}

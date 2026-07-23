"use client";

// 입점 기본정보 입력·수정 — 마이페이지 '입점 기본정보' 영역. 제품 정보는 별도(제품 서류·정보 관리).
// 저장: /api/onboarding/apply (stage="basic") → payload.details 병합(제품 배열 보존).
import { useState } from "react";
import { Building2, Upload, Loader2, Check, FileText, X } from "lucide-react";

interface OnbFile { id: string; filename: string }
export interface BasicInfo {
  brandKo?: string; brandEn?: string; bizNo?: string; repName?: string; managerName?: string;
  contact?: string; email?: string; note?: string;
  settlement?: { bank?: string; acct?: string; holder?: string };
  bizRegFile?: OnbFile | null;
}
const BANKS = ["국민", "신한", "우리", "하나", "농협", "기업", "카카오뱅크", "토스뱅크", "SC제일", "씨티", "기타"];

export default function OnboardingBasicInfo({ initial, defaultEmail, onSaved }: { initial: BasicInfo; defaultEmail?: string; onSaved?: () => void }) {
  const [f, setF] = useState<BasicInfo>({
    brandKo: initial.brandKo ?? "", brandEn: initial.brandEn ?? "", bizNo: initial.bizNo ?? "",
    repName: initial.repName ?? "", managerName: initial.managerName ?? "",
    contact: initial.contact ?? "", email: initial.email ?? defaultEmail ?? "", note: initial.note ?? "",
    settlement: { bank: initial.settlement?.bank ?? BANKS[0], acct: initial.settlement?.acct ?? "", holder: initial.settlement?.holder ?? "" },
    bizRegFile: initial.bizRegFile ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = (k: keyof BasicInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const setSet = (k: "bank" | "acct" | "holder") => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, settlement: { ...p.settlement, [k]: e.target.value } }));

  const onBizReg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setErr(null); setUploading(true);
    const fd = new FormData(); fd.append("file", file); fd.append("kind", "biz_reg");
    const r = await fetch("/api/onboarding/upload", { method: "POST", body: fd });
    const d = await r.json().catch(() => ({}));
    setUploading(false); e.target.value = "";
    if (!r.ok || !d.ok) { setErr(d?.error ?? "업로드 실패"); return; }
    setF((p) => ({ ...p, bizRegFile: { id: d.id, filename: d.filename } }));
  };

  const save = async () => {
    if (!f.brandKo?.trim() || !f.contact?.trim()) { setErr("브랜드명과 연락처는 필수입니다."); return; }
    setSaving(true); setErr(null); setSaved(false);
    try {
      const r = await fetch("/api/onboarding/apply", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "basic", brand: f.brandKo, brandEn: f.brandEn, bizNo: f.bizNo,
          repName: f.repName, managerName: f.managerName, contact: f.contact, email: f.email,
          settlement: f.settlement, bizRegFile: f.bizRegFile, note: f.note }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) { setErr(d?.error ?? "저장 실패"); setSaving(false); return; }
      setSaved(true); onSaved?.(); setTimeout(() => setSaved(false), 2500);
    } catch { setErr("저장 중 오류가 발생했습니다."); }
    setSaving(false);
  };

  return (
    <div className="kt-card p-5">
      <h2 className="mb-1 flex items-center gap-1.5 text-[14px] font-bold"><Building2 size={15} className="text-[var(--accent)]" /> 입점 기본정보</h2>
      <p className="mb-3 text-[11px] text-[var(--muted)]">브랜드·사업자·정산 정보를 입력·수정합니다. <span className="text-rose-500">*</span> 필수</p>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <L label="브랜드명(국문)" req><input value={f.brandKo} onChange={set("brandKo")} className="bi" placeholder="글로우랩" /></L>
        <L label="브랜드명(영문)"><input value={f.brandEn} onChange={set("brandEn")} className="bi" placeholder="Glowlab" /></L>
        <L label="사업자등록번호"><input value={f.bizNo} onChange={set("bizNo")} className="bi" placeholder="000-00-00000" /></L>
        <L label="대표자명"><input value={f.repName} onChange={set("repName")} className="bi" placeholder="홍길동" /></L>
        <L label="담당자명"><input value={f.managerName} onChange={set("managerName")} className="bi" placeholder="담당자" /></L>
        <L label="연락처" req><input value={f.contact} onChange={set("contact")} className="bi" placeholder="010-0000-0000" /></L>
        <L label="이메일"><input value={f.email} onChange={set("email")} className="bi" placeholder="name@brand.com" /></L>
      </div>

      {/* 정산 계좌 */}
      <div className="mt-3">
        <div className="mb-1 text-[11px] font-bold">정산 계좌</div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <select value={f.settlement?.bank} onChange={setSet("bank")} className="bi">{BANKS.map((b) => <option key={b} value={b}>{b}</option>)}</select>
          <input value={f.settlement?.acct} onChange={setSet("acct")} className="bi" placeholder="계좌번호" inputMode="numeric" />
          <input value={f.settlement?.holder} onChange={setSet("holder")} className="bi" placeholder="예금주" />
        </div>
      </div>

      {/* 사업자등록증 */}
      <div className="mt-3">
        <div className="mb-1 flex items-center gap-1 text-[11px] font-bold"><FileText size={12} className="text-[var(--accent)]" /> 사업자등록증</div>
        {f.bizRegFile ? (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]">
            <a href={`/api/onboarding/file/${f.bizRegFile.id}`} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">{f.bizRegFile.filename} ↓</a>
            <button onClick={() => setF((p) => ({ ...p, bizRegFile: null }))} className="ml-auto text-slate-400 hover:text-rose-500"><X size={13} /></button>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} 사업자등록증 업로드
            <input type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={onBizReg} />
          </label>
        )}
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[11px] font-bold">요청사항(선택)</div>
        <textarea value={f.note} onChange={set("note")} rows={2} className="bi w-full resize-none" placeholder="담당자에게 전달할 내용" />
      </div>

      {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600">{err}</p>}
      <div className="mt-3 flex items-center gap-2">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-bold text-white hover:opacity-95 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 기본정보 저장
        </button>
        {saved && <span className="text-[11px] font-semibold text-emerald-600">저장되었습니다 ✓</span>}
      </div>

      <style>{`.bi{width:100%;border:1px solid var(--border);border-radius:8px;padding:8px 10px;font-size:12px;background:#fff}.bi:focus{outline:2px solid color-mix(in srgb,var(--accent) 20%,transparent);border-color:var(--accent)}`}</style>
    </div>
  );
}

function L({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">{label}{req && <span className="text-rose-500"> *</span>}</span>
      {children}
    </label>
  );
}

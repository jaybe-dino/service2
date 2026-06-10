"use client";

import { useState } from "react";
import { X, Send, Check } from "lucide-react";
import { usePlan } from "./PlanContext";
import { apiInquiry } from "@/lib/client-api";

export type InquiryKind = "marketing" | "tiktokshop" | "proposal" | "sales";

const TITLES: Record<InquiryKind, string> = {
  marketing: "마케팅 1:1 문의",
  tiktokshop: "틱톡샵 온보딩 문의",
  proposal: "인플루언서 제안 보내기",
  sales: "도입 문의",
};

export default function InquiryModal({
  kind,
  context,
  onClose,
}: {
  kind: InquiryKind;
  context?: string; // 예: 제안 대상 핸들
  onClose: () => void;
}) {
  const { user, serverMode } = usePlan();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    company: user?.brand ?? "",
    message: "",
    budget: "",
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!form.email.trim() || !form.message.trim()) { setErr("이메일과 내용을 입력하세요."); return; }
    setBusy(true);
    if (serverMode) {
      const { ok } = await apiInquiry({ kind, context, ...form });
      setBusy(false);
      if (!ok) { setErr("전송 실패. 잠시 후 다시 시도하세요."); return; }
    } else {
      // 데모 모드: 서버 미연결 — 접수만 시뮬레이션
      await new Promise((r) => setTimeout(r, 400));
      setBusy(false);
    }
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 text-[var(--fg)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold">{TITLES[kind]}</h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)]"><X size={18} /></button>
        </div>

        {done ? (
          <div className="py-8 text-center">
            <Check className="mx-auto text-emerald-500" />
            <p className="mt-2 text-[13px] font-bold">접수되었습니다</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">관리자에 접수되었습니다. 확인 후 회신드립니다. (자동 이메일 발송 없음)</p>
            <button onClick={onClose} className="kt-btn kt-btn-primary mt-4 px-5 py-2 text-[12px]">닫기</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-2.5">
            {context && (
              <p className="rounded-md bg-[var(--accent-light)] px-3 py-2 text-[11px] font-semibold text-[var(--accent)]">대상: {context}</p>
            )}
            <Field label="이름" value={form.name} onChange={(v) => set("name", v)} />
            <Field label="이메일 *" type="email" value={form.email} onChange={(v) => set("email", v)} />
            <Field label="브랜드/회사" value={form.company} onChange={(v) => set("company", v)} />
            {kind === "proposal" && (
              <Field label="예산/단가 (선택)" value={form.budget} onChange={(v) => set("budget", v)} placeholder="예: $500 / 영상" />
            )}
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold">내용 *</span>
              <textarea
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                rows={4}
                placeholder={kind === "proposal" ? "협업 제안 내용을 적어주세요." : "문의 내용을 적어주세요."}
                className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]"
              />
            </label>
            {err && <p className="text-[11px] font-semibold text-rose-600">{err}</p>}
            <button disabled={busy} className="kt-btn kt-btn-primary w-full py-2.5 text-[12px] disabled:opacity-50">
              <Send size={14} /> 보내기
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]"
      />
    </label>
  );
}

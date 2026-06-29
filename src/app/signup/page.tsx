"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, UserPlus, ArrowRight } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { getStoredUtm } from "@/lib/utm";

export default function SignupPage() {
  const { user, signup } = usePlan();
  const [form, setForm] = useState({ name: "", email: "", password: "", brand: "", role: "", code: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // 추천인 코드 자동 채움 (?ref= 또는 온보딩에서 저장한 코드)
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    let stored = "";
    try { stored = localStorage.getItem("onb.ref") || ""; } catch {}
    const c = (ref || stored || "").toUpperCase();
    if (c) setForm((f) => (f.code ? f : { ...f, code: c }));
  }, []);

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await signup({ ...form, utm: getStoredUtm() });
    setBusy(false);
    if (res.ok) setDone(true);
    else setErr(res.error ?? "가입 실패");
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-[22px] font-black tracking-tight">회원가입</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            가입 후 Basic으로 시작하고, 언제든 Pro로 업그레이드할 수 있어요.
          </p>
        </div>

        {done || user ? (
          <div className="kt-card space-y-3 p-6 text-center">
            <Check className="mx-auto text-emerald-500" />
            <p className="text-[14px] font-bold">{user?.name ?? "가입"} 완료되었습니다</p>
            <p className="text-[12px] text-[var(--muted)]">Basic 플랜으로 시작합니다.</p>
            <div className="flex justify-center gap-2 pt-1">
              <Link href="/explorer" className="kt-btn kt-btn-primary px-5 py-2 text-[12px]">콘텐츠 레퍼런스 <ArrowRight size={14} /></Link>
              <Link href="/plans" className="kt-btn kt-btn-outline px-5 py-2 text-[12px]">Pro 보기</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submitSignup} className="kt-card space-y-3 p-5">
            <Field label="이름 *" value={form.name} onChange={(v) => set("name", v)} placeholder="홍길동" />
            <Field label="브랜드 이메일 * (회사 도메인)" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@yourbrand.com" />
            <Field label="비밀번호 *" type="password" value={form.password} onChange={(v) => set("password", v)} placeholder="********" />
            <Field label="담당 브랜드 *" value={form.brand} onChange={(v) => set("brand", v)} placeholder="예: Anua" />
            <Field label="직무" value={form.role} onChange={(v) => set("role", v)} placeholder="예: 글로벌 마케팅 매니저" />
            <Field label="추천인 코드 (선택)" value={form.code} onChange={(v) => set("code", v.toUpperCase())} placeholder="예: GLV-ABC123" />
            {err && <p className="text-[11px] font-semibold text-rose-600">{err}</p>}
            <p className="text-[10px] leading-relaxed text-[var(--muted)]">
              가입 시 <Link href="/terms" className="font-semibold text-[var(--accent)] hover:underline">이용약관</Link> 및{" "}
              <Link href="/privacy" className="font-semibold text-[var(--accent)] hover:underline">개인정보처리방침</Link>에 동의하는 것으로 간주됩니다.
            </p>
            <button disabled={busy} className="kt-btn kt-btn-primary w-full py-2.5 text-[12px] disabled:opacity-50">
              <UserPlus size={14} /> 가입하기
            </button>
            <p className="text-center text-[11px] text-[var(--muted)]">
              이미 계정이 있나요? <Link href="/login" className="font-semibold text-[var(--accent)]">로그인</Link>
            </p>
          </form>
        )}
      </div>
    </PageShell>
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, UserPlus, Mail, Gift, ArrowRight } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";

export default function SignupPage() {
  const { user, isPro, signup, invite, trialMsLeft } = usePlan();
  const [step, setStep] = useState<1 | 2>(user ? 2 : 1);

  const [form, setForm] = useState({ name: "", email: "", password: "", brand: "", role: "", code: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const [invites, setInvites] = useState(["", "", ""]);
  const [inviteMsg, setInviteMsg] = useState("");
  const [granted, setGranted] = useState(false);

  const myDomain = (user?.email ?? form.email).split("@")[1] ?? "회사 도메인";
  const trialDays = Math.ceil(trialMsLeft / 86_400_000);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const res = await signup(form);
    setBusy(false);
    if (res.ok) setStep(2);
    else setErr(res.error ?? "가입 실패");
  };

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteMsg("");
    setBusy(true);
    const res = await invite(invites);
    setBusy(false);
    if (res.error) { setInviteMsg(res.error); return; }
    if (res.granted) {
      setGranted(true);
      setInviteMsg("🎉 Pro 7일이 활성화되었습니다!");
    } else {
      const rej = res.domainRejected ? ` (브랜드 이메일 도메인 불일치 ${res.domainRejected}건 제외)` : "";
      setInviteMsg(`초대 ${res.invited}/${res.required}명 인정됨${rej}. ${res.required}명을 채우면 Pro 7일이 열립니다.`);
    }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-[22px] font-black tracking-tight">회원가입</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            브랜드 담당자 인증 후, 동료 3명을 초대하면 <b className="text-[var(--accent)]">Pro 7일</b>이 열립니다.
          </p>
        </div>

        {/* 진행 표시 */}
        <div className="mb-5 flex items-center justify-center gap-2 text-[11px] font-semibold">
          <span className={step === 1 ? "text-[var(--accent)]" : "text-[var(--muted)]"}>1. 가입</span>
          <span className="text-[var(--muted)]">→</span>
          <span className={step === 2 ? "text-[var(--accent)]" : "text-[var(--muted)]"}>2. 동료 초대 → Pro 7일</span>
        </div>

        {step === 1 ? (
          <form onSubmit={submitSignup} className="kt-card space-y-3 p-5">
            <Field label="이름 *" value={form.name} onChange={(v) => set("name", v)} placeholder="홍길동" />
            <Field label="브랜드 이메일 * (회사 도메인)" type="email" value={form.email} onChange={(v) => set("email", v)} placeholder="you@yourbrand.com" />
            <Field label="비밀번호 *" type="password" value={form.password} onChange={(v) => set("password", v)} placeholder="********" />
            <Field label="담당 브랜드 *" value={form.brand} onChange={(v) => set("brand", v)} placeholder="예: Anua" />
            <Field label="직무" value={form.role} onChange={(v) => set("role", v)} placeholder="예: 글로벌 마케팅 매니저" />
            <Field label="프로모션 코드 (선택 · 입력 시 3일 무료 Pro 체험)" value={form.code} onChange={(v) => set("code", v.toUpperCase())} placeholder="예: GLOVEK3" />
            {err && <p className="text-[11px] font-semibold text-rose-600">{err}</p>}
            <button disabled={busy} className="kt-btn kt-btn-primary w-full py-2.5 text-[12px] disabled:opacity-50">
              <UserPlus size={14} /> 가입하고 계속
            </button>
            <p className="text-center text-[11px] text-[var(--muted)]">
              이미 계정이 있나요? <Link href="/login" className="font-semibold text-[var(--accent)]">로그인</Link>
            </p>
          </form>
        ) : (
          <div className="kt-card space-y-4 p-5">
            <div className="flex items-center gap-2 rounded-md bg-[var(--accent-light)] px-3 py-2 text-[11px]">
              <Check size={14} className="text-[var(--accent)]" />
              <span><b>{user?.name}</b> · {user?.brand} 담당자로 가입됨</span>
            </div>

            {isPro ? (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-center">
                <Gift className="mx-auto text-emerald-600" />
                <p className="mt-2 text-[13px] font-bold text-emerald-700">Pro {trialDays > 0 ? `${trialDays}일` : ""} 활성화됨</p>
                <Link href="/explorer" className="kt-btn kt-btn-primary mt-3 px-5 py-2 text-[12px]">
                  콘텐츠 탐색 시작 <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <form onSubmit={submitInvite} className="space-y-2">
                <p className="text-[12px] font-semibold">동료 3명 초대 (같은 <b>@{myDomain}</b> 이메일)</p>
                {invites.map((v, i) => (
                  <div key={i} className="relative">
                    <Mail size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input
                      type="email"
                      value={v}
                      onChange={(e) => setInvites((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder={`colleague${i + 1}@${myDomain}`}
                      className="w-full rounded-md border border-[var(--border)] py-2 pl-7 pr-2 text-[12px] outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                ))}
                {inviteMsg && <p className={`text-[11px] font-semibold ${granted ? "text-emerald-600" : "text-amber-700"}`}>{inviteMsg}</p>}
                <button disabled={busy} className="kt-btn kt-btn-primary w-full py-2.5 text-[12px] disabled:opacity-50">
                  <Gift size={14} /> 초대 보내고 Pro 7일 받기
                </button>
                <Link href="/explorer" className="block text-center text-[11px] text-[var(--muted)] hover:text-[var(--accent)]">
                  나중에 하기 →
                </Link>
              </form>
            )}
          </div>
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

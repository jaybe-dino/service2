"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, Mail, Check } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setBusy(false);
    setDone(true);
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <h1 className="flex items-center gap-2 text-[22px] font-black tracking-tight">
          <KeyRound size={18} className="text-[var(--accent)]" /> 비밀번호 찾기
        </h1>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          가입하신 이메일을 입력하시면 비밀번호 재설정 안내를 도와드립니다.
        </p>

        {done ? (
          <div className="kt-card mt-5 p-6 text-center">
            <Check className="mx-auto text-emerald-500" />
            <p className="mt-2 text-[13px] font-bold">재설정 요청이 접수되었습니다</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
              입력하신 이메일이 가입되어 있다면, 관리자 확인 후 <b>{"chief@dinostudio.kr"}</b> 을 통해
              재설정 안내를 드립니다. 빠른 처리가 필요하시면 동일 주소로 문의해 주세요.
            </p>
            <Link href="/login" className="kt-btn kt-btn-primary mt-4 px-5 py-2 text-[12px]">로그인으로</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="kt-card mt-5 p-5">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold">가입 이메일</span>
              <div className="relative">
                <Mail size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourbrand.com"
                  className="w-full rounded-md border border-[var(--border)] py-2 pl-8 pr-2.5 text-[12px] outline-none focus:border-[var(--accent)]"
                />
              </div>
            </label>
            <button disabled={busy} className="kt-btn kt-btn-primary mt-4 w-full py-2.5 text-[12px] disabled:opacity-50">
              {busy ? "접수 중…" : "재설정 요청 보내기"}
            </button>
            <p className="mt-3 text-center text-[11px] text-[var(--muted)]">
              <Link href="/login" className="font-semibold text-[var(--accent)] hover:underline">로그인으로 돌아가기</Link>
            </p>
          </form>
        )}
      </div>
    </PageShell>
  );
}

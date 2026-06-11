"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LogIn } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";

export default function LoginPage() {
  const router = useRouter();
  const { user, plan, login, logout } = usePlan();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (await login(email, password)) {
      router.push("/explorer");
    } else {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-[22px] font-black tracking-tight">로그인</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">Glovek 계정으로 로그인하세요.</p>
        </div>

        {user && (
          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-light)] px-4 py-3 text-[12px]">
            <Check size={15} className="text-[var(--accent)]" />
            <span>
              현재 <b>{user.name}</b> ({user.company}) — <b>{plan.toUpperCase()}</b> 플랜으로 로그인됨
            </span>
            <button onClick={logout} className="kt-btn kt-btn-outline ml-auto px-3 py-1 text-[11px]">
              로그아웃
            </button>
          </div>
        )}

        <form onSubmit={submit} className="kt-card p-5">
          <label className="mb-2 block">
            <span className="mb-1 block text-[11px] font-semibold">이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="you@yourbrand.com"
              className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="••••••••"
              className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]"
            />
          </label>
          {error && <p className="mt-2 text-[11px] font-semibold text-rose-600">{error}</p>}
          <button type="submit" className="kt-btn kt-btn-primary mt-4 w-full py-2.5 text-[12px]">
            <LogIn size={14} /> 로그인
          </button>
          <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--muted)]">
            <Link href="/forgot" className="font-semibold text-[var(--accent)] hover:underline">비밀번호 찾기</Link>
            <span>계정이 없나요? <Link href="/signup" className="font-semibold text-[var(--accent)] hover:underline">회원가입</Link></span>
          </div>
        </form>
      </div>
    </PageShell>
  );
}

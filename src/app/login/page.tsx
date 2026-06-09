"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogIn, Sparkles, Zap } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { DEMO_ACCOUNTS } from "@/data/ktrend/accounts";
import { PLANS } from "@/data/ktrend/meta";

export default function LoginPage() {
  const router = useRouter();
  const { user, plan, login, loginAs, logout } = usePlan();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(email, password)) {
      router.push("/explorer");
    } else {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    }
  };

  const quick = (id: string) => {
    loginAs(id);
    router.push("/explorer");
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 text-center">
          <h1 className="text-[22px] font-black tracking-tight">테스트 계정 로그인</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            QA용 데모 계정입니다. 아래 버튼으로 바로 로그인하거나 직접 입력하세요.
          </p>
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

        <div className="grid gap-4 md:grid-cols-2">
          {/* 빠른 로그인 카드 */}
          {DEMO_ACCOUNTS.map((acc) => {
            const planInfo = PLANS.find((p) => p.id === acc.plan);
            const isEnt = acc.plan === "enterprise";
            return (
              <div
                key={acc.id}
                className={`kt-card flex flex-col p-5 ${isEnt ? "ring-1 ring-[var(--accent)]" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                    style={{ background: isEnt ? "#7C3AED" : "#64748b" }}
                  >
                    {isEnt ? <Zap size={16} /> : <Sparkles size={16} />}
                  </span>
                  <div>
                    <div className="text-[14px] font-bold">
                      {planInfo?.name} {isEnt && "(유료 전체 활성)"}
                    </div>
                    <div className="text-[10px] text-[var(--muted)]">{acc.company}</div>
                  </div>
                </div>

                <dl className="mt-4 space-y-1 rounded-md bg-slate-50 p-3 text-[11px]">
                  <div className="flex justify-between">
                    <dt className="text-[var(--muted)]">이메일</dt>
                    <dd className="font-mono font-semibold">{acc.email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--muted)]">비밀번호</dt>
                    <dd className="font-mono font-semibold">{acc.password}</dd>
                  </div>
                </dl>

                <ul className="mt-3 flex-1 space-y-1 text-[11px]">
                  {isEnt ? (
                    <>
                      <li className="flex gap-1.5"><Check size={13} className="mt-0.5 text-[var(--accent)]" /> 110개 브랜드 전체 + 신규 추가</li>
                      <li className="flex gap-1.5"><Check size={13} className="mt-0.5 text-[var(--accent)]" /> 추정 매출/ROAS 전체 해금</li>
                      <li className="flex gap-1.5"><Check size={13} className="mt-0.5 text-[var(--accent)]" /> 인플루언서 컨택 라인 해금</li>
                      <li className="flex gap-1.5"><Check size={13} className="mt-0.5 text-[var(--accent)]" /> PDF 리포트 다운로드</li>
                    </>
                  ) : (
                    <>
                      <li className="flex gap-1.5 text-[var(--muted)]">· 상위 브랜드만 노출</li>
                      <li className="flex gap-1.5 text-[var(--muted)]">· 수익화 지표 블러 처리</li>
                      <li className="flex gap-1.5 text-[var(--muted)]">· 컨택 라인 잠금</li>
                      <li className="flex gap-1.5 text-[var(--muted)]">· 신규 브랜드 추가 불가</li>
                    </>
                  )}
                </ul>

                <button
                  onClick={() => quick(acc.id)}
                  className={`kt-btn mt-4 w-full py-2.5 text-[12px] ${isEnt ? "kt-btn-primary" : "kt-btn-outline"}`}
                >
                  <LogIn size={14} /> {planInfo?.name} 계정으로 로그인
                </button>
              </div>
            );
          })}
        </div>

        {/* 직접 입력 폼 */}
        <form onSubmit={submit} className="kt-card mx-auto mt-6 max-w-md p-5">
          <h2 className="mb-3 text-[13px] font-bold">직접 입력</h2>
          <label className="mb-2 block">
            <span className="mb-1 block text-[11px] font-semibold">이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="pro@ktrend.demo"
              className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="ktrend2026"
              className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]"
            />
          </label>
          {error && <p className="mt-2 text-[11px] font-semibold text-rose-600">{error}</p>}
          <button type="submit" className="kt-btn kt-btn-primary mt-4 w-full py-2.5 text-[12px]">
            <LogIn size={14} /> 로그인
          </button>
        </form>
      </div>
    </PageShell>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Clock, ExternalLink, Loader2 } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { ONBOARDING } from "@/data/ktrend/meta";

function DoneInner() {
  const params = useSearchParams();
  const status = params.get("status") ?? "success";
  const ok = status === "success" || status === "pending";
  const [count, setCount] = useState(4);

  useEffect(() => {
    if (!ok) return;
    const t = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    const go = setTimeout(() => { window.location.href = ONBOARDING.applyUrl; }, 4000);
    return () => { clearInterval(t); clearTimeout(go); };
  }, [ok]);

  return (
    <div className="mx-auto max-w-md py-10 text-center">
      {status === "success" ? (
        <>
          <CheckCircle2 className="mx-auto text-emerald-500" size={44} />
          <h1 className="mt-3 text-[22px] font-black">온보딩 신청이 접수되었습니다</h1>
          <p className="mt-2 text-[13px] text-[var(--muted)]">
            결제가 완료되었습니다. 잠시 후 입점 신청 페이지로 이동합니다.
          </p>
        </>
      ) : status === "pending" ? (
        <>
          <Clock className="mx-auto text-[var(--accent)]" size={44} />
          <h1 className="mt-3 text-[22px] font-black">신청이 접수되었습니다</h1>
          <p className="mt-2 text-[13px] text-[var(--muted)]">
            담당 매니저가 결제·입점 절차를 안내드립니다. 입점 신청 페이지로 이동합니다.
          </p>
        </>
      ) : (
        <>
          <XCircle className="mx-auto text-rose-500" size={44} />
          <h1 className="mt-3 text-[22px] font-black">결제가 완료되지 않았습니다</h1>
          <p className="mt-2 text-[13px] text-[var(--muted)]">
            결제가 취소되었거나 오류가 발생했습니다. 다시 시도해 주세요.
          </p>
        </>
      )}

      <div className="mt-6 flex flex-col items-center gap-2">
        {ok ? (
          <>
            <a href={ONBOARDING.applyUrl} className="kt-btn kt-btn-primary px-5 py-2.5 text-[12px]">
              <ExternalLink size={14} /> 입점 신청 페이지로 이동 {count > 0 ? `(${count})` : ""}
            </a>
            <p className="inline-flex items-center gap-1 text-[10px] text-[var(--muted)]">
              <Loader2 size={11} className="animate-spin" /> 자동 이동 중…
            </p>
          </>
        ) : (
          <Link href={ONBOARDING.path} className="kt-btn kt-btn-primary px-5 py-2.5 text-[12px]">
            다시 신청하기
          </Link>
        )}
        <Link href="/explorer" className="kt-btn kt-btn-outline px-5 py-2 text-[11px]">서비스로 돌아가기</Link>
      </div>
    </div>
  );
}

export default function OnboardingDonePage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="py-10 text-center text-[12px] text-[var(--muted)]">불러오는 중…</div>}>
        <DoneInner />
      </Suspense>
    </PageShell>
  );
}

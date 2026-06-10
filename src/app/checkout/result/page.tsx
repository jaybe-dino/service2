"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, XCircle, AlertTriangle } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";

function Result() {
  const status = useSearchParams().get("status") ?? "fail";
  const ok = status === "success";

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      {ok ? (
        <>
          <Check className="mx-auto text-emerald-500" size={40} />
          <h1 className="mt-3 text-[20px] font-black">결제가 완료되었습니다 🎉</h1>
          <p className="mt-2 text-[12px] text-[var(--muted)]">Pro 기능이 활성화되었습니다. (30일)</p>
          <Link href="/explorer" className="kt-btn kt-btn-primary mt-5 px-6 py-2.5 text-[12px]">콘텐츠 탐색 시작</Link>
        </>
      ) : status === "error" ? (
        <>
          <AlertTriangle className="mx-auto text-amber-500" size={40} />
          <h1 className="mt-3 text-[20px] font-black">처리 중 오류</h1>
          <p className="mt-2 text-[12px] text-[var(--muted)]">결제 설정 또는 서버 오류입니다. 잠시 후 다시 시도해 주세요.</p>
          <Link href="/checkout" className="kt-btn kt-btn-outline mt-5 px-6 py-2.5 text-[12px]">다시 시도</Link>
        </>
      ) : (
        <>
          <XCircle className="mx-auto text-rose-500" size={40} />
          <h1 className="mt-3 text-[20px] font-black">결제가 완료되지 않았습니다</h1>
          <p className="mt-2 text-[12px] text-[var(--muted)]">결제가 취소되었거나 승인에 실패했습니다.</p>
          <Link href="/checkout" className="kt-btn kt-btn-primary mt-5 px-6 py-2.5 text-[12px]">다시 시도</Link>
        </>
      )}
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="py-20 text-center text-[var(--muted)]">확인 중…</div>}>
        <Result />
      </Suspense>
    </PageShell>
  );
}

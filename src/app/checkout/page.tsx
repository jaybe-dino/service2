"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, Check, Lock, Loader2 } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { PAY_PLANS } from "@/lib/payments";
import { PAY_TEST_MODE } from "@/data/ktrend/meta";

const NICEPAY_SDK = "https://pay.nicepay.co.kr/v1/js/";
const PRO_AMT = PAY_PLANS.pro.amount;
const wonFmt = (n: number) => "₩" + n.toLocaleString();

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject();
    const w = window as unknown as { AUTHNICE?: unknown };
    if (w.AUTHNICE) return resolve();
    const existing = document.querySelector(`script[src="${NICEPAY_SDK}"]`);
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const s = document.createElement("script");
    s.src = NICEPAY_SDK;
    s.onload = () => resolve();
    s.onerror = () => reject();
    document.body.appendChild(s);
  });
}

export default function CheckoutPage() {
  const { user, isPro } = usePlan();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [testTok, setTestTok] = useState(""); // 🧪 라이브 결제 테스트 토큰(URL ?test=)

  useEffect(() => {
    const tk = new URLSearchParams(window.location.search).get("test");
    if (tk) { try { sessionStorage.setItem("pay.test", tk); } catch {} setTestTok(tk); }
    else { try { const s = sessionStorage.getItem("pay.test"); if (s) setTestTok(s); } catch {} }
  }, []);

  const pay = async () => {
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch("/api/payment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", mode: "subscribe", test: testTok }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setBusy(false);
        setMsg(data?.error ?? "결제 시작에 실패했습니다.");
        return;
      }
      await loadSdk();
      const w = window as unknown as { AUTHNICE?: { requestPay: (o: Record<string, unknown>) => void } };
      if (!w.AUTHNICE) { setBusy(false); setMsg("결제 모듈 로드 실패"); return; }
      w.AUTHNICE.requestPay({
        clientId: data.clientKey,
        method: "card",
        orderId: data.orderId,
        amount: data.amount,
        goodsName: data.goodsName,
        returnUrl: data.returnUrl,
        fnError: (result: { errorMsg?: string }) => {
          setBusy(false);
          setMsg(result?.errorMsg ?? "결제가 취소되었습니다.");
        },
      });
    } catch {
      setBusy(false);
      setMsg("결제 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-[22px] font-black tracking-tight">Pro 구독 시작</h1>
        <p className="mb-5 text-[12px] text-[var(--muted)]">결제 즉시 이용 · <b className="text-[var(--accent)]">매월 {wonFmt(PRO_AMT)} 자동결제</b> (언제든 해지)</p>
        {PAY_TEST_MODE && <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">⚠️ 결제 테스트 모드: 실제 청구 금액은 {wonFmt(PRO_AMT)} 입니다.</p>}

        {isPro ? (
          <div className="kt-card p-6 text-center">
            <Check className="mx-auto text-emerald-500" />
            <p className="mt-2 text-[14px] font-bold">이미 Pro 이용 중입니다</p>
            <Link href="/explorer" className="kt-btn kt-btn-primary mt-4 px-5 py-2 text-[12px]">콘텐츠 탐색</Link>
          </div>
        ) : !user ? (
          <div className="kt-card p-6 text-center">
            <Lock className="mx-auto text-[var(--accent)]" />
            <p className="mt-2 text-[13px] font-semibold">결제하려면 로그인이 필요합니다.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={() => router.push("/login")} className="kt-btn kt-btn-primary px-5 py-2 text-[12px]">로그인</button>
              <Link href="/signup" className="kt-btn kt-btn-outline px-5 py-2 text-[12px]">회원가입</Link>
            </div>
          </div>
        ) : (
          <div className="kt-card p-6">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-[16px] font-black">Pro</div>
                <div className="text-[11px] text-[var(--muted)]">월간 구독 · 언제든 해지</div>
              </div>
              <div className="text-right">
                <div className="text-[24px] font-black text-[var(--accent)]">{wonFmt(PRO_AMT)}</div>
                <div className="text-[10px] text-[var(--muted)]">/ 월 (VAT 포함)</div>
              </div>
            </div>
            <div className="mt-3 rounded-md bg-[var(--accent-light)] px-3 py-2 text-[11px] font-semibold text-[var(--accent)]">
              카드 등록 즉시 {wonFmt(PRO_AMT)} 첫 결제 · 이후 매월 자동결제
            </div>
            <ul className="mt-4 space-y-1.5 text-[11px]">
              <li className="flex gap-1.5"><Check size={13} className="mt-0.5 text-[var(--accent)]" /> 열람권 무제한 (콘텐츠·이름)</li>
              <li className="flex gap-1.5"><Check size={13} className="mt-0.5 text-[var(--accent)]" /> 인플루언서 컨택·상세, 콘텐츠 분석</li>
              <li className="flex gap-1.5"><Check size={13} className="mt-0.5 text-[var(--accent)]" /> 성장 리포트 PDF · 주간 스냅샷</li>
            </ul>
            {msg && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">{msg}</p>}
            <button onClick={pay} disabled={busy} className="kt-btn kt-btn-primary mt-5 w-full py-2.5 text-[12px] disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />} {busy ? "처리 중…" : `${wonFmt(PRO_AMT)} 결제하고 Pro 시작`}
            </button>
            <p className="mt-2 text-center text-[9px] text-[var(--muted)]">결제 즉시 Pro가 활성화되며 매월 자동결제됩니다. 마이페이지에서 언제든 해지할 수 있습니다.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}

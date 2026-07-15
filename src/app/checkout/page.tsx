"use client";

// Pro 정기결제(구독) 체크아웃 — 카드 등록 → 빌키발급 → 첫 달 결제 → 30일마다 자동청구.
// NICEpay V2는 호스팅 빌링창이 없어 카드정보를 폼으로 받아 서버에서 즉시 암호화(encData)한다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, Check, Lock, Loader2, ShieldCheck } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { PAY_PLANS } from "@/lib/payments";
import { PAY_TEST_MODE } from "@/data/ktrend/meta";

const PRO_AMT = PAY_PLANS.pro.amount;
const wonFmt = (n: number) => "₩" + n.toLocaleString();

export default function CheckoutPage() {
  const { user, isPro } = usePlan();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [testTok, setTestTok] = useState("");
  const [card, setCard] = useState({ cardNo: "", expMonth: "", expYear: "", idNo: "", cardPw: "" });
  const set = (k: keyof typeof card) => (e: React.ChangeEvent<HTMLInputElement>) => setCard((p) => ({ ...p, [k]: e.target.value.replace(/[^0-9]/g, "") }));

  useEffect(() => {
    const tk = new URLSearchParams(window.location.search).get("test");
    if (tk) { try { sessionStorage.setItem("pay.test", tk); } catch {} setTestTok(tk); }
    else { try { const s = sessionStorage.getItem("pay.test"); if (s) setTestTok(s); } catch {} }
  }, []);

  const pay = async () => {
    setMsg(""); setBusy(true);
    try {
      const res = await fetch("/api/payment/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro", test: testTok, card: {
          cardNo: card.cardNo, expYear: card.expYear, expMonth: card.expMonth, idNo: card.idNo, cardPw: card.cardPw,
        } }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setBusy(false); setMsg(data?.error ?? "결제에 실패했습니다."); return; }
      setOk(true); setBusy(false);
      setTimeout(() => router.push("/explorer"), 2500);
    } catch {
      setBusy(false); setMsg("결제 처리 중 오류가 발생했습니다.");
    }
  };

  const cardFmt = (v: string) => v.replace(/(.{4})/g, "$1 ").trim();

  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-[22px] font-black tracking-tight">Pro 구독 시작</h1>
        <p className="mb-5 text-[12px] text-[var(--muted)]">카드 등록 즉시 이용 · <b className="text-[var(--accent)]">매월(30일) {wonFmt(PRO_AMT)} 자동결제</b> (언제든 해지)</p>
        {PAY_TEST_MODE && <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">⚠️ 결제 테스트 모드</p>}

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
        ) : ok ? (
          <div className="kt-card p-6 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-500"><Check size={26} /></div>
            <p className="mt-3 text-[15px] font-black">구독이 시작됐습니다</p>
            <p className="mt-1 text-[12px] text-[var(--muted)]">Pro가 활성화되었고 30일마다 자동결제됩니다. 마이페이지에서 언제든 해지할 수 있어요.</p>
          </div>
        ) : (
          <div className="kt-card p-6">
            <div className="flex items-baseline justify-between">
              <div><div className="text-[16px] font-black">Pro</div><div className="text-[11px] text-[var(--muted)]">월간 구독 · 30일 자동결제</div></div>
              <div className="text-right"><div className="text-[24px] font-black text-[var(--accent)]">{wonFmt(PRO_AMT)}</div><div className="text-[10px] text-[var(--muted)]">/ 월 (VAT 포함)</div></div>
            </div>

            {/* 카드 등록 폼 */}
            <div className="mt-4 space-y-2.5">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">카드번호</span>
                <input inputMode="numeric" maxLength={16} value={cardFmt(card.cardNo)} onChange={set("cardNo")} placeholder="0000 0000 0000 0000" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[13px] tracking-wider" />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">유효 월(MM)</span>
                  <input inputMode="numeric" maxLength={2} value={card.expMonth} onChange={set("expMonth")} placeholder="MM" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[13px]" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">유효 년(YY)</span>
                  <input inputMode="numeric" maxLength={2} value={card.expYear} onChange={set("expYear")} placeholder="YY" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[13px]" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">비밀번호 앞2</span>
                  <input inputMode="numeric" type="password" maxLength={2} value={card.cardPw} onChange={set("cardPw")} placeholder="**" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[13px]" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">생년월일 6자리(개인) / 사업자번호 10자리(법인)</span>
                <input inputMode="numeric" maxLength={10} value={card.idNo} onChange={set("idNo")} placeholder="YYMMDD 또는 사업자번호" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[13px]" />
              </label>
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-[10px] text-[var(--muted)]">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-500" />
              카드정보는 저장하지 않으며, 결제사(NICEpay) 정기결제 규격으로 즉시 암호화되어 자동결제(빌링키)에만 사용됩니다.
            </p>
            {msg && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">{msg}</p>}
            <button onClick={pay} disabled={busy} className="kt-btn kt-btn-primary mt-4 w-full py-2.5 text-[12px] disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />} {busy ? "처리 중…" : `${wonFmt(PRO_AMT)} 결제하고 Pro 시작`}
            </button>
            <p className="mt-2 text-center text-[9px] text-[var(--muted)]">등록 즉시 첫 결제되며 이후 30일마다 자동결제됩니다. 마이페이지에서 해지 가능.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
}

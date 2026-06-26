"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, Check, Lock, Loader2, CreditCard, ArrowRight,
  Store, Globe2, Rocket,
} from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { ONBOARDING } from "@/data/ktrend/meta";

const NICEPAY_SDK = "https://pay.nicepay.co.kr/v1/js/";

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

const BENEFITS = [
  { icon: Store, title: "틱톡샵 멀티몰 입점", desc: "글로벌 틱톡샵 셀러 계정 개설부터 멀티몰 입점까지 패스트트랙으로 진행합니다." },
  { icon: Globe2, title: "미국·동남아 진출", desc: "타겟 국가별 현지 운영·정산 구조를 셋업해 K-뷰티 브랜드의 해외 판매를 엽니다." },
  { icon: Rocket, title: "콘텐츠·크리에이터 연결", desc: "Glovek의 콘텐츠·인플루언서 데이터를 기반으로 초기 캠페인 파트너를 매칭합니다." },
];

const CATEGORIES = ["스킨케어", "메이크업", "헤어케어", "바디케어", "디바이스", "기타"];

export default function OnboardingPage() {
  const { user, ready, serverMode } = usePlan();
  const router = useRouter();

  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [note, setNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState("");

  // 비활성화면 접근 불가
  useEffect(() => {
    if (!ONBOARDING.enabled) router.replace("/explorer");
  }, [router]);

  // 로그인 정보 프리필
  useEffect(() => {
    if (user) {
      setBrand((b) => b || user.brand || user.company || "");
      setName((n) => n || user.name || "");
      setEmail((e) => e || user.email || "");
    }
  }, [user]);

  if (!ONBOARDING.enabled) return null;

  const saveInfo = async (): Promise<boolean> => {
    setMsg("");
    if (!brand.trim() || !contact.trim()) {
      setMsg("브랜드명과 연락처를 입력해 주세요.");
      return false;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, name, contact, email, category, note }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setMsg(data?.error ?? "저장에 실패했습니다."); return false; }
      setSaved(true);
      return true;
    } catch {
      setMsg("저장 중 오류가 발생했습니다.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const pay = async () => {
    setMsg("");
    // 정보가 아직 저장되지 않았으면 먼저 저장
    if (!saved) {
      const ok = await saveInfo();
      if (!ok) return;
    }
    setPaying(true);
    try {
      const res = await fetch("/api/payment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "onboarding", mode: "once" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPaying(false);
        // 결제 모듈 미설정 시: 신청만 접수하고 안내 페이지로 이동
        if (data?.configured === false) { router.push("/onboarding/done?status=pending"); return; }
        setMsg(data?.error ?? "결제 시작에 실패했습니다.");
        return;
      }
      await loadSdk();
      const w = window as unknown as { AUTHNICE?: { requestPay: (o: Record<string, unknown>) => void } };
      if (!w.AUTHNICE) { setPaying(false); setMsg("결제 모듈 로드 실패"); return; }
      w.AUTHNICE.requestPay({
        clientId: data.clientKey,
        method: "card",
        orderId: data.orderId,
        amount: data.amount,
        goodsName: data.goodsName,
        returnUrl: data.returnUrl,
        fnError: (result: { errorMsg?: string }) => {
          setPaying(false);
          setMsg(result?.errorMsg ?? "결제가 취소되었습니다.");
        },
      });
    } catch {
      setPaying(false);
      setMsg("결제 처리 중 오류가 발생했습니다.");
    }
  };

  const loggedIn = Boolean(user);

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        {/* 히어로 */}
        <div className="rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#1A56DB] p-7 text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
            <ShoppingBag size={12} /> TikTok Shop 온보딩
          </div>
          <h1 className="mt-3 text-[26px] font-black leading-tight">
            틱톡샵, 글로벅이 입점부터<br />운영까지 함께 시작합니다
          </h1>
          <p className="mt-2 text-[13px] text-white/85">
            K-뷰티 브랜드의 글로벌 틱톡샵 진출을 위한 멀티몰 온보딩 패스트트랙.
            회원가입 → 최소 정보 입력 → 온보딩 신청까지 이 화면에서 진행됩니다.
          </p>
        </div>

        {/* 혜택 */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="kt-card p-4">
              <b.icon size={18} className="text-[var(--accent)]" />
              <div className="mt-2 text-[13px] font-bold">{b.title}</div>
              <div className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{b.desc}</div>
            </div>
          ))}
        </div>

        {/* 단계 1: 로그인 */}
        {!ready ? (
          <div className="kt-card mt-5 p-6 text-center text-[12px] text-[var(--muted)]">
            <Loader2 className="mx-auto animate-spin" size={18} /> 불러오는 중…
          </div>
        ) : !loggedIn ? (
          <div className="kt-card mt-5 p-6 text-center">
            <Lock className="mx-auto text-[var(--accent)]" />
            <p className="mt-2 text-[13px] font-semibold">온보딩 신청은 회원가입 후 진행됩니다.</p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">가입 후 이 페이지로 돌아와 최소 정보를 입력해 주세요.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/signup" className="kt-btn kt-btn-primary px-5 py-2 text-[12px]">회원가입</Link>
              <button onClick={() => router.push("/login")} className="kt-btn kt-btn-outline px-5 py-2 text-[12px]">로그인</button>
            </div>
          </div>
        ) : (
          <>
            {/* 단계 2: 최소 정보 입력 */}
            <div className="kt-card mt-5 p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">1</span>
                <h2 className="text-[15px] font-black">최소 정보 입력</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="브랜드명 *" value={brand} onChange={setBrand} placeholder="예) 글로우랩" />
                <Field label="담당자명" value={name} onChange={setName} placeholder="예) 홍길동" />
                <Field label="연락처 *" value={contact} onChange={setContact} placeholder="예) 010-0000-0000" />
                <Field label="이메일" value={email} onChange={setEmail} placeholder="예) brand@company.com" />
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">카테고리</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--fg)]"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">요청사항 (선택)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="진출 희망 국가, 현재 판매 채널, 문의사항 등을 자유롭게 적어주세요."
                  className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--fg)]"
                />
              </label>
              {saved && (
                <p className="mt-3 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                  <Check size={13} /> 정보가 저장되었습니다.
                </p>
              )}
            </div>

            {/* 단계 3: 온보딩 결제 */}
            <div className="kt-card mt-4 p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">2</span>
                <h2 className="text-[15px] font-black">온보딩 신청 · 결제</h2>
              </div>
              <div className="mt-4 flex items-baseline justify-between rounded-lg bg-[var(--accent-light)] px-4 py-3">
                <div className="text-[12px] font-semibold text-[var(--accent)]">틱톡샵 멀티몰 온보딩 트랙 (단건)</div>
                <div className="text-[22px] font-black text-[var(--accent)]">{ONBOARDING.feeLabel}</div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
                결제가 완료되면 온보딩 신청이 접수되며, 상세 입점 신청 페이지(apply.tpartners)로 이동합니다.
                이후 담당 매니저가 연락드려 입점 절차를 안내합니다.
              </p>

              {msg && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">{msg}</p>}

              <button
                onClick={pay}
                disabled={paying || saving}
                className="kt-btn kt-btn-primary mt-4 w-full py-2.5 text-[12px] disabled:opacity-50"
              >
                {paying || saving ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                {paying ? "결제 진행 중…" : saving ? "저장 중…" : `${ONBOARDING.feeLabel} 결제하고 온보딩 신청`}
                {!paying && !saving && <ArrowRight size={14} />}
              </button>
              {!serverMode && (
                <p className="mt-2 text-center text-[10px] text-amber-600">
                  현재 결제 모듈이 연결되지 않은 환경입니다. 신청만 접수됩니다.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}

function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--fg)]"
      />
    </label>
  );
}

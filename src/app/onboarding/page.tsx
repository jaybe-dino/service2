"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, Check, Lock, Loader2, CreditCard, ArrowRight, Plus,
} from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import {
  ONBOARDING, MALL_TRACKS, MALL_TRACK_MAP, MALL_COMMON_BENEFITS, type MallTrackId,
} from "@/data/ktrend/meta";

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

const CATEGORIES = ["스킨케어", "메이크업", "헤어케어", "바디케어", "디바이스", "기타"];

export default function OnboardingPage() {
  const { user, ready, serverMode } = usePlan();
  const router = useRouter();
  const formRef = useRef<HTMLDivElement>(null);

  const [selected, setSelected] = useState<MallTrackId | null>(null);
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

  useEffect(() => {
    if (!ONBOARDING.enabled) router.replace("/explorer");
  }, [router]);

  // 홈 등에서 ?track=ready|live|onboarding 로 들어오면 해당 트랙 선택 + 폼으로 스크롤
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("track");
    if (t === "ready" || t === "live" || t === "onboarding") {
      setSelected(t);
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setBrand((b) => b || user.brand || user.company || "");
      setName((n) => n || user.name || "");
      setEmail((e) => e || user.email || "");
    }
  }, [user]);

  if (!ONBOARDING.enabled) return null;

  const track = selected ? MALL_TRACK_MAP[selected] : null;

  const pickTrack = (id: MallTrackId) => {
    setSelected(id);
    setSaved(false);
    setMsg("");
    // 폼으로 스크롤
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  const saveInfo = async (): Promise<boolean> => {
    setMsg("");
    if (!brand.trim() || !contact.trim()) { setMsg("브랜드명과 연락처를 입력해 주세요."); return false; }
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, name, contact, email, category, note, track: selected }),
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
    if (!selected) return;
    setMsg("");
    if (!saved) { const ok = await saveInfo(); if (!ok) return; }
    setPaying(true);
    try {
      const res = await fetch("/api/payment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPaying(false);
        if (data?.configured === false) { router.push(`/onboarding/done?status=pending&track=${selected}`); return; }
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
      <div className="mx-auto max-w-5xl">
        {/* 히어로 */}
        <div className="rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#1A56DB] p-7 text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
            <ShoppingBag size={12} /> TikTok Shop 입점
          </div>
          <h1 className="mt-3 text-[26px] font-black leading-tight">
            틱톡샵, 글로벅이 입점부터<br />운영까지 함께 시작합니다
          </h1>
          <p className="mt-2 text-[13px] text-white/85">
            브랜드 목표에 맞는 입점 트랙을 선택하세요. 회원가입 → 최소 정보 입력 → 결제까지 이 화면에서 진행됩니다.
          </p>
        </div>

        {/* 트랙 카드 */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {MALL_TRACKS.map((t) => {
            const isSel = selected === t.id;
            return (
              <div
                key={t.id}
                className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white transition-shadow ${
                  isSel ? "border-[var(--accent)] shadow-lg ring-2 ring-[var(--accent)]"
                        : t.highlight ? "border-pink-200 shadow-md" : "border-[var(--border)]"
                }`}
              >
                {t.highlight && <div className="h-1 w-full bg-pink-500" />}
                <div className={`px-5 pt-5 pb-4 ${t.dark ? "bg-[#0b0b0c] text-white" : ""}`}>
                  <div className="text-[19px] font-black tracking-tight">{t.name}</div>
                  <div className={`mt-1 text-[12px] ${t.dark ? "text-white/70" : "text-[var(--muted)]"}`}>{t.tagline}</div>
                </div>
                <div className="border-t border-[var(--border)] px-5 py-4">
                  <div className="flex items-end gap-1">
                    <span className="text-[26px] font-black text-pink-500">{t.priceLabel}</span>
                    <span className="mb-1 text-[12px] font-semibold text-[var(--muted)]">/월</span>
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--muted)]">+ {t.commissionLabel}</div>
                </div>
                <div className="flex-1 border-t border-[var(--border)] px-5 py-4">
                  <ul className="space-y-2">
                    {t.features.map((f) => (
                      <li key={f} className="flex gap-1.5 text-[12px]">
                        <Check size={14} className="mt-0.5 shrink-0 text-pink-500" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="px-5 pb-5">
                  <button
                    onClick={() => pickTrack(t.id)}
                    className={`w-full rounded-lg py-2.5 text-[12px] font-bold transition-colors ${
                      isSel ? "bg-[var(--accent)] text-white"
                            : t.highlight ? "bg-pink-500 text-white hover:bg-pink-600"
                            : "border border-[var(--fg)] text-[var(--fg)] hover:bg-slate-50"
                    }`}
                  >
                    {isSel ? "선택됨 — 아래에서 신청 진행" : `${t.name}으로 입점`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 공통 제공 혜택 */}
        <div className="mt-4 rounded-2xl bg-[#0b0b0c] px-5 py-4 text-white">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-[12px] font-black text-pink-400">공통 제공 혜택</span>
            {MALL_COMMON_BENEFITS.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 text-[12px] text-white/90">
                <Plus size={12} className="text-white/60" /> {b}
              </span>
            ))}
          </div>
        </div>

        {/* 선택 후: 신청/결제 */}
        <div ref={formRef} className="mt-8">
          {!selected ? (
            <div className="kt-card p-6 text-center text-[12px] text-[var(--muted)]">
              위에서 입점 트랙을 선택하면 신청 단계가 열립니다.
            </div>
          ) : !ready ? (
            <div className="kt-card p-6 text-center text-[12px] text-[var(--muted)]">
              <Loader2 className="mx-auto animate-spin" size={18} /> 불러오는 중…
            </div>
          ) : !loggedIn ? (
            <div className="kt-card p-6 text-center">
              <Lock className="mx-auto text-[var(--accent)]" />
              <p className="mt-2 text-[13px] font-semibold">{track?.name} 입점 신청은 회원가입 후 진행됩니다.</p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">가입 후 이 페이지로 돌아와 신청을 완료해 주세요.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Link href="/signup" className="kt-btn kt-btn-primary px-5 py-2 text-[12px]">회원가입</Link>
                <button onClick={() => router.push("/login")} className="kt-btn kt-btn-outline px-5 py-2 text-[12px]">로그인</button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-5">
              {/* 정보 입력 */}
              <div className="kt-card p-6 md:col-span-3">
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
                    <select value={category} onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--fg)]">
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">요청사항 (선택)</span>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                    placeholder="진출 희망 국가, 현재 판매 채널, 문의사항 등을 자유롭게 적어주세요."
                    className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--fg)]" />
                </label>
                {saved && (
                  <p className="mt-3 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                    <Check size={13} /> 정보가 저장되었습니다.
                  </p>
                )}
              </div>

              {/* 결제 요약 */}
              <div className="kt-card h-fit p-6 md:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">2</span>
                  <h2 className="text-[15px] font-black">신청 · 결제</h2>
                </div>
                <div className="mt-4 rounded-lg bg-[var(--accent-light)] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[var(--accent)]">{track?.name}</span>
                    <button onClick={() => setSelected(null)} className="text-[10px] font-semibold text-[var(--accent)] hover:underline">변경</button>
                  </div>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-[22px] font-black text-[var(--accent)]">{track?.priceLabel}</span>
                    <span className="mb-0.5 text-[11px] font-semibold text-[var(--accent)]">/월</span>
                  </div>
                  <div className="text-[11px] text-[var(--accent)]">+ {track?.commissionLabel}</div>
                </div>

                <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
                  {track?.flow === "apply"
                    ? "결제 후 입점 신청 페이지(apply.tpartners)로 이동하며, 담당 매니저가 연락드려 절차를 안내합니다."
                    : "카드 등록 즉시 첫 달이 결제되고 매월 자동결제됩니다. 마이페이지에서 언제든 해지할 수 있습니다."}
                </p>

                {msg && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">{msg}</p>}

                <button onClick={pay} disabled={paying || saving}
                  className="kt-btn kt-btn-primary mt-4 w-full py-2.5 text-[12px] disabled:opacity-50">
                  {paying || saving ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                  {paying ? "결제 진행 중…" : saving ? "저장 중…"
                    : track?.flow === "apply" ? `${track?.priceLabel} 결제하고 신청`
                    : `${track?.priceLabel}/월 구독하고 입점`}
                  {!paying && !saving && <ArrowRight size={14} />}
                </button>
                {!serverMode && (
                  <p className="mt-2 text-center text-[10px] text-amber-600">
                    현재 결제 모듈이 연결되지 않은 환경입니다. 신청만 접수됩니다.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
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
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--fg)]" />
    </label>
  );
}

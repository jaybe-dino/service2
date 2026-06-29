"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, Check, Lock, Loader2, CreditCard, ArrowRight, ArrowLeft,
  Plus, Trash2, AlertTriangle, PartyPopper, Star,
} from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { ONBOARDING, MALL_TRACKS, MALL_TRACK_MAP, PAY_TEST_MODE, type MallTrackId } from "@/data/ktrend/meta";
import {
  SELF_CHECK_QUESTIONS, ONB_COUNTRIES, ONB_COUNTRY_MAP, COMMON_CERT,
  gradeFromChecks, missingCerts, computeQuote, ONB_TIMELINE,
  type SubTerm, type GradeInfo,
} from "@/lib/onboarding";

const NICEPAY_SDK = "https://pay.nicepay.co.kr/v1/js/";
const won = (n: number) => "₩" + Math.round(n).toLocaleString();
const STEPS = ["자가체크", "트랙 선택", "국가·결제", "정보입력", "완료"];
const PRODUCT_CATS = ["스킨케어", "색조", "헤어케어", "이너뷰티", "푸드", "기타"];
const BANKS = ["국민", "신한", "우리", "하나", "농협", "기업", "카카오뱅크", "토스뱅크", "SC제일", "씨티", "기타"];
const productLimit = (t: MallTrackId) => (t === "ready" ? 2 : t === "live" ? 5 : 10);

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject();
    const w = window as unknown as { AUTHNICE?: unknown };
    if (w.AUTHNICE) return resolve();
    const existing = document.querySelector(`script[src="${NICEPAY_SDK}"]`);
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const s = document.createElement("script");
    s.src = NICEPAY_SDK; s.onload = () => resolve(); s.onerror = () => reject();
    document.body.appendChild(s);
  });
}

interface Product {
  nameKo: string; nameEn: string; cat: string; price: string; cost: string;
  netWeight: string; netUnit: string; packWeight: string; w: string; h: string; d: string; desc: string;
}
const emptyProduct = (): Product => ({ nameKo: "", nameEn: "", cat: PRODUCT_CATS[0], price: "", cost: "", netWeight: "", netUnit: "g", packWeight: "", w: "", h: "", d: "", desc: "" });

function OnboardingInner() {
  const { user, ready } = usePlan();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // PHASE 1
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [certs, setCerts] = useState<Record<string, string>>({});
  const [referral, setReferral] = useState("");
  const [gradeInfo, setGradeInfo] = useState<GradeInfo | null>(null);

  // PHASE 2/3
  const [track, setTrack] = useState<MallTrackId | null>(null);
  const [confirmTrack, setConfirmTrack] = useState<MallTrackId | null>(null);
  const [payCountries, setPayCountries] = useState<string[]>([]);
  const [term, setTerm] = useState<SubTerm>("monthly");

  // PHASE 4
  const [d, setD] = useState({
    brandKo: "", brandEn: "", bizNo: "", repName: "", managerName: "",
    contact: "", email: "", meetingType: "Zoom", note: "",
    bank: BANKS[0], acct: "", holder: "",
  });
  const [slots, setSlots] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([emptyProduct()]);
  const [completed, setCompleted] = useState<{ track: MallTrackId; countries: string[]; grade: string; email: string; missing: { id: string; label: string }[] } | null>(null);

  const scrollTop = () => setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  const goStep = (s: number) => { setStep(s); setMsg(""); scrollTop(); };

  useEffect(() => { if (!ONBOARDING.enabled) router.replace("/explorer"); }, [router]);

  // 진입 시: 추천인코드 캡처 + 결제 후 재개
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const ref = sp.get("ref");
    if (ref) { try { localStorage.setItem("onb.ref", ref); } catch {} setReferral(ref); }
    else { try { const r = localStorage.getItem("onb.ref"); if (r) setReferral(r); } catch {} }

    const paid = sp.get("paid");
    const payfail = sp.get("payfail");
    if (payfail) setMsg("결제가 취소되었거나 완료되지 않았습니다. 다시 시도해 주세요.");

    (async () => {
      const r = await fetch("/api/onboarding/status", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
      const app = r?.application;
      if (!app) return;
      // 신청서 복원
      const cs = app.countries ? String(app.countries).split(",").filter(Boolean) : [];
      if (app.track) setTrack(app.track);
      if (cs.length) { setCountries(cs); setPayCountries(cs); }
      if (app.grade && app.recommended_track) setGradeInfo(gradeFromChecks(Number(app.payload?.yes ?? 0)));
      if (app.payload?.certs) setCerts(app.payload.certs);
      if (app.payload?.checks) setChecks(app.payload.checks);
      if (app.term) setTerm(app.term);
      const det = app.payload?.details;
      if (det) {
        setD((p) => ({ ...p, brandKo: det.brandKo ?? "", brandEn: det.brandEn ?? "", bizNo: det.bizNo ?? "",
          repName: det.repName ?? "", managerName: det.managerName ?? "", contact: det.contact ?? "",
          email: det.email ?? "", meetingType: det.meetingType || "Zoom", note: det.note ?? "",
          bank: det.settlement?.bank ?? BANKS[0], acct: det.settlement?.acct ?? "", holder: det.settlement?.holder ?? "" }));
        if (Array.isArray(det.meetingSlots)) setSlots(det.meetingSlots);
        if (Array.isArray(det.products) && det.products.length) setProducts(det.products);
      }
      // 이미 정보 제출 완료 → 완료/현황 화면 (다시 폼 띄우지 않음)
      if (app.phase === "completed" || app.status === "details_submitted") {
        setCompleted({ track: app.track, countries: cs, grade: app.grade ?? "-", email: det?.email ?? "",
          missing: missingCerts(cs, app.payload?.certs ?? {}) });
        setStep(4); scrollTop();
      } else if (paid || app.status === "paid" || app.phase === "details") {
        // 결제 완료, 정보입력 미완 → PHASE 4
        setStep(3); scrollTop();
      }
    })();
  }, []);

  // 로그인 정보 프리필
  useEffect(() => {
    if (user) setD((p) => ({ ...p, brandKo: p.brandKo || user.brand || user.company || "",
      managerName: p.managerName || user.name || "", email: p.email || user.email || "" }));
  }, [user]);

  if (!ONBOARDING.enabled) return null;

  const yesCount = SELF_CHECK_QUESTIONS.filter((q) => checks[q.id]).length;
  const quote = track ? computeQuote(track, Math.max(1, payCountries.length), term) : null;

  // ── PHASE 1 → 결과 ──
  const seeResult = async () => {
    if (!countries.length) { setMsg("진출 희망 국가를 1개 이상 선택해 주세요."); return; }
    const g = gradeFromChecks(yesCount);
    setGradeInfo(g);
    setTrack((t) => t ?? g.recommended);
    setPayCountries(countries);
    setMsg("");
    // 서버 저장(로그인 시)
    if (user) {
      await fetch("/api/onboarding/apply", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "self_check", checks, countries, certs, referral, track: g.recommended }) }).catch(() => {});
    }
  };

  // ── PHASE 2 → 트랙 확정 ──
  const chooseTrack = (id: MallTrackId) => {
    if (gradeInfo && id !== gradeInfo.recommended) { setConfirmTrack(id); return; }
    setTrack(id); goStep(2);
  };
  const confirmChoose = () => { if (confirmTrack) { setTrack(confirmTrack); setConfirmTrack(null); goStep(2); } };

  // ── PHASE 3 → 결제 ──
  const pay = async () => {
    if (!track) return;
    if (!user) { router.push("/login?next=/onboarding"); return; }
    if (!payCountries.length) { setMsg("진출 국가를 1개 이상 선택해 주세요."); return; }
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/payment/start", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: track, countries: payCountries, term }) });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setBusy(false);
        if (data?.configured === false) { setStep(3); scrollTop(); return; } // 결제 모듈 미설정 → 정보입력으로
        setMsg(data?.error ?? "결제 시작에 실패했습니다."); return;
      }
      await loadSdk();
      const w = window as unknown as { AUTHNICE?: { requestPay: (o: Record<string, unknown>) => void } };
      if (!w.AUTHNICE) { setBusy(false); setMsg("결제 모듈 로드 실패"); return; }
      w.AUTHNICE.requestPay({
        clientId: data.clientKey, method: "card", orderId: data.orderId, amount: data.amount,
        goodsName: data.goodsName, returnUrl: data.returnUrl,
        fnError: (result: { errorMsg?: string }) => { setBusy(false); setMsg(result?.errorMsg ?? "결제가 취소되었습니다."); },
      });
    } catch { setBusy(false); setMsg("결제 처리 중 오류가 발생했습니다."); }
  };

  // ── PHASE 4 → 제출 ──
  const submitDetails = async () => {
    if (!track) return;
    if (!d.brandKo.trim() || !d.contact.trim() || !d.email.trim()) { setMsg("브랜드명·연락처·이메일은 필수입니다."); return; }
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/onboarding/apply", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "details", brand: d.brandKo, brandEn: d.brandEn, bizNo: d.bizNo,
          repName: d.repName, managerName: d.managerName, contact: d.contact, email: d.email,
          meetingType: d.meetingType, meetingSlots: slots, products: products.slice(0, productLimit(track)),
          settlement: { bank: d.bank, acct: d.acct, holder: d.holder }, note: d.note }) });
      const data = await res.json();
      if (!res.ok || !data.ok) { setBusy(false); setMsg(data?.error ?? "제출에 실패했습니다."); return; }
      setCompleted({ track, countries: payCountries, grade: gradeInfo?.grade ?? "-", email: d.email,
        missing: missingCerts(payCountries, certs) });
      setBusy(false); goStep(4);
    } catch { setBusy(false); setMsg("제출 중 오류가 발생했습니다."); }
  };

  const limit = track ? productLimit(track) : 2;

  return (
    <PageShell>
      <div ref={topRef} className="mx-auto max-w-4xl">
        {/* 헤더 + 스텝 인디케이터 */}
        <div className="rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#1A56DB] p-6 text-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
            <ShoppingBag size={12} /> TikTok Shop 입점 신청
          </div>
          <h1 className="mt-2 text-[22px] font-black leading-tight">자가체크 → 트랙 선택 → 결제 → 정보입력까지 한 번에</h1>
          <Link href="/tts/qna" className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold hover:bg-white/25">
            자주 묻는 질문 (QnA 100선) <ArrowRight size={12} />
          </Link>
        </div>
        <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex shrink-0 items-center">
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                i === step ? "bg-[var(--accent)] text-white" : i < step ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                {i < step ? <Check size={12} /> : <span>{i + 1}</span>} {s}
              </div>
              {i < STEPS.length - 1 && <div className="mx-0.5 h-px w-4 bg-slate-200" />}
            </div>
          ))}
        </div>

        {PAY_TEST_MODE && <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">⚠️ 결제 테스트 모드 — 모든 트랙 결제 금액이 ₩1,000으로 청구됩니다.</p>}
        {msg && <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700">{msg}</p>}

        {/* ───────── PHASE 1 ───────── */}
        {step === 0 && (
          <div className="mt-5 space-y-5">
            <div className="kt-card p-6">
              <h2 className="text-[15px] font-black">먼저 우리 브랜드의 현황을 체크해보세요</h2>
              <p className="mt-1 text-[12px] text-[var(--muted)]">해당하는 항목을 선택하면 예비 등급과 추천 트랙을 바로 알려드립니다.</p>
              <div className="mt-4 space-y-2">
                {SELF_CHECK_QUESTIONS.map((q, i) => {
                  const on = !!checks[q.id];
                  return (
                    <button key={q.id} onClick={() => setChecks((c) => ({ ...c, [q.id]: !on }))}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                        on ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)] hover:bg-slate-50"}`}>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${on ? "bg-[var(--accent)] text-white" : "bg-slate-100 text-slate-500"}`}>
                        {on ? <Check size={13} /> : i + 1}
                      </span>
                      <span className="text-[12px] leading-snug">{q.label}</span>
                      <span className={`ml-auto shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${on ? "bg-[var(--accent)] text-white" : "bg-slate-100 text-slate-400"}`}>{on ? "Y" : "N"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="kt-card p-6">
              <h2 className="text-[15px] font-black">진출 희망 국가 & 인증 현황</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {ONB_COUNTRIES.map((c) => {
                  const on = countries.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => setCountries((cs) => on ? cs.filter((x) => x !== c.id) : [...cs, c.id])}
                      className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold ${on ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>
                      {c.flag} {c.nameKo}
                    </button>
                  );
                })}
              </div>
              {countries.length > 0 && (
                <div className="mt-4 space-y-3">
                  {countries.flatMap((cid) => ONB_COUNTRY_MAP[cid]?.certs.map((cert) => ({ cid, cert })) ?? []).map(({ cid, cert }) => (
                    <CertRow key={cert.id} flag={ONB_COUNTRY_MAP[cid].flag} nameKo={ONB_COUNTRY_MAP[cid].nameKo}
                      cert={cert} value={certs[cert.id]} onChange={(v) => setCerts((s) => ({ ...s, [cert.id]: v }))} />
                  ))}
                  <CertRow flag="🌐" nameKo="전 국가 공통" cert={COMMON_CERT} value={certs[COMMON_CERT.id]}
                    onChange={(v) => setCerts((s) => ({ ...s, [COMMON_CERT.id]: v }))} />
                </div>
              )}
            </div>

            {/* 결과 */}
            {gradeInfo && (
              <div className="kt-card border-[var(--accent)] p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--accent)] px-3 py-1 text-[12px] font-black text-white">예비 {gradeInfo.label}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-3 py-1 text-[12px] font-bold text-pink-600">
                    <Star size={12} /> 추천 트랙: {MALL_TRACK_MAP[gradeInfo.recommended].name}
                  </span>
                </div>
                {missingCerts(countries, certs).length > 0 && (
                  <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                    <b>인증 미비:</b> {missingCerts(countries, certs).map((m) => m.label).join(", ")} → 신청 완료 후 맞춤 가이드를 보내드립니다.
                  </div>
                )}
                <button onClick={() => goStep(1)} className="kt-btn kt-btn-primary mt-4 px-5 py-2.5 text-[12px]">
                  트랙 선택하러 가기 <ArrowRight size={14} />
                </button>
              </div>
            )}

            {!gradeInfo && (
              <button onClick={seeResult} disabled={!countries.length}
                className="kt-btn kt-btn-primary w-full py-3 text-[13px] disabled:opacity-50">
                결과 확인하기 <ArrowRight size={15} />
              </button>
            )}
          </div>
        )}

        {/* ───────── PHASE 2 ───────── */}
        {step === 1 && (
          <div className="mt-5">
            {gradeInfo && (
              <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="rounded-full bg-[var(--accent)] px-3 py-1 font-bold text-white">예비 {gradeInfo.label}</span>
                <span className="text-[var(--muted)]">추천 트랙은 <b className="text-pink-600">{MALL_TRACK_MAP[gradeInfo.recommended].name}</b> 입니다. 자유롭게 선택하세요.</span>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-3">
              {MALL_TRACKS.map((t) => {
                const rec = gradeInfo?.recommended === t.id;
                return (
                  <div key={t.id} className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white ${rec ? "border-pink-300 shadow-lg ring-2 ring-pink-200" : "border-[var(--border)]"}`}>
                    {rec && <div className="bg-pink-500 py-1 text-center text-[10px] font-black text-white">★ 추천 트랙</div>}
                    <div className={`px-5 pt-5 pb-3 ${t.dark ? "bg-[#0b0b0c] text-white" : ""}`}>
                      <div className="text-[17px] font-black">{t.name}</div>
                      <div className={`mt-0.5 text-[11px] ${t.dark ? "text-white/70" : "text-[var(--muted)]"}`}>{t.tagline}</div>
                    </div>
                    <div className="border-t border-[var(--border)] px-5 py-3">
                      <div className="flex items-end gap-1"><span className="text-[22px] font-black text-pink-500">{t.priceLabel}</span><span className="mb-1 text-[11px] text-[var(--muted)]">/월</span></div>
                      <div className="text-[11px] text-[var(--muted)]">+ {t.commissionLabel}</div>
                    </div>
                    <ul className="flex-1 space-y-1.5 border-t border-[var(--border)] px-5 py-3">
                      {t.features.map((f) => <li key={f} className="flex gap-1.5 text-[11px]"><Check size={13} className="mt-0.5 shrink-0 text-pink-500" /> {f}</li>)}
                    </ul>
                    <div className="px-5 pb-5">
                      <button onClick={() => chooseTrack(t.id)} className={`w-full rounded-lg py-2.5 text-[12px] font-bold ${rec ? "bg-pink-500 text-white hover:bg-pink-600" : "border border-[var(--fg)] text-[var(--fg)] hover:bg-slate-50"}`}>
                        이 트랙 선택
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => goStep(0)} className="mt-5 inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]"><ArrowLeft size={14} /> 자가체크로 돌아가기</button>
          </div>
        )}

        {/* ───────── PHASE 3 ───────── */}
        {step === 2 && track && (
          <div className="mt-5 grid gap-4 md:grid-cols-5">
            <div className="space-y-4 md:col-span-3">
              <div className="kt-card p-6">
                <h2 className="text-[15px] font-black">진출 국가 선택</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ONB_COUNTRIES.map((c) => {
                    const on = payCountries.includes(c.id);
                    const warn = missingCerts([c.id], certs).length > 0;
                    return (
                      <button key={c.id} onClick={() => setPayCountries((cs) => on ? cs.filter((x) => x !== c.id) : [...cs, c.id])}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${on ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>
                        {c.flag} {c.nameKo}{warn && on && <AlertTriangle size={12} className="text-amber-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="kt-card p-6">
                <h2 className="text-[15px] font-black">구독 방식</h2>
                <div className="mt-3 space-y-2">
                  <TermOption active={term === "monthly"} onClick={() => setTerm("monthly")} title="월 구독" desc="언제든 해지 가능 (해지 신청 후 익월 중단)" />
                  <TermOption active={term === "6month"} onClick={() => setTerm("6month")} title="6개월 약정" desc="20% 할인 · 6개월 합계 일시 결제 · 중도 해지 시 잔여 기간의 30% 위약금" />
                </div>
              </div>
            </div>

            {/* 요금 계산기 */}
            <div className="md:col-span-2">
              <div className="kt-card sticky top-20 p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-black">{MALL_TRACK_MAP[track].name}</span>
                  <button onClick={() => goStep(1)} className="text-[10px] font-semibold text-[var(--accent)] hover:underline">트랙 변경</button>
                </div>
                {quote && (
                  <div className="mt-3 space-y-1.5 text-[12px]">
                    <Row l={`기본료 ${won(quote.unitPrice)} × ${quote.countryCount}개국`} v={`${won(quote.base)}/월`} />
                    {quote.multiRate > 0 && <Row l={`다국가 할인 (${Math.round(quote.multiRate * 100)}%)`} v={`- ${won(quote.multiDiscount)}`} minus />}
                    {quote.termRate > 0 && <Row l={`6개월 약정 할인 (${Math.round(quote.termRate * 100)}%)`} v={`- ${won(quote.termDiscountAmount)}/월`} minus />}
                    <Row l="할인 적용 월 환산액" v={`${won(quote.monthly)}/월`} />
                    <div className="my-2 border-t border-[var(--border)]" />
                    <div className="flex items-end justify-between">
                      <span className="text-[12px] font-bold">{term === "6month" ? "6개월 합계 결제액" : "월 납부액"}</span>
                      <span className="text-[22px] font-black text-[var(--accent)]">{won(quote.payable)}</span>
                    </div>
                    {term === "6month" && <div className="text-right text-[10px] text-[var(--muted)]">월 환산 {won(quote.monthly)} × 6개월</div>}
                    <div className="text-right text-[10px] text-[var(--muted)]">VAT 별도 (+{won(quote.vat)})</div>
                  </div>
                )}
                {!user && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">결제하려면 로그인이 필요합니다.</p>}
                <button onClick={pay} disabled={busy || !payCountries.length} className="kt-btn kt-btn-primary mt-4 w-full py-2.5 text-[12px] disabled:opacity-50">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : !user ? <Lock size={14} /> : <CreditCard size={14} />}
                  {busy ? "결제 진행 중…" : !user ? "로그인하고 결제" : `${quote ? won(quote.payable) : ""} 결제하고 입점`}
                </button>
                <p className="mt-2 text-center text-[9px] text-[var(--muted)]">
                  {term === "6month" ? "6개월 합계 일시 결제 · 이후 6개월마다 자동결제." : "카드 등록 즉시 첫 달 결제 · 매월 자동결제."} 결제 후 상세 정보를 입력합니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ───────── PHASE 4 ───────── */}
        {step === 3 && track && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-[12px] font-semibold text-emerald-700">
              결제가 완료되었습니다. 미팅 전 브랜드·제품 정보를 입력해 주세요. (입력 정보는 1:1 온보딩 미팅 전략 수립에 활용됩니다)
            </div>
            <div className="kt-card p-6">
              <h2 className="text-[15px] font-black">① 브랜드 기본 정보</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="브랜드명 (국문) *" value={d.brandKo} onChange={(v) => setD({ ...d, brandKo: v })} />
                <Field label="브랜드명 (영문)" value={d.brandEn} onChange={(v) => setD({ ...d, brandEn: v })} />
                <Field label="사업자등록번호" value={d.bizNo} onChange={(v) => setD({ ...d, bizNo: v })} placeholder="000-00-00000" />
                <Field label="대표자명" value={d.repName} onChange={(v) => setD({ ...d, repName: v })} />
                <Field label="담당자명" value={d.managerName} onChange={(v) => setD({ ...d, managerName: v })} />
                <Field label="담당자 연락처 *" value={d.contact} onChange={(v) => setD({ ...d, contact: v })} placeholder="010-0000-0000" />
                <Field label="담당자 이메일 *" value={d.email} onChange={(v) => setD({ ...d, email: v })} placeholder="brand@company.com" />
                <Select label="미팅 선호 방식" value={d.meetingType} onChange={(v) => setD({ ...d, meetingType: v })} options={["대면", "Zoom", "Google Meet"]} />
              </div>
              <div className="mt-3">
                <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">미팅 가능 시간대</span>
                <div className="flex flex-wrap gap-2">
                  {["오전 9~12시", "오후 1~3시", "오후 3~6시"].map((s) => {
                    const on = slots.includes(s);
                    return <button key={s} onClick={() => setSlots((p) => on ? p.filter((x) => x !== s) : [...p, s])}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${on ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{s}</button>;
                  })}
                </div>
              </div>
              <p className="mt-3 text-[10px] text-[var(--muted)]">※ 사업자등록증·제품 사진은 1:1 미팅 시 제출하거나 담당자 이메일로 전달해 주세요.</p>
            </div>

            <div className="kt-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-black">② 제품 정보 <span className="text-[11px] font-semibold text-[var(--muted)]">(최대 {limit === 10 ? "무제한" : `${limit}개`})</span></h2>
                {products.length < limit && <button onClick={() => setProducts((p) => [...p, emptyProduct()])} className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent)]"><Plus size={13} /> 제품 추가</button>}
              </div>
              <div className="mt-4 space-y-4">
                {products.map((p, idx) => (
                  <div key={idx} className="rounded-xl border border-[var(--border)] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[12px] font-bold">제품 {idx + 1}</span>
                      {products.length > 1 && <button onClick={() => setProducts((ps) => ps.filter((_, i) => i !== idx))} className="text-rose-500"><Trash2 size={14} /></button>}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="제품명 (국문)" value={p.nameKo} onChange={(v) => setProducts((ps) => ps.map((x, i) => i === idx ? { ...x, nameKo: v } : x))} />
                      <Field label="제품명 (영문)" value={p.nameEn} onChange={(v) => setProducts((ps) => ps.map((x, i) => i === idx ? { ...x, nameEn: v } : x))} />
                      <Select label="카테고리" value={p.cat} onChange={(v) => setProducts((ps) => ps.map((x, i) => i === idx ? { ...x, cat: v } : x))} options={PRODUCT_CATS} />
                      <Field label="소비자가 (원)" value={p.price} onChange={(v) => setProducts((ps) => ps.map((x, i) => i === idx ? { ...x, price: v } : x))} />
                      <Field label="원가 (원)" value={p.cost} onChange={(v) => setProducts((ps) => ps.map((x, i) => i === idx ? { ...x, cost: v } : x))} />
                      <Field label="포장 후 무게 (g)" value={p.packWeight} onChange={(v) => setProducts((ps) => ps.map((x, i) => i === idx ? { ...x, packWeight: v } : x))} />
                    </div>
                    <textarea value={p.desc} onChange={(e) => setProducts((ps) => ps.map((x, i) => i === idx ? { ...x, desc: e.target.value } : x))}
                      rows={2} placeholder="제품 상세 설명 (성분·효능·사용법)"
                      className="mt-3 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[12px]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="kt-card p-6">
              <h2 className="text-[15px] font-black">③ 정산 계좌</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Select label="은행" value={d.bank} onChange={(v) => setD({ ...d, bank: v })} options={BANKS} />
                <Field label="계좌번호" value={d.acct} onChange={(v) => setD({ ...d, acct: v })} />
                <Field label="예금주" value={d.holder} onChange={(v) => setD({ ...d, holder: v })} />
              </div>
            </div>

            <button onClick={submitDetails} disabled={busy} className="kt-btn kt-btn-primary w-full py-3 text-[13px] disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} 제출하고 신청 완료
            </button>
          </div>
        )}

        {/* ───────── PHASE 6 완료 ───────── */}
        {step === 4 && completed && (
          <div className="mt-6">
            <div className="kt-card p-7 text-center">
              <PartyPopper className="mx-auto text-pink-500" size={44} />
              <h2 className="mt-3 text-[22px] font-black">신청이 완료되었습니다!</h2>
              <div className="mt-3 flex flex-wrap justify-center gap-2 text-[12px]">
                <span className="rounded-full bg-[var(--accent-light)] px-3 py-1 font-bold text-[var(--accent)]">{MALL_TRACK_MAP[completed.track].name}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">진출 국가: {completed.countries.map((c) => ONB_COUNTRY_MAP[c]?.nameKo).join(", ")}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">예비 {completed.grade}등급</span>
              </div>
              <div className="mx-auto mt-5 max-w-md text-left text-[12px] text-[var(--muted)]">
                <div className="font-bold text-[var(--fg)]">다음 단계 안내</div>
                <ol className="mt-1 list-decimal space-y-1 pl-5">
                  <li>담당 매니저가 영업일 1~2일 이내 연락드립니다.</li>
                  {completed.missing.length > 0 && <li>인증 미비 항목 가이드를 담당자 이메일({completed.email})로 안내드립니다.</li>}
                  <li>1:1 온보딩 미팅 일정을 조율해드립니다. (약 60~90분)</li>
                </ol>
              </div>
              <div className="mx-auto mt-5 max-w-md rounded-xl bg-slate-50 p-4 text-left">
                <div className="text-[12px] font-bold">전체 온보딩 예상 일정</div>
                <div className="mt-2 space-y-1.5">
                  {ONB_TIMELINE.map((t) => (
                    <div key={t.d} className="flex items-center gap-3 text-[11px]">
                      <span className="w-12 shrink-0 font-mono font-bold text-[var(--accent)]">{t.d}</span>
                      <span className="text-[var(--muted)]">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex justify-center gap-2">
                <Link href="/mypage" className="kt-btn kt-btn-primary px-5 py-2.5 text-[12px]">마이페이지</Link>
                <Link href="/explorer" className="kt-btn kt-btn-outline px-5 py-2.5 text-[12px]">홈으로</Link>
              </div>
            </div>
          </div>
        )}

        {!ready && step === 0 && !gradeInfo && (
          <p className="mt-4 text-center text-[11px] text-[var(--muted)]">불러오는 중…</p>
        )}
      </div>

      {/* 비추천 트랙 확인 모달 */}
      {confirmTrack && gradeInfo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setConfirmTrack(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <AlertTriangle className="mx-auto text-amber-500" size={32} />
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--fg)]">
              현재 예비 {gradeInfo.label} 기준 추천 트랙은 <b>{MALL_TRACK_MAP[gradeInfo.recommended].name}</b> 입니다.<br />
              그래도 <b>{MALL_TRACK_MAP[confirmTrack].name}</b>으로 진행하시겠습니까?
            </p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => { setConfirmTrack(null); }} className="kt-btn kt-btn-outline flex-1 py-2 text-[12px]">취소 — 추천 트랙</button>
              <button onClick={confirmChoose} className="kt-btn kt-btn-primary flex-1 py-2 text-[12px]">네, 진행</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function CertRow({ flag, nameKo, cert, value, onChange }: { flag: string; nameKo: string; cert: { id: string; label: string; options: string[]; tip?: string }; value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-[12px] font-semibold">{flag} {nameKo} — {cert.label}</span>
      <div className="ml-auto flex gap-1">
        {cert.options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${value === o ? "bg-[var(--accent)] text-white" : "bg-white text-[var(--muted)] border border-[var(--border)]"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}

function TermOption({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <button onClick={onClick} className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left ${active ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)]"}`}>
      <span className={`mt-0.5 grid h-4 w-4 place-items-center rounded-full border-2 ${active ? "border-[var(--accent)]" : "border-slate-300"}`}>{active && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}</span>
      <span><span className="text-[13px] font-bold">{title}</span><span className="mt-0.5 block text-[11px] text-[var(--muted)]">{desc}</span></span>
    </button>
  );
}

function Row({ l, v, minus }: { l: string; v: string; minus?: boolean }) {
  return <div className="flex justify-between"><span className="text-[var(--muted)]">{l}</span><span className={minus ? "text-rose-500" : "font-semibold"}>{v}</span></div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--fg)]" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] text-[var(--fg)]">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<PageShell><div className="py-12 text-center text-[12px] text-[var(--muted)]">불러오는 중…</div></PageShell>}>
      <OnboardingInner />
    </Suspense>
  );
}

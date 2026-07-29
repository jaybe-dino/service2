"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag, Check, Lock, Loader2, CreditCard, ArrowRight, ArrowLeft,
  Plus, Trash2, AlertTriangle, PartyPopper, Star,
} from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import InquiryModal from "@/components/ktrend/InquiryModal";
import { usePlan } from "@/components/ktrend/PlanContext";
import { ONBOARDING, MALL_TRACKS, MALL_TRACK_MAP, PAY_TEST_MODE, type MallTrackId } from "@/data/ktrend/meta";
import {
  SELF_CHECK_QUESTIONS, ONB_COUNTRIES, ONB_COUNTRY_MAP, COMMON_CERT,
  gradeFromChecks, missingCerts, computeQuote, ONB_TIMELINE, GRADE_GUIDE,
  type SubTerm, type GradeInfo,
} from "@/lib/onboarding";

const won = (n: number) => "₩" + Math.round(n).toLocaleString();
// 정보입력은 결제 후 마이페이지에서 진행 — 온보딩 스텝은 결제완료까지.
const STEPS = ["자가체크", "트랙 선택", "국가·결제", "결제완료"];
const PRODUCT_CATS = ["스킨케어", "색조", "헤어케어", "이너뷰티", "푸드", "기타"];
const BANKS = ["국민", "신한", "우리", "하나", "농협", "기업", "카카오뱅크", "토스뱅크", "SC제일", "씨티", "기타"];
const productLimit = (t: MallTrackId) => (t === "live" ? 5 : 10);

interface UploadedFile { id: string; filename: string }
interface Product {
  nameKo: string; nameEn: string; cat: string; price: string; cost: string;
  netWeight: string; netUnit: string; packWeight: string; w: string; h: string; d: string; desc: string;
  cert?: UploadedFile | null; // 제품 인증서류(선택)
}
const emptyProduct = (): Product => ({ nameKo: "", nameEn: "", cat: PRODUCT_CATS[0], price: "", cost: "", netWeight: "", netUnit: "g", packWeight: "", w: "", h: "", d: "", desc: "", cert: null });

async function uploadOnbFile(file: File, kind: string, productIndex?: number): Promise<UploadedFile | null> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("kind", kind);
  if (productIndex != null) fd.append("productIndex", String(productIndex));
  const r = await fetch("/api/onboarding/upload", { method: "POST", body: fd });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) { alert(d?.error ?? "업로드 실패"); return null; }
  return { id: d.id, filename: d.filename };
}

function OnboardingInner() {
  const { user, ready } = usePlan();
  const router = useRouter();

  const [step, setStep] = useState(1); // 진입 시 트랙 선택부터 (자가진단은 별도 버튼)
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  // PHASE 1 (자가체크 서브 스텝: 0 판매경험 · 1 진출국가 · 2 인증현황)
  const [p1, setP1] = useState(0);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [certs, setCerts] = useState<Record<string, string>>({});
  const [referral, setReferral] = useState("");
  const [gradeInfo, setGradeInfo] = useState<GradeInfo | null>(null);

  // PHASE 2/3
  const [track, setTrack] = useState<MallTrackId | null>(null);
  const [confirmTrack, setConfirmTrack] = useState<MallTrackId | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [testTok, setTestTok] = useState(""); // 🧪 라이브 결제 테스트 토큰(URL ?test=)
  const [payCountries, setPayCountries] = useState<string[]>([]);
  const [term, setTerm] = useState<SubTerm>("monthly");
  const [card, setCard] = useState({ cardNo: "", expMonth: "", expYear: "", idNo: "", cardPw: "" });
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoMsg, setPromoMsg] = useState("");
  const [paidFree, setPaidFree] = useState(false); // 결제완료 화면: 프로모 첫 결제 무료 여부

  // PHASE 4
  const [d, setD] = useState({
    brandKo: "", brandEn: "", bizNo: "", repName: "", managerName: "",
    contact: "", email: "", meetingType: "Zoom", note: "",
    bank: BANKS[0], acct: "", holder: "",
  });
  const [slots, setSlots] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([emptyProduct()]);
  const [bizRegFile, setBizRegFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState<string | null>(null); // 'biz' | `p${idx}`
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

    // 딥링크: 메인의 '자가체크 시작' → 자가진단(step 0)으로 진입. 트랙 버튼 → 해당 트랙 프리셀렉트.
    if (sp.get("step") === "check" || sp.get("self") === "1" || sp.get("selfcheck") === "1") {
      setStep(0); setGradeInfo(null); setP1(0);
    }
    const tp = sp.get("track");
    if (tp && (MALL_TRACK_MAP as Record<string, unknown>)[tp]) setTrack(tp as MallTrackId);

    // 🧪 결제 테스트 토큰 캡처(URL ?test= → 세션 유지)
    const tk = sp.get("test");
    if (tk) { try { sessionStorage.setItem("pay.test", tk); } catch {} setTestTok(tk); }
    else { try { const s = sessionStorage.getItem("pay.test"); if (s) setTestTok(s); } catch {} }

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
        if (det.bizRegFile) setBizRegFile(det.bizRegFile);
      }
      // 결제 완료 사용자만 마이페이지로(정보 관리는 마이페이지에서). 미결제(자가체크/구제출) 사용자는
      // 트랙선택→결제 플로우를 계속 진행할 수 있어야 하므로 바운스하지 않는다.
      if (paid || app.status === "paid") {
        router.replace("/mypage?tab=basic");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로그인 정보 프리필
  useEffect(() => {
    if (user) setD((p) => ({ ...p, brandKo: p.brandKo || user.brand || user.company || "",
      managerName: p.managerName || user.name || "", email: p.email || user.email || "" }));
  }, [user]);

  if (!ONBOARDING.enabled) return null;

  const yesCount = SELF_CHECK_QUESTIONS.filter((q) => checks[q.id]).length;
  const quote = track ? computeQuote(track, Math.max(1, payCountries.length), term) : null;
  // 첫 결제액(프로모 반영): 6개월+프로모 → 첫 달 제외(5개월), 월간+프로모 → 첫 달 무료(0), 없으면 전액.
  const firstChargeAmt = quote ? (promoApplied ? (term === "6month" ? quote.monthly * 5 : 0) : quote.payable) : 0;
  // ?test=<PAY_TEST_TOKEN> 이면 실제 청구가 1/10000(최소 100원)로 축소됨 — 화면에도 반영.
  const isTest = !!testTok;
  const tReduce = (n: number) => Math.max(100, Math.round(n / 10000));
  const displayCharge = firstChargeAmt === 0 ? 0 : (isTest ? tReduce(firstChargeAmt) : firstChargeAmt);
  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoMsg("");
    const r = await fetch("/api/promo/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: promoCode }) });
    const d = await r.json().catch(() => ({}));
    if (d.ok) { setPromoApplied(true); setPromoMsg("프로모 코드가 적용됐습니다."); }
    else { setPromoApplied(false); setPromoMsg(d.reason || "유효하지 않은 코드입니다."); }
  };

  // ── PHASE 1 → 결과 ──
  const seeResult = async () => {
    if (!countries.length) { setMsg("진출 희망 국가를 1개 이상 선택해 주세요."); return; }
    const g = gradeFromChecks(yesCount);
    setGradeInfo(g);
    setTrack((t) => t ?? g.recommended);
    setPayCountries(countries);
    setMsg("");
    scrollTop(); // 결과를 별도 화면처럼 상단부터 보여줌
    // 서버 저장(로그인 시)
    if (user) {
      await fetch("/api/onboarding/apply", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "self_check", checks, countries, certs, referral, track: g.recommended }) }).catch(() => {});
    }
  };

  // ── PHASE 2 → 트랙 확정 ──
  const chooseTrack = (id: MallTrackId) => {
    if (MALL_TRACK_MAP[id].inquiry) { setTrack(id); setInquiryOpen(true); return; } // 금액 문의 트랙
    if (gradeInfo && id !== gradeInfo.recommended) { setConfirmTrack(id); return; }
    setTrack(id); goStep(2);
  };
  const confirmChoose = () => { if (confirmTrack) { setTrack(confirmTrack); setConfirmTrack(null); goStep(2); } };

  // ── PHASE 3 → 결제 ──
  // 정기결제(카드 등록) — NICEpay V2는 호스팅 빌링창이 없어 카드폼→서버 암호화. 프로모 시 첫 주기 무료.
  const pay = async () => {
    if (!track) return;
    if (!user) { router.push("/login?next=/onboarding"); return; }
    if (!payCountries.length) { setMsg("진출 국가를 1개 이상 선택해 주세요."); return; }
    const cardNo = card.cardNo.replace(/\D/g, "");
    if (cardNo.length < 15 || card.expMonth.length !== 2 || card.expYear.length !== 2 || (card.idNo.length !== 6 && card.idNo.length !== 10) || card.cardPw.length !== 2) {
      setMsg("카드 정보를 확인해 주세요 (카드번호·유효기간 MM/YY·생년월일6 또는 사업자10·카드비밀번호 앞2자리)."); return;
    }
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/payment/subscribe-mall", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, countries: payCountries, term, promoCode, test: testTok,
          card: { cardNo, expYear: card.expYear, expMonth: card.expMonth, idNo: card.idNo, cardPw: card.cardPw } }) });
      const data = await res.json();
      setBusy(false);
      if (!res.ok || !data.ok) {
        if (data?.configured === false) { setPaidFree(false); goStep(3); return; } // 결제 모듈 미설정 → 완료 화면
        setMsg(data?.error ?? "결제에 실패했습니다."); return;
      }
      // 결제 완료 → '결제완료' 화면을 한 번 보여주고, 버튼으로 마이페이지 기본정보 입력으로 이동
      setPaidFree(!!data.firstFree);
      goStep(3);
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
          settlement: { bank: d.bank, acct: d.acct, holder: d.holder }, bizRegFile, note: d.note }) });
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
        {step === 0 ? (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-light)] px-3 py-1.5 text-[12px] font-bold text-[var(--accent)]">
            🔎 자가진단 — 우리 브랜드에 맞는 트랙 찾기
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-1 overflow-x-auto pb-1">
            {STEPS.slice(1).map((s, i) => {
              const st = i + 1; // 실제 step 값 (트랙선택=1 …)
              return (
                <div key={s} className="flex shrink-0 items-center">
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                    st === step ? "bg-[var(--accent)] text-white" : st < step ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                    {st < step ? <Check size={12} /> : <span>{st}</span>} {s}
                  </div>
                  {i < STEPS.length - 2 && <div className="mx-0.5 h-px w-4 bg-slate-200" />}
                </div>
              );
            })}
          </div>
        )}

        {PAY_TEST_MODE && <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">⚠️ 결제 테스트 모드 — 모든 트랙 결제 금액이 ₩1,000으로 청구됩니다.</p>}
        {msg && <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700">{msg}</p>}

        {/* ───────── PHASE 1: 자가체크 (3단계 페이징) ───────── */}
        {step === 0 && !gradeInfo && (
          <div className="mt-5 space-y-4">
            <button onClick={() => goStep(1)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--muted)] hover:text-[var(--fg)]">
              <ArrowLeft size={14} /> 트랙 목록으로
            </button>
            {/* 서브 진행 표시 */}
            <div className="flex items-center gap-1.5">
              {["판매 경험", "진출 국가", "인증 현황"].map((label, i) => (
                <div key={label} className={`flex-1 rounded-full px-2 py-1 text-center text-[10px] font-bold ${
                  i === p1 ? "bg-[var(--accent)] text-white" : i < p1 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                  {i + 1}. {label}
                </div>
              ))}
            </div>

            {/* 1단계: 판매 경험 5대 지표 */}
            {p1 === 0 && (
              <div className="kt-card p-6">
                <h2 className="text-[15px] font-black">해외 판매 경험을 체크해주세요</h2>
                <p className="mt-1 text-[12px] text-[var(--muted)]">해당하는 항목을 선택하세요. 많이 해당할수록 상위 등급으로 진단됩니다.</p>
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
            )}

            {/* 2단계: 진출 희망 국가 */}
            {p1 === 1 && (
              <div className="kt-card p-6">
                <h2 className="text-[15px] font-black">진출 희망 국가를 선택해주세요</h2>
                <p className="mt-1 text-[12px] text-[var(--muted)]">1개 이상 선택하면 다음 단계로 넘어갈 수 있어요.</p>
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
              </div>
            )}

            {/* 3단계: 국가별 인증 현황 */}
            {p1 === 2 && (
              <div className="kt-card p-6">
                <h2 className="text-[15px] font-black">선택한 국가의 인증 현황</h2>
                <p className="mt-1 text-[12px] text-[var(--muted)]">아직 준비 안 된 항목은 &lsquo;없음/모름&rsquo;으로 두셔도 됩니다. 신청 후 맞춤 가이드를 드려요.</p>
                <div className="mt-4 space-y-3">
                  {countries.flatMap((cid) => ONB_COUNTRY_MAP[cid]?.certs.map((cert) => ({ cid, cert })) ?? []).map(({ cid, cert }) => (
                    <CertRow key={cert.id} flag={ONB_COUNTRY_MAP[cid].flag} nameKo={ONB_COUNTRY_MAP[cid].nameKo}
                      cert={cert} value={certs[cert.id]} onChange={(v) => setCerts((s) => ({ ...s, [cert.id]: v }))} />
                  ))}
                  <CertRow flag="🌐" nameKo="전 국가 공통" cert={COMMON_CERT} value={certs[COMMON_CERT.id]}
                    onChange={(v) => setCerts((s) => ({ ...s, [COMMON_CERT.id]: v }))} />
                </div>
              </div>
            )}

            {/* 예상 등급 미리보기 — 마지막 단계에서만 노출 */}
            {p1 === 2 && (
              <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg bg-[var(--accent-light)] px-3 py-2 text-[12px]">
                <span className="text-[var(--muted)]">지금까지 <b className="text-[var(--fg)]">{yesCount}/5</b> 선택 →</span>
                <span className="rounded-md px-2 py-0.5 font-black text-white" style={{ background: GRADE_GUIDE.find((g) => g.grade === gradeFromChecks(yesCount).grade)?.color }}>
                  예상 {gradeFromChecks(yesCount).grade}등급
                </span>
                <span className="text-[var(--muted)]">· 추천 {MALL_TRACK_MAP[gradeFromChecks(yesCount).recommended].name}</span>
              </div>
            )}

            {/* 이전 / 다음 · 결과 확인 */}
            <div className="flex gap-2">
              {p1 > 0 && (
                <button onClick={() => { setP1(p1 - 1); scrollTop(); }} className="kt-btn kt-btn-outline flex-1 py-3 text-[13px]">
                  <ArrowLeft size={15} /> 이전
                </button>
              )}
              {p1 < 2 ? (
                <button onClick={() => { if (p1 === 1 && !countries.length) { setMsg("진출 국가를 1개 이상 선택해 주세요."); return; } setMsg(""); setP1(p1 + 1); scrollTop(); }}
                  className="kt-btn kt-btn-primary flex-[2] py-3 text-[13px] disabled:opacity-50" disabled={p1 === 1 && !countries.length}>
                  다음 <ArrowRight size={15} />
                </button>
              ) : (
                <button onClick={seeResult} disabled={!countries.length}
                  className="kt-btn kt-btn-primary flex-[2] py-3 text-[13px] disabled:opacity-50">
                  결과 확인하기 <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ───────── PHASE 1 결과 — 별도 화면(크게) ───────── */}
        {step === 0 && gradeInfo && (() => {
          const g = GRADE_GUIDE.find((x) => x.grade === gradeInfo.grade)!;
          const rec = MALL_TRACK_MAP[gradeInfo.recommended];
          const missing = missingCerts(countries, certs);
          return (
            <div className="mt-6">
              <div className="rounded-2xl border-2 border-[var(--accent)] bg-white p-7 text-center">
                <div className="text-[12px] font-semibold text-[var(--muted)]">자가체크 결과 · 우리 브랜드의 예비 등급</div>
                {/* 큰 등급 배지 */}
                <div className="mx-auto mt-3 grid h-28 w-28 place-items-center rounded-3xl text-[56px] font-black leading-none text-white shadow-lg"
                  style={{ background: g.color }}>
                  {gradeInfo.grade}
                </div>
                <h2 className="mt-4 text-[22px] font-black">우리 브랜드는 지금 &lsquo;{g.short}&rsquo; 단계예요</h2>
                <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-[var(--muted)]">
                  5개 항목 중 <b className="text-[var(--fg)]">{yesCount}개</b>에 해당해 <b style={{ color: g.color }}>{gradeInfo.grade}등급</b>으로 진단됐어요.
                  이 단계에는 아래 트랙이 가장 잘 맞아요. 부담 없이 시작해서 성장하면 언제든 상위 트랙으로 올릴 수 있어요.
                </p>

                {/* 큰 C → B → A → S 스케일 */}
                <div className="mx-auto mt-6 flex max-w-lg items-stretch gap-2">
                  {GRADE_GUIDE.map((x) => {
                    const on = x.grade === gradeInfo.grade;
                    return (
                      <div key={x.grade} className={`flex-1 rounded-xl border-2 py-3 ${on ? "text-white" : "border-transparent bg-slate-50 text-[var(--muted)]"}`}
                        style={on ? { background: x.color, borderColor: x.color } : {}}>
                        <div className="text-[20px] font-black leading-none">{x.grade}</div>
                        <div className="mt-1 text-[10px] font-semibold">{x.short}</div>
                      </div>
                    );
                  })}
                </div>

                {/* 추천 트랙 큰 카드 */}
                <div className="mx-auto mt-6 max-w-md rounded-2xl bg-pink-50 p-5 text-left">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-pink-600"><Star size={13} /> 추천 트랙</div>
                  <div className="mt-1 flex items-end justify-between">
                    <span className="text-[20px] font-black">{rec.name}</span>
                    <span className="text-[15px] font-black text-pink-500">{rec.priceLabel}{!rec.inquiry && <span className="text-[11px] font-normal text-[var(--muted)]">/월</span>}</span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">{rec.tagline} — {g.note}</p>
                </div>

                {missing.length > 0 && (
                  <div className="mx-auto mt-4 max-w-md rounded-xl bg-amber-50 px-4 py-3 text-left text-[11px] leading-relaxed text-amber-700">
                    아직 준비되지 않은 인증이 있어요. 걱정 마세요 — 신청 완료 후 <b>항목별 맞춤 가이드</b>를 보내드립니다.<br />
                    <span className="text-amber-600">{missing.map((m) => m.label).join(", ")}</span>
                  </div>
                )}

                <div className="mx-auto mt-6 flex max-w-md flex-col gap-2 sm:flex-row">
                  <button onClick={() => { setGradeInfo(null); setP1(0); scrollTop(); }} className="kt-btn kt-btn-outline flex-1 py-2.5 text-[12px]">
                    <ArrowLeft size={14} /> 다시 체크하기
                  </button>
                  <button onClick={() => goStep(1)} className="kt-btn kt-btn-primary flex-1 py-2.5 text-[12px]">
                    틱톡샵 입점 트랙 선택 <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ───────── PHASE 2 ───────── */}
        {step === 1 && (
          <div className="mt-5">
            {gradeInfo ? (
              <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="rounded-full bg-[var(--accent)] px-3 py-1 font-bold text-white">예비 {gradeInfo.label}</span>
                <span className="text-[var(--muted)]">추천 트랙은 <b className="text-pink-600">{MALL_TRACK_MAP[gradeInfo.recommended].name}</b> 입니다. 자유롭게 선택하세요.</span>
                <button onClick={() => { setGradeInfo(null); setP1(0); goStep(0); }} className="ml-auto text-[11px] font-semibold text-[var(--accent)] hover:underline">자가진단 다시 하기</button>
              </div>
            ) : (
              <button onClick={() => { setP1(0); goStep(0); }}
                className="mb-4 flex w-full items-center gap-3 rounded-xl border border-[var(--accent)] bg-[var(--accent-light)] px-4 py-3 text-left transition-colors hover:bg-[var(--accent-light)]/70">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white">🔎</span>
                <span className="flex-1">
                  <span className="block text-[13px] font-bold text-[var(--fg)]">어느 트랙이 맞을지 모르겠다면? 1분 자가진단</span>
                  <span className="block text-[11px] text-[var(--muted)]">예비 등급(S·A·B·C)과 추천 트랙을 진단해드려요.</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-[var(--accent)]" />
              </button>
            )}
            <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
              {MALL_TRACKS.map((t) => {
                const rec = gradeInfo?.recommended === t.id;
                const dim = !!gradeInfo && !rec; // 추천 외 트랙은 회색(비강조)
                return (
                  <div key={t.id} className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white transition ${rec ? "border-pink-300 shadow-lg ring-2 ring-pink-200" : "border-[var(--border)]"} ${dim ? "opacity-75 grayscale hover:opacity-100 hover:grayscale-0" : ""}`}>
                    {rec && <div className="bg-pink-500 py-1 text-center text-[10px] font-black text-white">★ 추천 트랙</div>}
                    <div className={`px-5 pt-5 pb-3 ${t.dark ? "bg-[#0b0b0c] text-white" : ""}`}>
                      <div className="text-[17px] font-black">{t.name}</div>
                      <div className={`mt-0.5 text-[11px] ${t.dark ? "text-white/70" : "text-[var(--muted)]"}`}>{t.tagline}</div>
                    </div>
                    <div className="border-t border-[var(--border)] px-5 py-3">
                      <div className="flex items-end gap-1">
                        <span className="text-[22px] font-black text-pink-500">{t.priceLabel}</span>
                        {!t.inquiry && <span className="mb-1 text-[11px] text-[var(--muted)]">/월</span>}
                      </div>
                      <div className="text-[11px] text-[var(--muted)]">+ {t.commissionLabel}</div>
                      {t.minTermNote && <div className="mt-1 inline-block rounded bg-[var(--accent-light)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)]">{t.minTermNote}</div>}
                    </div>
                    <ul className="flex-1 space-y-1.5 border-t border-[var(--border)] px-5 py-3">
                      {t.features.map((f) => <li key={f} className="flex gap-1.5 text-[11px]"><Check size={13} className="mt-0.5 shrink-0 text-pink-500" /> {f}</li>)}
                    </ul>
                    <div className="px-5 pb-5">
                      <button onClick={() => chooseTrack(t.id)} className={`w-full rounded-lg py-2.5 text-[12px] font-bold ${rec ? "bg-pink-500 text-white hover:bg-pink-600" : "border border-[var(--fg)] text-[var(--fg)] hover:bg-slate-50"}`}>
                        {t.inquiry ? "금액 문의하기" : "이 트랙 선택"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
                  <TermOption active={term === "6month"} onClick={() => setTerm("6month")} title="6개월 약정"
                    desc={track && MALL_TRACK_MAP[track]?.fixedPrice ? "6개월 합계 일시 결제 · 중도 해지 시 잔여 기간의 30% 위약금" : "20% 할인 · 6개월 합계 일시 결제 · 중도 해지 시 잔여 기간의 30% 위약금"} />
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
                    <Row l={track && MALL_TRACK_MAP[track]?.fixedPrice ? "기본료 (고정 · 국가수 무관)" : `기본료 ${won(quote.unitPrice)} × ${quote.countryCount}개국`} v={`${won(quote.base)}/월`} />
                    {quote.multiRate > 0 && <Row l={`다국가 할인 (${Math.round(quote.multiRate * 100)}%)`} v={`- ${won(quote.multiDiscount)}`} minus />}
                    {quote.termRate > 0 && <Row l={`6개월 약정 할인 (${Math.round(quote.termRate * 100)}%)`} v={`- ${won(quote.termDiscountAmount)}/월`} minus />}
                    <Row l="할인 적용 월 환산액" v={`${won(quote.monthly)}/월`} />
                    <div className="my-2 border-t border-[var(--border)]" />
                    <div className="flex items-end justify-between">
                      <span className="text-[12px] font-bold">이번 결제액</span>
                      <span className="flex items-end gap-1.5">
                        {promoApplied && <span className="mb-0.5 text-[11px] text-[var(--muted)] line-through">{won(isTest ? tReduce(quote.payable) : quote.payable)}</span>}
                        <span className="text-[22px] font-black text-[var(--accent)]">{won(displayCharge)}</span>
                      </span>
                    </div>
                    {isTest && <div className="text-right text-[10px] font-bold text-amber-600">🧪 테스트 결제 — 실제 청구 {won(displayCharge)} (정가의 1/10000)</div>}
                    {promoApplied && (
                      <div className="text-right text-[10px] font-semibold text-emerald-600">
                        {term === "6month" ? "프로모 적용 · 첫 달 제외(5개월)" : "프로모 적용 · 첫 달 무료"} · 다음 주기부터 {won(quote.payable)}
                      </div>
                    )}
                    {term === "6month" && <div className="text-right text-[10px] text-[var(--muted)]">월 환산 {won(quote.monthly)} × {promoApplied ? "5" : "6"}개월</div>}
                    <div className="text-right text-[10px] text-[var(--muted)]">VAT 포함</div>
                  </div>
                )}
                {/* 카드 등록(정기결제) + 프로모 코드 */}
                {user && (
                  <div className="mt-4 space-y-2 rounded-lg border border-[var(--border)] p-3">
                    <div className="text-[11px] font-bold">카드 등록 (정기결제)</div>
                    <input inputMode="numeric" maxLength={19} value={card.cardNo.replace(/(.{4})/g, "$1 ").trim()}
                      onChange={(e) => setCard((p) => ({ ...p, cardNo: e.target.value.replace(/\D/g, "").slice(0, 16) }))}
                      placeholder="카드번호 0000 0000 0000 0000" className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] tracking-wider" />
                    <div className="grid grid-cols-3 gap-2">
                      <input inputMode="numeric" maxLength={2} value={card.expMonth} onChange={(e) => setCard((p) => ({ ...p, expMonth: e.target.value.replace(/\D/g, "") }))} placeholder="MM" className="rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px]" />
                      <input inputMode="numeric" maxLength={2} value={card.expYear} onChange={(e) => setCard((p) => ({ ...p, expYear: e.target.value.replace(/\D/g, "") }))} placeholder="YY" className="rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px]" />
                      <input inputMode="numeric" type="password" maxLength={2} value={card.cardPw} onChange={(e) => setCard((p) => ({ ...p, cardPw: e.target.value.replace(/\D/g, "") }))} placeholder="비번앞2" className="rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px]" />
                    </div>
                    <input inputMode="numeric" maxLength={10} value={card.idNo} onChange={(e) => setCard((p) => ({ ...p, idNo: e.target.value.replace(/\D/g, "") }))} placeholder="생년월일 6자리(개인) / 사업자번호 10자리(법인)" className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px]" />
                    <div className="flex gap-2">
                      <input value={promoCode} onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoApplied(false); setPromoMsg(""); }} placeholder="프로모션 코드 (선택)" className="flex-1 rounded-md border border-dashed border-[var(--accent)]/50 px-2.5 py-2 text-[12px]" />
                      <button type="button" onClick={applyPromo} disabled={!promoCode.trim()} className="shrink-0 rounded-md border border-[var(--accent)] px-3 py-2 text-[11px] font-bold text-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-40">{promoApplied ? "적용됨" : "적용"}</button>
                    </div>
                    {promoMsg && <div className={`text-[10px] font-semibold ${promoApplied ? "text-emerald-600" : "text-rose-500"}`}>{promoMsg}</div>}
                    <p className="text-[9px] text-[var(--muted)]">카드정보는 저장하지 않으며 결제사(NICEpay) 정기결제 규격으로 즉시 암호화됩니다.</p>
                  </div>
                )}
                {!user && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">결제하려면 로그인이 필요합니다.</p>}
                <button onClick={pay} disabled={busy || !payCountries.length} className="kt-btn kt-btn-primary mt-4 w-full py-2.5 text-[12px] disabled:opacity-50">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : !user ? <Lock size={14} /> : <CreditCard size={14} />}
                  {busy ? "결제 진행 중…" : !user ? "로그인하고 결제" : firstChargeAmt === 0 ? "무료로 입점 시작" : `${won(displayCharge)} 결제하고 입점`}
                </button>
                <p className="mt-2 text-center text-[9px] text-[var(--muted)]">
                  {term === "6month" ? "6개월 합계 일시 결제 · 이후 6개월마다 자동결제." : "카드 등록 즉시 첫 달 결제 · 매월 자동결제."} 결제 후 상세 정보를 입력합니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ───────── PHASE 4 ───────── */}
        {/* ───────── 결제 완료 (한 번 노출 → 버튼으로 마이페이지 기본정보 입력) ───────── */}
        {step === 3 && (
          <div className="mt-6">
            <div className="kt-card p-7 text-center">
              <PartyPopper className="mx-auto text-pink-500" size={44} />
              <h2 className="mt-3 text-[22px] font-black">결제가 완료되었습니다!</h2>
              <p className="mt-2 text-[13px] text-[var(--muted)]">{paidFree ? "프로모 코드가 적용되어 첫 결제가 처리되었습니다." : "틱톡샵 입점 결제가 정상적으로 처리되었습니다."}</p>
              {track && (
                <div className="mt-3 flex flex-wrap justify-center gap-2 text-[12px]">
                  <span className="rounded-full bg-[var(--accent-light)] px-3 py-1 font-bold text-[var(--accent)]">{MALL_TRACK_MAP[track].name}</span>
                  {payCountries.length > 0 && <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">진출 국가: {payCountries.map((c) => ONB_COUNTRY_MAP[c]?.nameKo ?? c).join(", ")}</span>}
                </div>
              )}
              <div className="mx-auto mt-5 max-w-md rounded-xl bg-slate-50 p-4 text-left text-[12px] text-[var(--muted)]">
                <div className="font-bold text-[var(--fg)]">다음 단계</div>
                <p className="mt-1 leading-relaxed">마이페이지 <b className="text-[var(--fg)]">입점 기본정보</b>에서 브랜드·사업자·정산 정보를 입력하고, <b className="text-[var(--fg)]">제품 서류·정보</b>에서 인증서·라벨/실물 사진을 등록해 주세요. 입력 정보는 1:1 온보딩 미팅 전략 수립에 활용됩니다.</p>
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <button onClick={() => router.push("/mypage?tab=basic")} className="kt-btn kt-btn-primary px-5 py-2.5 text-[13px]">기본정보 입력하러 가기 <ArrowRight size={15} /></button>
                <Link href="/mypage" className="kt-btn kt-btn-outline px-5 py-2.5 text-[13px]">마이페이지</Link>
              </div>
            </div>
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

      {/* Onboarding Track 금액 문의 모달 */}
      {inquiryOpen && (
        <InquiryModal
          kind="tiktokshop"
          context={`Onboarding Track 금액 문의${gradeInfo ? ` · 예비 ${gradeInfo.grade}등급` : ""}${payCountries.length ? ` · 진출국가 ${payCountries.join(",")}` : ""}`}
          onClose={() => setInquiryOpen(false)}
        />
      )}

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

function FileField({ label, value, busy, onPick, onClear }: { label: string; value: UploadedFile | null; busy: boolean; onPick: (f: File) => void; onClear: () => void }) {
  return (
    <div>
      <span className="mb-1 block text-[11px] font-semibold text-[var(--muted)]">{label}</span>
      {value ? (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-slate-50 px-3 py-2 text-[12px]">
          <a href={`/api/onboarding/file/${value.id}`} target="_blank" rel="noreferrer" className="truncate font-semibold text-[var(--accent)] hover:underline">{value.filename}</a>
          <button type="button" onClick={onClear} className="ml-auto shrink-0 text-[11px] font-semibold text-rose-500 hover:underline">삭제</button>
        </div>
      ) : (
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.currentTarget.value = ""; }}
          className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-[11px] file:mr-2 file:rounded file:border-0 file:bg-[var(--accent-light)] file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-[var(--accent)] disabled:opacity-50"
        />
      )}
      {busy && <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--muted)]"><Loader2 size={11} className="animate-spin" /> 업로드 중…</span>}
    </div>
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

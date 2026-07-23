"use client";

// GloveK 틱톡샵 멀티몰 입점 상담 랜딩(1번 모델, /consult1). 좌: 트랙 소개+소개서 / 우: 브랜드 정보 폼.
// 신청 성공 시 1:1 미팅 신청 링크 자동 노출. 개인정보 수집 동의 필수. 저장: /api/consult.
import { useState, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import { Check, ArrowRight, Download, ShoppingBag, CalendarClock, Loader2 } from "lucide-react";
import { MALL_TRACKS } from "@/data/ktrend/meta";
import SiteHeader from "@/components/ktrend/SiteHeader";
import SiteFooter from "@/components/ktrend/SiteFooter";
import { trackPixel } from "@/components/ktrend/MetaPixel";
import { parseUtmFromSearch, storeFirstTouchUtm, getStoredUtm, type Utm } from "@/lib/utm";

// env 우선, 없으면 기본값(제공받은 링크). 서비스 소개서 = 구글 슬라이드(보기).
const DECK_URL = process.env.NEXT_PUBLIC_GLOVEK_DECK_URL
  || "https://docs.google.com/presentation/d/1zUGsHZ9pIbupXZsGTdDx1okGRJX5Sdwg/edit?usp=sharing&ouid=105353575394213431265&rtpof=true&sd=true";
const MEETING_URL = process.env.NEXT_PUBLIC_GLOVEK_MEETING_URL
  || "https://scheduler.zoom.us/nwa36f2letmqfr4bht4pgtzve0/tpartners2";

const CATEGORIES = ["스킨케어", "메이크업", "헤어케어", "바디·퍼스널케어", "이너뷰티/건기식", "패션·잡화", "푸드", "기타"];

export default function ConsultPage() {
  const [f, setF] = useState({ company: "", category: "", managerName: "", email: "", contact: "", message: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ meetingUrl: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  // ── 입력 퍼널 추적(비식별): 어느 필드까지 채웠는지만 서버에 upsert. PII 값은 전송 안 함 ──
  const sidRef = useRef<string>("");
  const utmRef = useRef<{ utm: Utm; landing: string; referrer: string }>({ utm: {}, landing: "", referrer: "" });
  const stateRef = useRef({ f, agree, done: false });
  stateRef.current = { f, agree, done: !!done };
  useEffect(() => {
    sidRef.current = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const cur = parseUtmFromSearch(window.location.search);
    storeFirstTouchUtm(cur);
    utmRef.current = { utm: { ...getStoredUtm(), ...cur }, landing: window.location.pathname + window.location.search, referrer: document.referrer || "" };
    const onHide = () => { if (document.visibilityState === "hidden") sendTrack(false, true); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const filledFields = (st: typeof stateRef.current) => {
    const keys: string[] = [];
    (["company", "category", "managerName", "email", "contact", "message"] as const).forEach((k) => { if (String(st.f[k] || "").trim()) keys.push(k); });
    if (st.agree) keys.push("agreed");
    return keys;
  };
  const sendTrack = (completed = false, beacon = false) => {
    const sid = sidRef.current; if (!sid) return;
    const st = stateRef.current;
    const fields = filledFields(st);
    if (!completed && !fields.length) return; // 아무것도 안 채웠으면 기록 안 함
    const { utm, landing, referrer } = utmRef.current;
    const payload = JSON.stringify({ sid, fields, lastField: fields[fields.length - 1], category: st.f.category || undefined, agreed: st.agree, completed, utm, landing, referrer });
    try {
      if (beacon && navigator.sendBeacon) { navigator.sendBeacon("/api/consult/track", new Blob([payload], { type: "application/json" })); return; }
      fetch("/api/consult/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
    } catch { /* best-effort */ }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!agree) { setErr("개인정보 수집·이용에 동의해 주세요."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/consult", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, agreed: agree, source: "consult-landing" }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) { setErr(d?.error ?? "신청에 실패했습니다."); setBusy(false); return; }
      // 전환 이벤트: 상담 신청 완료 = Lead
      trackPixel("Lead", { content_name: "consult", content_category: f.category, company: f.company });
      sendTrack(true); // 퍼널: 완료 마킹
      setDone({ meetingUrl: d.meetingUrl || MEETING_URL });
    } catch {
      setErr("신청 처리 중 오류가 발생했습니다.");
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#faf7ff] to-white text-slate-800">
      {/* 기존 사이트 상단 네비 그대로 */}
      <SiteHeader />

      <div className="mx-auto grid w-full max-w-[1200px] flex-1 gap-6 px-4 py-8 lg:grid-cols-2 lg:gap-10 lg:py-12">
        {/* ── 소개 (모바일: 폼 아래 / 데스크톱: 오른쪽) ── */}
        <section className="order-2 lg:order-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-light)]/60 px-3 py-1 text-[11px] font-bold text-[#7C3AED]">
            <ShoppingBag size={12} /> TikTok Shop 멀티몰
          </span>
          <h1 className="mt-3 text-[26px] font-black leading-tight md:text-[34px]">틱톡샵 <span className="text-[#7C3AED]">상담</span></h1>
          <p className="mt-2 text-[13px] text-slate-500">브랜드에 맞는 트랙으로, 초기 파일럿부터 자체 브랜드 채널 운영·메가 스케일업까지 함께합니다.</p>

          {/* 순서: Live Focus → Guarantee(온보딩 보장) → Onboarding */}
          <div className="mt-6 space-y-4">
            {MALL_TRACKS.map((t) => (
              <Fragment key={t.id}>
                <div className={`rounded-2xl border p-4 ${t.highlight ? "border-pink-200 bg-white shadow-sm" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <div className="text-[16px] font-black">{t.name}</div>
                    <div className="text-right">
                      <span className="text-[15px] font-black text-pink-500">{t.priceLabel}</span>
                      {!t.inquiry && <span className="text-[11px] text-slate-400"> /월</span>}
                    </div>
                  </div>
                  <div className="text-[12px] text-slate-500">{t.tagline} · {t.commissionLabel}</div>
                  <ul className="mt-2 grid gap-1">
                    {t.features.map((x) => (
                      <li key={x} className="flex gap-1.5 text-[12px] text-slate-600"><Check size={13} className="mt-0.5 shrink-0 text-pink-500" /> {x}</li>
                    ))}
                  </ul>
                </div>
                {/* Live Focus 바로 다음에 개런티 카드 */}
                {t.id === "live" && <GuaranteeCard />}
              </Fragment>
            ))}
          </div>

          {/* 소개서 다운로드 */}
          <div className="mt-5">
            {DECK_URL ? (
              <a href={DECK_URL} target="_blank" rel="noopener noreferrer"
                onClick={() => trackPixel("ViewContent", { content_name: "service_deck" })}
                className="inline-flex items-center gap-2 rounded-xl border border-[#7C3AED]/40 bg-white px-4 py-2.5 text-[13px] font-bold text-[#7C3AED] hover:bg-[var(--accent-light)]">
                <Download size={15} /> GloveK 멀티몰 서비스 소개서 보기
              </a>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] font-bold text-slate-400">
                <Download size={15} /> 소개서 준비 중 (링크 연결 예정)
              </div>
            )}
          </div>
        </section>

        {/* ── 브랜드 정보 입력 (모바일: 최상단 / 데스크톱: 왼쪽) ── */}
        <section className="order-1 lg:order-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {done ? (
              <div className="py-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-500"><Check size={26} /></div>
                <h2 className="mt-3 text-[18px] font-black">상담 신청이 접수됐습니다</h2>
                <p className="mt-1 text-[13px] text-slate-500">아래 버튼으로 편한 시간에 1:1 미팅을 바로 예약해 주세요.</p>
                {done.meetingUrl ? (
                  <a href={done.meetingUrl} target="_blank" rel="noopener noreferrer"
                    onClick={() => trackPixel("Schedule", { content_name: "consult_meeting" })}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-3 text-[14px] font-bold text-white hover:opacity-95">
                    <CalendarClock size={16} /> 1:1 미팅 신청하기 <ArrowRight size={15} />
                  </a>
                ) : (
                  <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700">미팅 예약 링크는 곧 담당자가 이메일로 안내드립니다.</p>
                )}
              </div>
            ) : (
              <form onSubmit={submit}>
                <h2 className="text-[18px] font-black">브랜드 정보 입력</h2>
                <p className="mb-4 mt-1 text-[12px] text-slate-500">담당자가 확인 후 1:1 상담을 도와드립니다. <span className="text-rose-500">*</span> 필수</p>
                <div className="grid gap-3">
                  <Field label="회사명/브랜드명" req><input required value={f.company} onChange={set("company")} onBlur={() => sendTrack()} className="inp" placeholder="(주)글로우랩 / 브랜드명" /></Field>
                  <Field label="카테고리" req>
                    <select required value={f.category} onChange={set("category")} onBlur={() => sendTrack()} className="inp">
                      <option value="">선택</option>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="담당자 성함" req><input required value={f.managerName} onChange={set("managerName")} onBlur={() => sendTrack()} className="inp" placeholder="홍길동" /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="이메일" req><input required type="email" value={f.email} onChange={set("email")} onBlur={() => sendTrack()} className="inp" placeholder="name@brand.com" /></Field>
                    <Field label="연락처" req><input required value={f.contact} onChange={set("contact")} onBlur={() => sendTrack()} className="inp" placeholder="010-0000-0000" /></Field>
                  </div>
                  <Field label="기타 문의 내용"><textarea value={f.message} onChange={set("message")} onBlur={() => sendTrack()} rows={3} className="inp resize-none" placeholder="문의하실 내용을 자유롭게 남겨 주세요 (선택)" /></Field>
                </div>

                <label className="mt-4 flex items-start gap-2 text-[12px] text-slate-600">
                  <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setTimeout(() => sendTrack(), 0); }} className="mt-0.5" />
                  <span>
                    <b>[필수]</b> 개인정보 수집·이용에 동의합니다. (수집항목: 회사명·담당자·이메일·연락처 등 / 목적: 입점 상담 / 보유: 상담 종료 후 1년)
                    {" "}<Link href="/privacy" target="_blank" className="text-[#7C3AED] underline">전문 보기</Link>
                  </span>
                </label>

                {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">{err}</p>}

                <button type="submit" disabled={busy}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3 text-[14px] font-bold text-white hover:opacity-95 disabled:opacity-50">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <CalendarClock size={16} />} 1:1 상담 신청하기
                </button>
                <p className="mt-2 text-center text-[10px] text-slate-400">신청 완료 시 1:1 미팅 예약 링크가 바로 나타납니다.</p>
              </form>
            )}
          </div>
        </section>
      </div>

      <SiteFooter />

      <style>{`.inp{width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:9px 11px;font-size:13px;background:#fff}.inp:focus{outline:2px solid #7C3AED33;border-color:#7C3AED}`}</style>
    </div>
  );
}

// 온보딩 보장(Guarantee Track) 오퍼 카드 — 다크 그라디언트 + 가치 구성 표.
function GuaranteeCard() {
  const checks = ["인증/ 입점 · 물류 · 번역", "무가 라이브 월 6회", "무가 시딩 30개~", "최대 10개 제품 등록", "온보딩 보장"];
  const breakdown: [string, string][] = [
    ["시딩 40건×3만", "120만"],
    ["라이브 8건×10만", "80만"],
    ["인증·물류 관리", "100만"],
    ["온보딩 보장 컨설팅", "100만"],
  ];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-pink-500/40 bg-gradient-to-br from-[#2b0f22] via-[#241026] to-[#180a1e] p-6 text-white shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[24px] font-black tracking-tight text-[#ff3d8b] md:text-[26px]">Guarantee Track</h2>
        <span className="shrink-0 rounded-full bg-[#ff2e88] px-3 py-1 text-[11px] font-bold text-white">온보딩 보장</span>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="text-[15px] font-semibold text-white/40 line-through">₩4,000,000</span>
        <span className="text-[32px] font-black leading-none md:text-[36px]">₩1,000,000</span>
        <span className="mb-1 text-[13px] text-white/60">/월</span>
      </div>
      <p className="mt-2 text-[12px] font-semibold text-white/70">+ 판매 수수료 10% · 최소 6개월 · 평균 온보딩 3개월</p>

      <div className="mt-4 rounded-2xl border border-pink-400/30 bg-pink-500/10 p-4">
        <p className="text-[13px] font-bold text-[#ff6aa6]">Glovek 입점 → 자체 브랜드 TikTok Shop 오픈까지 보장</p>
        <p className="mt-1 text-[12px] text-white/70">6개월간 5개 조건 모두 달성 후 온보딩까지 마무리</p>
      </div>

      <div className="my-4 h-px bg-white/10" />
      <p className="text-[13px] font-bold text-[#ff3d8b]">Live Focus × 2배 제공</p>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <ul className="space-y-2">
          {checks.map((x) => (
            <li key={x} className="flex items-start gap-2 text-[13px] text-white/90"><Check size={14} className="mt-0.5 shrink-0 text-[#ff3d8b]" /> {x}</li>
          ))}
        </ul>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[13px] font-black">₩4,000,000 상당 구성</p>
          <ul className="mt-2 space-y-1.5 text-[12px]">
            {breakdown.map(([k, v]) => (
              <li key={k} className="flex justify-between gap-2"><span className="text-white/70">{k}</span><span className="font-bold">{v}</span></li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}{req && <span className="text-rose-500"> *</span>}</span>
      {children}
    </label>
  );
}

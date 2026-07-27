"use client";

// GloveK 서비스 소개서 받기 랜딩(/consult). 기존 틱톡샵 상담(트랙/개런티)은 /consult1 로 분리.
// 폼=소개서 받기, 기타 문의 제거, 제출 완료 시에만 소개서 보기 노출(사전 노출 없음).
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Check, FileText, Loader2, ArrowRight } from "lucide-react";
import SiteHeader from "@/components/ktrend/SiteHeader";
import SiteFooter from "@/components/ktrend/SiteFooter";
import { trackPixel } from "@/components/ktrend/MetaPixel";
import { parseUtmFromSearch, storeFirstTouchUtm, getStoredUtm, type Utm } from "@/lib/utm";

const DECK_URL = process.env.NEXT_PUBLIC_GLOVEK_DECK_URL
  || "https://docs.google.com/presentation/d/1zUGsHZ9pIbupXZsGTdDx1okGRJX5Sdwg/edit?usp=sharing&ouid=105353575394213431265&rtpof=true&sd=true";

const CATEGORIES = ["스킨케어", "메이크업", "헤어케어", "바디·퍼스널케어", "이너뷰티/건기식", "패션·잡화", "푸드", "기타"];

export default function ConsultDeckPage() {
  const [f, setF] = useState({ company: "", category: "", managerName: "", email: "", contact: "" });
  const [agree, setAgree] = useState(true); // 필수 동의 기본 체크
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  // 입력 퍼널 추적(비식별) — 1번 모델과 동일 + 유입(UTM) 기록
  const sidRef = useRef<string>("");
  const utmRef = useRef<{ utm: Utm; landing: string; referrer: string }>({ utm: {}, landing: "", referrer: "" });
  const stateRef = useRef({ f, agree });
  stateRef.current = { f, agree };
  useEffect(() => {
    sidRef.current = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const cur = parseUtmFromSearch(window.location.search);
    storeFirstTouchUtm(cur); // 첫 유입 보존
    utmRef.current = { utm: { ...getStoredUtm(), ...cur }, landing: window.location.pathname + window.location.search, referrer: document.referrer || "" };
    const onHide = () => { if (document.visibilityState === "hidden") sendTrack(false, true); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const filledFields = (st: typeof stateRef.current) => {
    const keys: string[] = [];
    (["company", "category", "managerName", "email", "contact"] as const).forEach((k) => { if (String(st.f[k] || "").trim()) keys.push(k); });
    if (st.agree) keys.push("agreed");
    return keys;
  };
  const sendTrack = (completed = false, beacon = false) => {
    const sid = sidRef.current; if (!sid) return;
    const st = stateRef.current;
    const fields = filledFields(st);
    // 동의는 기본 체크 상태라 '입력 시작' 판정/마지막 입력에서 제외 — 실제 타이핑한 필드 기준.
    const real = fields.filter((k) => k !== "agreed");
    if (!completed && !real.length) return;
    const { utm, landing, referrer } = utmRef.current;
    const payload = JSON.stringify({ sid, fields, lastField: real[real.length - 1] ?? "agreed", category: st.f.category || undefined, agreed: st.agree, completed, utm, landing, referrer });
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
        body: JSON.stringify({ ...f, agreed: agree, source: "deck-landing" }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) { setErr(d?.error ?? "신청에 실패했습니다."); setBusy(false); return; }
      trackPixel("Lead", { content_name: "deck", content_category: f.category, company: f.company });
      sendTrack(true);
      setDone(true);
    } catch {
      setErr("신청 처리 중 오류가 발생했습니다.");
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#faf7ff] to-white text-slate-800">
      <SiteHeader />

      <div className="mx-auto w-full max-w-[520px] flex-1 px-4 py-8 lg:py-12">
        {/* ── 소개서 받기 폼 ── */}
        <section>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {done ? (
              <div className="py-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-500"><Check size={26} /></div>
                <h2 className="mt-3 text-[18px] font-black">소개서 신청이 완료됐습니다</h2>
                <p className="mt-1 text-[13px] text-slate-500">아래 버튼으로 GloveK 서비스 소개서를 바로 확인하세요.</p>
                {DECK_URL ? (
                  <a href={DECK_URL} target="_blank" rel="noopener noreferrer"
                    onClick={() => trackPixel("ViewContent", { content_name: "service_deck_after_lead" })}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7C3AED] px-5 py-3 text-[14px] font-bold text-white hover:opacity-95">
                    <FileText size={16} /> GloveK 소개서 보기 <ArrowRight size={15} />
                  </a>
                ) : (
                  <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-700">소개서 링크는 곧 담당자가 이메일로 안내드립니다.</p>
                )}
              </div>
            ) : (
              <form onSubmit={submit}>
                <h2 className="text-[18px] font-black">glovek 소개서 받기</h2>
                <p className="mb-4 mt-1 text-[12px] text-slate-500">정보를 입력하시면 소개서를 바로 확인하실 수 있습니다. <span className="text-rose-500">*</span> 필수</p>
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
                </div>

                <label className="mt-4 flex items-start gap-2 text-[12px] text-slate-600">
                  <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setTimeout(() => sendTrack(), 0); }} className="mt-0.5" />
                  <span>
                    <b>[필수]</b> 개인정보 수집·이용에 동의합니다. (수집항목: 회사명·담당자·이메일·연락처 등 / 목적: 서비스 소개서 제공 및 상담 / 보유: 1년)
                    {" "}<Link href="/privacy" target="_blank" className="text-[#7C3AED] underline">전문 보기</Link>
                  </span>
                </label>

                {err && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">{err}</p>}

                <button type="submit" disabled={busy}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3 text-[14px] font-bold text-white hover:opacity-95 disabled:opacity-50">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} glovek 소개서 받기
                </button>
                <p className="mt-2 text-center text-[10px] text-slate-400">신청 완료 시 소개서를 바로 확인하실 수 있습니다.</p>
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

function Field({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}{req && <span className="text-rose-500"> *</span>}</span>
      {children}
    </label>
  );
}

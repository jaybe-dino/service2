"use client";

// GloveK 틱톡샵 멀티몰 입점 상담 랜딩(이벤트). 좌: 트랙 소개+소개서 / 우: 브랜드 정보 폼.
// 신청 성공 시 1:1 미팅 신청 링크 자동 노출. 개인정보 수집 동의 필수. 저장: /api/consult.
import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight, Download, ShoppingBag, CalendarClock, Loader2 } from "lucide-react";
import { MALL_TRACKS } from "@/data/ktrend/meta";

// env로 주입(값 받으면 교체). 미설정 시 폴백 처리.
const DECK_URL = process.env.NEXT_PUBLIC_GLOVEK_DECK_URL || "";
const MEETING_URL = process.env.NEXT_PUBLIC_GLOVEK_MEETING_URL || "";

const CATEGORIES = ["스킨케어", "메이크업", "헤어케어", "바디·퍼스널케어", "이너뷰티/건기식", "패션·잡화", "푸드", "기타"];
const OVERSEAS = ["없음", "아마존·쇼피 등 경험 있음", "TikTok Shop 경험 있음", "기타"];

export default function ConsultPage() {
  const [f, setF] = useState({ company: "", brandUrl: "", category: "", overseas: "", managerName: "", email: "", contact: "", message: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<{ meetingUrl: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

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
      setDone({ meetingUrl: d.meetingUrl || MEETING_URL });
    } catch {
      setErr("신청 처리 중 오류가 발생했습니다.");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#faf7ff] to-white text-slate-800">
      {/* 상단 브랜드 바 */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-2 px-4">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#FF5C8D] text-white"><ShoppingBag size={15} /></span>
          <span className="font-black">GloveK</span>
          <span className="text-[12px] text-slate-400">틱톡샵 멀티몰 입점</span>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 lg:grid-cols-2 lg:gap-10 lg:py-12">
        {/* ── 소개 (데스크톱 오른쪽) ── */}
        <section className="lg:order-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-light)]/60 px-3 py-1 text-[11px] font-bold text-[#7C3AED]">
            <ShoppingBag size={12} /> TikTok Shop 멀티몰
          </span>
          <h1 className="mt-3 text-[26px] font-black leading-tight md:text-[34px]">틱톡샵 멀티몰 <span className="text-[#7C3AED]">GloveK</span> 입점 상담</h1>
          <p className="mt-2 text-[13px] text-slate-500">브랜드에 맞는 트랙으로, 초기 파일럿부터 자체 브랜드 채널 운영·메가 스케일업까지 함께합니다.</p>

          <div className="mt-6 space-y-4">
            {MALL_TRACKS.map((t) => (
              <div key={t.id} className={`rounded-2xl border p-4 ${t.highlight ? "border-pink-200 bg-white shadow-sm" : "border-slate-200 bg-white"}`}>
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
            ))}
          </div>

          {/* 소개서 다운로드 */}
          <div className="mt-5">
            {DECK_URL ? (
              <a href={DECK_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[#7C3AED]/40 bg-white px-4 py-2.5 text-[13px] font-bold text-[#7C3AED] hover:bg-[var(--accent-light)]">
                <Download size={15} /> GloveK 멀티몰 서비스 소개서 다운로드
              </a>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] font-bold text-slate-400">
                <Download size={15} /> 소개서 준비 중 (링크 연결 예정)
              </div>
            )}
          </div>
        </section>

        {/* ── 브랜드 정보 입력 (데스크톱 왼쪽) ── */}
        <section className="lg:order-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {done ? (
              <div className="py-6 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-500"><Check size={26} /></div>
                <h2 className="mt-3 text-[18px] font-black">상담 신청이 접수됐습니다</h2>
                <p className="mt-1 text-[13px] text-slate-500">아래 버튼으로 편한 시간에 1:1 미팅을 바로 예약해 주세요.</p>
                {done.meetingUrl ? (
                  <a href={done.meetingUrl} target="_blank" rel="noopener noreferrer"
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
                  <Field label="회사명" req><input required value={f.company} onChange={set("company")} className="inp" placeholder="(주)글로우랩" /></Field>
                  <Field label="브랜드 링크"><input value={f.brandUrl} onChange={set("brandUrl")} className="inp" placeholder="브랜드 홈페이지/인스타/스마트스토어 URL" /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="카테고리" req>
                      <select required value={f.category} onChange={set("category")} className="inp">
                        <option value="">선택</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="해외 판매 경험" req>
                      <select required value={f.overseas} onChange={set("overseas")} className="inp">
                        <option value="">선택</option>
                        {OVERSEAS.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="담당자 성함" req><input required value={f.managerName} onChange={set("managerName")} className="inp" placeholder="홍길동" /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="이메일" req><input required type="email" value={f.email} onChange={set("email")} className="inp" placeholder="name@brand.com" /></Field>
                    <Field label="연락처" req><input required value={f.contact} onChange={set("contact")} className="inp" placeholder="010-0000-0000" /></Field>
                  </div>
                  <Field label="기타 문의 내용"><textarea value={f.message} onChange={set("message")} rows={3} className="inp resize-none" placeholder="문의하실 내용을 자유롭게 남겨 주세요 (선택)" /></Field>
                </div>

                <label className="mt-4 flex items-start gap-2 text-[12px] text-slate-600">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" />
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

"use client";

// 「글로벌 틱톡샵 × K-패션」 온라인 세미나(2026.9.22) 사전 신청 — 간단 폼.
// 수집: 브랜드명·이메일·연락처·희망국가. 저장: /api/fashion-apply.
import { useState } from "react";
import Link from "next/link";
import { Check, CalendarClock, Loader2, Sparkles } from "lucide-react";

const COUNTRIES = ["미국", "일본", "태국", "베트남", "인도네시아", "말레이시아", "필리핀", "싱가포르", "미정"];

export default function FashionSeminarApply() {
  const [brand, setBrand] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [countries, setCountries] = useState<string[]>([]);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const toggle = (c: string) => setCountries((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!agree) { setErr("개인정보 수집·이용에 동의해 주세요."); return; }
    setBusy(true);
    const r = await fetch("/api/fashion-apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand, email, contact, country: countries.join(", "), agreed: agree }),
    }).then((x) => x.json()).catch(() => null);
    setBusy(false);
    if (r?.ok) setDone(true);
    else setErr(r?.error || "신청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#0f0f1a] via-[#171528] to-[#0f0f1a] text-white">
      <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-4 py-12">
        {/* 헤더 */}
        <div className="mb-7 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-bold text-pink-300">
            <Sparkles size={12} /> 온라인 웨비나 · 사전 신청
          </span>
          <h1 className="mt-4 text-[28px] font-black leading-tight tracking-tight sm:text-[34px]">
            글로벌 틱톡샵 <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">× K-패션</span>
          </h1>
          <p className="mt-2 text-[13px] text-white/60">뷰티는 이미 갔는데, 패션은 왜 아직인가</p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-white/80">
            <CalendarClock size={13} /> 2026. 9. 22 (화) 16:00–18:00 · Zoom
          </p>
        </div>

        {/* 폼 카드 */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-7">
          {done ? (
            <div className="py-6 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-emerald-400"><Check size={26} /></div>
              <h2 className="mt-3 text-[18px] font-black">신청이 접수됐습니다</h2>
              <p className="mt-1.5 text-[13px] text-white/60">참가 링크와 안내는 세미나 전 입력하신 이메일로 보내드립니다.<br />감사합니다.</p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2 className="text-[16px] font-black">세미나 사전 신청</h2>
              <p className="mb-5 mt-1 text-[12px] text-white/50">아래 정보만 입력하시면 신청이 완료됩니다.</p>

              <div className="space-y-4">
                <Field label="브랜드명">
                  <input required value={brand} onChange={(e) => setBrand(e.target.value)} className="inp" placeholder="브랜드명 (또는 회사명)" />
                </Field>
                <Field label="이메일">
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="inp" placeholder="name@brand.com" />
                </Field>
                <Field label="연락처">
                  <input required type="tel" value={contact} onChange={(e) => setContact(e.target.value)} className="inp" placeholder="010-0000-0000" />
                </Field>
                <div>
                  <span className="mb-2 block text-[11px] font-semibold text-white/50">희망 진출 국가 <span className="text-white/30">(복수 선택 가능)</span></span>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRIES.map((c) => (
                      <button type="button" key={c} onClick={() => toggle(c)}
                        className={`rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition ${countries.includes(c) ? "border-pink-400 bg-pink-500/20 text-pink-200" : "border-white/15 text-white/60 hover:border-white/30"}`}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <label className="mt-5 flex items-start gap-2 text-[11.5px] text-white/60">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-pink-500" />
                <span><b className="text-white/80">[필수]</b> 개인정보 수집·이용에 동의합니다. (수집: 브랜드·이메일·연락처·희망국가 / 목적: 세미나 안내 / 보유: 세미나 종료 후 1년)</span>
              </label>

              {err && <p className="mt-3 rounded-lg bg-rose-500/15 px-3 py-2 text-[12px] font-semibold text-rose-300">{err}</p>}

              <button type="submit" disabled={busy}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 py-3.5 text-[14px] font-black text-white transition hover:opacity-95 disabled:opacity-50">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {busy ? "신청 중…" : "무료로 신청하기"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-[10px] text-white/30">
          주최 · 주식회사 디노스튜디오 · <Link href="/privacy" target="_blank" className="underline hover:text-white/50">개인정보처리방침</Link>
        </p>
      </div>

      <style>{`.inp{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.14);border-radius:11px;padding:11px 13px;font-size:14px;background:rgba(255,255,255,.05);color:#fff;outline:none}.inp::placeholder{color:rgba(255,255,255,.32)}.inp:focus{border-color:#f472b6;background:rgba(255,255,255,.08)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold text-white/50">{label} <span className="text-pink-400">*</span></span>
      {children}
    </label>
  );
}

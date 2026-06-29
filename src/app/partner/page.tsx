"use client";

import { useEffect, useState } from "react";
import { Loader2, LogIn, LogOut, Users, Copy, Check } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";

interface Signup {
  name: string | null; email: string; brand: string | null; plan: string;
  created_ms: number; onb_status: string | null; onb_track: string | null; onb_amount: number | null;
}
interface Referrer { code: string; name: string | null }
const TRACK: Record<string, string> = { ready: "Start", live: "Live Focus", onboarding: "Onboarding" };
const won = (n: number | null) => (n ? "₩" + Number(n).toLocaleString() : "—");
const dt = (ms: number) => new Date(Number(ms)).toISOString().slice(0, 10);

export default function PartnerPage() {
  const [ready, setReady] = useState(false);
  const [ref, setRef] = useState<Referrer | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    const r = await fetch("/api/ref/me", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (r?.ok && r.referrer) { setRef(r.referrer); setSignups(r.signups ?? []); }
    else { setRef(null); setSignups([]); }
    setReady(true);
  };
  useEffect(() => { load(); }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true);
    const r = await fetch("/api/ref/login", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId, password }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok && d.ok) { setPassword(""); load(); } else setErr(d.error ?? "로그인 실패");
  };
  const logout = async () => { await fetch("/api/ref/logout", { method: "POST" }); setRef(null); setSignups([]); };

  const copyLink = () => {
    if (!ref) return;
    const url = `https://glovek.space/signup?ref=${ref.code}`;
    navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  if (!ready) return <PageShell><div className="py-16 text-center text-[12px] text-[var(--muted)]"><Loader2 className="mx-auto animate-spin" size={18} /></div></PageShell>;

  if (!ref) {
    return (
      <PageShell>
        <div className="mx-auto max-w-sm">
          <h1 className="text-center text-[22px] font-black">추천인 로그인</h1>
          <p className="mt-1 text-center text-[12px] text-[var(--muted)]">발급받은 아이디·비밀번호로 로그인하세요.</p>
          <form onSubmit={login} className="kt-card mt-5 space-y-3 p-5">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold">아이디</span>
              <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="ref00000"
                className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold">비밀번호</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
            </label>
            {err && <p className="text-[11px] font-semibold text-rose-600">{err}</p>}
            <button disabled={busy} className="kt-btn kt-btn-primary w-full py-2.5 text-[12px] disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />} 로그인
            </button>
          </form>
        </div>
      </PageShell>
    );
  }

  const paid = signups.filter((s) => s.onb_status === "paid").length;

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-[20px] font-black"><Users size={18} className="text-[var(--accent)]" /> {ref.name ?? "추천인"} 대시보드</h1>
          <button onClick={logout} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]"><LogOut size={13} /> 로그아웃</button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat l="내 추천 코드" v={ref.code} />
          <Stat l="추천 가입자" v={`${signups.length}명`} />
          <Stat l="입점 결제" v={`${paid}건`} />
          <button onClick={copyLink} className="kt-card flex flex-col items-start p-3 text-left hover:border-[var(--accent)]">
            <div className="text-[10px] text-[var(--muted)]">추천 링크 복사</div>
            <div className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-bold text-[var(--accent)]">
              {copied ? <><Check size={12} /> 복사됨</> : <><Copy size={12} /> /signup?ref=…</>}
            </div>
          </button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full text-[12px]">
            <thead className="bg-slate-50 text-left text-[11px] text-[var(--muted)]">
              <tr><th className="p-2.5">가입일</th><th className="p-2.5">이름</th><th className="p-2.5">브랜드</th><th className="p-2.5">플랜</th><th className="p-2.5">입점</th></tr>
            </thead>
            <tbody>
              {signups.map((s, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  <td className="p-2.5 text-[var(--muted)]">{dt(s.created_ms)}</td>
                  <td className="p-2.5 font-semibold">{s.name ?? "—"}</td>
                  <td className="p-2.5">{s.brand ?? "—"}</td>
                  <td className="p-2.5">{s.plan}</td>
                  <td className="p-2.5">{s.onb_status === "paid"
                    ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{TRACK[s.onb_track ?? ""] ?? "입점"} {won(s.onb_amount)}</span>
                    : s.onb_status ? <span className="text-[11px] text-amber-600">진행중</span> : <span className="text-[var(--muted)]">—</span>}
                  </td>
                </tr>
              ))}
              {!signups.length && <tr><td colSpan={5} className="p-6 text-center text-[var(--muted)]">아직 추천 가입자가 없습니다. 추천 링크를 공유해 보세요.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-[var(--muted)]">개인정보 보호를 위해 가입자 이메일 등 일부 정보는 표시되지 않습니다.</p>
      </div>
    </PageShell>
  );
}

function Stat({ l, v }: { l: string; v: string }) {
  return <div className="kt-card p-3"><div className="text-[10px] text-[var(--muted)]">{l}</div><div className="mt-0.5 text-[16px] font-black text-[var(--accent)]">{v}</div></div>;
}

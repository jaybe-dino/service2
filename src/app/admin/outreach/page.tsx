"use client";

// 아웃리치 파이프라인 보드 (관리자 전용) — /creators·/creator·/product 에서 추가한 대상 관리.
// 상태 칸반 + 대상 드로어(타임라인·메모·상태변경·삭제) + 세그먼트 필터. 데이터: /api/admin/outreach.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import { ShieldCheck, Loader2, ArrowLeft, ExternalLink, Trash2, X, Send, RefreshCw, Users } from "lucide-react";

const STATUSES = ["discovered", "contacted", "replied", "negotiating", "contracted", "running", "done", "hold", "rejected"] as const;
type Status = (typeof STATUSES)[number];
const S_LABEL: Record<Status, string> = {
  discovered: "발굴", contacted: "접촉", replied: "응답", negotiating: "협의", contracted: "계약", running: "진행", done: "완료", hold: "보류", rejected: "제외",
};
const S_COLOR: Record<Status, string> = {
  discovered: "bg-slate-100 text-slate-600", contacted: "bg-sky-100 text-sky-700", replied: "bg-indigo-100 text-indigo-700",
  negotiating: "bg-amber-100 text-amber-700", contracted: "bg-emerald-100 text-emerald-700", running: "bg-teal-100 text-teal-700",
  done: "bg-fuchsia-100 text-fuchsia-700", hold: "bg-zinc-100 text-zinc-500", rejected: "bg-rose-100 text-rose-600",
};
const compact = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K" : String(n));
const dt = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? String(s).slice(0, 16) : d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
};

interface Target {
  id: number; handle: string; status: Status; owner: string | null; score: number | null; note: string | null;
  list_id: number | null; created_at: string; updated_at: string;
  total_views: string | number | null; avg_views: string | number | null; videos: number | null; activity: number;
}
interface Segment { id: number; name: string; owner: string | null; targets: number; created_at: string }
interface Activity { id: number; actor: string | null; kind: string; body: string | null; created_at: string }

export default function OutreachBoardPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState<string | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [listFilter, setListFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState<Target | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" }).then((r) => r.json()).then((j) => setAuthed(!!j.authed)).catch(() => setAuthed(false));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = listFilter ? `&listId=${encodeURIComponent(listFilter)}` : "";
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/admin/outreach?type=targets${q}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/outreach?type=lists`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      setTargets(tRes.targets || []);
      setSegments(sRes.lists || []);
    } finally { setLoading(false); }
  }, [listFilter]);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) setAuthed(true); else setErr(d.error || "로그인 실패");
  }

  async function openTarget(t: Target) {
    setSel(t); setNote(""); setActivity([]);
    const j = await fetch(`/api/admin/outreach?type=activity&id=${t.id}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
    setActivity(j.activity || []);
  }

  async function setStatus(t: Target, status: Status) {
    await fetch("/api/admin/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setStatus", id: t.id, status }) });
    setTargets((prev) => prev.map((x) => (x.id === t.id ? { ...x, status, updated_at: new Date().toISOString() } : x)));
    if (sel?.id === t.id) { setSel({ ...t, status }); openTarget({ ...t, status }); }
  }

  async function addNote() {
    if (!sel || !note.trim()) return;
    await fetch("/api/admin/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "note", id: sel.id, note }) });
    setNote(""); openTarget(sel);
    setTargets((prev) => prev.map((x) => (x.id === sel.id ? { ...x, activity: x.activity + 1 } : x)));
  }

  async function removeTarget(t: Target) {
    if (!confirm(`@${t.handle} 를 아웃리치에서 삭제할까요?`)) return;
    await fetch("/api/admin/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteTarget", id: t.id }) });
    setTargets((prev) => prev.filter((x) => x.id !== t.id));
    if (sel?.id === t.id) setSel(null);
  }

  if (authed === null) return <PageShell><div className="py-24 text-center text-[var(--muted)]"><Loader2 className="mx-auto animate-spin" /></div></PageShell>;
  if (!authed) {
    return (
      <PageShell>
        <div className="mx-auto max-w-sm py-16">
          <div className="kt-card p-6">
            <h1 className="flex items-center gap-2 text-[18px] font-black"><ShieldCheck size={18} className="text-[var(--accent)]" /> 관리자 로그인</h1>
            <p className="mt-1 text-[11px] text-[var(--muted)]">아웃리치 파이프라인(관리자 전용)</p>
            <form onSubmit={login} className="mt-4 space-y-2.5">
              <input value={u} onChange={(e) => setU(e.target.value)} placeholder="아이디" className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
              <input type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder="비밀번호" className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
              {err && <p className="text-[11px] font-semibold text-rose-600">{err}</p>}
              <button className="kt-btn kt-btn-primary w-full py-2.5 text-[12px]">로그인</button>
            </form>
          </div>
        </div>
      </PageShell>
    );
  }

  const byStatus = (s: Status) => targets.filter((t) => t.status === s);
  const active = targets.filter((t) => t.status !== "rejected" && t.status !== "done").length;

  return (
    <PageShell>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/admin" className="mb-1 inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--accent)]"><ArrowLeft size={12} /> 관리자 콘솔</Link>
          <h1 className="flex items-center gap-2 text-[20px] font-black tracking-tight"><Users size={18} className="text-[var(--accent)]" /> 아웃리치 파이프라인</h1>
          <p className="text-[11px] text-[var(--muted)]">전체 {targets.length} · 진행중 {active} · /creators·/creator·/product 에서 [아웃리치 추가]로 대상 등록</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={listFilter} onChange={(e) => setListFilter(e.target.value)} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]">
            <option value="">전체 세그먼트</option>
            {segments.map((s) => <option key={s.id} value={String(s.id)}>{s.name} ({s.targets})</option>)}
          </select>
          <button onClick={load} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> 새로고침</button>
        </div>
      </div>

      {targets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[13px] text-[var(--muted)]">
          아웃리치 대상이 없습니다. <Link href="/creators" className="font-semibold text-[var(--accent)]">크리에이터 랭킹</Link>에서 적합한 크리에이터를 추가하세요.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {STATUSES.map((s) => {
            const items = byStatus(s);
            return (
              <div key={s} className="flex w-[210px] shrink-0 flex-col rounded-xl bg-slate-50/70 p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${S_COLOR[s]}`}>{S_LABEL[s]}</span>
                  <span className="text-[11px] font-bold text-[var(--muted)]">{items.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((t) => (
                    <button key={t.id} onClick={() => openTarget(t)} className="rounded-lg border border-[var(--border)] bg-white p-2.5 text-left transition hover:border-[var(--accent)] hover:shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-[12px] font-bold">@{t.handle}</span>
                        {t.score != null && <span className="ml-1 shrink-0 rounded bg-[var(--accent)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">{t.score}</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--muted)]">
                        {t.total_views != null && <span>조회 {compact(Number(t.total_views) || 0)}</span>}
                        {t.videos != null && <span>영상 {t.videos}</span>}
                        {t.activity > 0 && <span className="ml-auto">💬 {t.activity}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 드로어 */}
      {sel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setSel(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-[18px] font-black">@{sel.handle}</h2>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--muted)]">
                  {sel.score != null && <span className="rounded bg-[var(--accent)]/10 px-1.5 py-0.5 font-bold text-[var(--accent)]">적합도 {sel.score}</span>}
                  {sel.total_views != null && <span>총 조회 {compact(Number(sel.total_views) || 0)}</span>}
                  {sel.videos != null && <span>영상 {sel.videos}</span>}
                </div>
              </div>
              <button onClick={() => setSel(null)} className="rounded-lg p-1 text-[var(--muted)] hover:bg-slate-100"><X size={18} /></button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/creator/${encodeURIComponent(sel.handle)}`} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--accent)]"><Users size={12} /> 상세</Link>
              <a href={`https://www.tiktok.com/@${sel.handle}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--accent)]"><ExternalLink size={12} /> 틱톡</a>
              <button onClick={() => removeTarget(sel)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50"><Trash2 size={12} /> 삭제</button>
            </div>

            {/* 상태 변경 */}
            <div className="mt-4">
              <div className="mb-1.5 text-[11px] font-bold text-[var(--muted)]">파이프라인 상태</div>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => setStatus(sel, s)} className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${sel.status === s ? S_COLOR[s] + " ring-2 ring-[var(--accent)]/30" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>{S_LABEL[s]}</button>
                ))}
              </div>
            </div>

            {/* 메모 추가 */}
            <div className="mt-4">
              <div className="mb-1.5 text-[11px] font-bold text-[var(--muted)]">메모 · 활동 기록</div>
              <div className="flex gap-1.5">
                <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addNote(); }} placeholder="접촉 내용·다음 액션 등" className="flex-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]" />
                <button onClick={addNote} disabled={!note.trim()} className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40"><Send size={13} /></button>
              </div>
            </div>

            {/* 타임라인 */}
            <div className="mt-4">
              <div className="mb-1.5 text-[11px] font-bold text-[var(--muted)]">타임라인</div>
              {activity.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-[11px] text-[var(--muted)]">기록이 없습니다.</p>
              ) : (
                <ul className="space-y-2">
                  {activity.map((a) => (
                    <li key={a.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5">
                      <div className="flex items-center justify-between text-[10px] text-[var(--muted)]">
                        <span className="font-semibold">{a.kind === "status" ? "상태 변경" : a.kind === "note" ? "메모" : a.kind}{a.actor ? ` · ${a.actor}` : ""}</span>
                        <span>{dt(a.created_at)}</span>
                      </div>
                      {a.body && <p className="mt-1 whitespace-pre-wrap text-[12px]">{a.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

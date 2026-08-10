"use client";

// 아웃리치 파이프라인 보드 (관리자 전용) — /creators·/creator·/product 에서 추가한 대상 관리.
// 상태 칸반 + 대상 드로어(타임라인·메모·상태변경·삭제) + 세그먼트 필터. 데이터: /api/admin/outreach.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import { ShieldCheck, Loader2, ArrowLeft, ExternalLink, Trash2, X, Send, RefreshCw, Users, FileText, Copy, Check, Download, Plus } from "lucide-react";

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
interface Template { id: number; name: string; channel: string; subject: string | null; body: string; updated_at: string }

// 템플릿 변수 치환 — {{handle}}·{{views}}·{{score}} (대상에 있는 값만).
function renderTemplate(text: string, t: Target): string {
  return text
    .replace(/\{\{\s*handle\s*\}\}/gi, `@${t.handle}`)
    .replace(/\{\{\s*views\s*\}\}/gi, compact(Number(t.total_views) || 0))
    .replace(/\{\{\s*score\s*\}\}/gi, t.score != null ? String(t.score) : "-");
}

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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTpl, setShowTpl] = useState(false);
  const [tplForm, setTplForm] = useState<{ id?: number; name: string; channel: string; subject: string; body: string }>({ name: "", channel: "email", subject: "", body: "" });
  const [ownerInput, setOwnerInput] = useState("");
  const [genTplId, setGenTplId] = useState<number | "">("");
  const [copied, setCopied] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ perDay: number; sentToday: number; remaining: number; pending: number; configured: boolean } | null>(null);
  const [perDayInput, setPerDayInput] = useState(50);
  const [sendTplId, setSendTplId] = useState<number | "">("");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" }).then((r) => r.json()).then((j) => setAuthed(!!j.authed)).catch(() => setAuthed(false));
  }, []);

  const loadQuota = useCallback(async () => {
    const q = await fetch("/api/admin/outreach/send", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (q?.ok) { setQuota(q); setPerDayInput(q.perDay); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = listFilter ? `&listId=${encodeURIComponent(listFilter)}` : "";
      const [tRes, sRes, tplRes] = await Promise.all([
        fetch(`/api/admin/outreach?type=targets${q}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/outreach?type=lists`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/outreach?type=templates`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      setTargets(tRes.targets || []);
      setSegments(sRes.lists || []);
      setTemplates(tplRes.templates || []);
      loadQuota();
    } finally { setLoading(false); }
  }, [listFilter, loadQuota]);

  async function saveQuota() {
    await fetch("/api/admin/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setQuota", perDay: perDayInput }) });
    loadQuota();
  }
  async function runSend(dry: boolean) {
    if (!sendTplId) { setSendMsg("발송 템플릿을 선택하세요"); return; }
    setSending(true); setSendMsg(null);
    try {
      const r = await fetch("/api/admin/outreach/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: sendTplId, dry }) });
      const j = await r.json();
      if (j.ok) setSendMsg(`${dry ? "수기기록" : "발송"} ${j.sent ?? 0}건${j.failed ? ` · 실패 ${j.failed}` : ""}${j.reason ? ` · ${j.reason}` : ""} · 오늘 ${j.sentToday}/${j.perDay}`);
      else setSendMsg(j.error || (j.configured === false ? "이메일 미설정" : "실패"));
      load();
    } finally { setSending(false); }
  }

  useEffect(() => { if (authed) load(); }, [authed, load]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) setAuthed(true); else setErr(d.error || "로그인 실패");
  }

  async function openTarget(t: Target) {
    setSel(t); setNote(""); setActivity([]); setOwnerInput(t.owner || ""); setGenTplId(""); setCopied(false);
    const j = await fetch(`/api/admin/outreach?type=activity&id=${t.id}`, { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
    setActivity(j.activity || []);
  }

  async function saveOwner() {
    if (!sel) return;
    await fetch("/api/admin/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setOwner", id: sel.id, owner: ownerInput }) });
    setTargets((prev) => prev.map((x) => (x.id === sel.id ? { ...x, owner: ownerInput || null } : x)));
    setSel({ ...sel, owner: ownerInput || null }); openTarget({ ...sel, owner: ownerInput || null });
  }

  async function saveTemplate() {
    if (!tplForm.name.trim() || !tplForm.body.trim()) return;
    await fetch("/api/admin/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "saveTemplate", ...tplForm }) });
    setTplForm({ name: "", channel: "email", subject: "", body: "" });
    const j = await fetch(`/api/admin/outreach?type=templates`, { cache: "no-store" }).then((r) => r.json());
    setTemplates(j.templates || []);
  }
  async function deleteTemplate(id: number) {
    if (!confirm("템플릿을 삭제할까요?")) return;
    await fetch("/api/admin/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "deleteTemplate", id }) });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }
  async function importProposals() {
    setImportMsg(null);
    const r = await fetch("/api/admin/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "importProposals" }) });
    const j = await r.json();
    setImportMsg(j.added != null ? `제안 ${j.total}건 중 ${j.added}건 신규 추가` : (j.error || "실패"));
    load();
  }
  async function addAll(onlyEmail: boolean) {
    if (!confirm(onlyEmail ? "공개 이메일이 있는 크리에이터 전체를 아웃리치에 추가할까요?" : "보유한 모든 크리에이터를 아웃리치에 추가할까요? (많을 수 있음)")) return;
    setImportMsg(null);
    const r = await fetch("/api/admin/outreach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "addAllTargets", onlyEmail }) });
    const j = await r.json();
    setImportMsg(j.added != null ? `${onlyEmail ? "이메일 보유 " : "전체 "}크리에이터 ${j.added}건 신규 추가 (대상 ${j.total})` : (j.error || "실패"));
    load();
  }
  function copyMessage() {
    const tpl = templates.find((t) => t.id === genTplId);
    if (!tpl || !sel) return;
    const msg = (tpl.subject ? `제목: ${renderTemplate(tpl.subject, sel)}\n\n` : "") + renderTemplate(tpl.body, sel);
    navigator.clipboard?.writeText(msg).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
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
          <button onClick={() => setShowTpl((v) => !v)} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]"><FileText size={13} /> 템플릿 ({templates.length})</button>
          <button onClick={importProposals} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]"><Download size={13} /> 제안 가져오기</button>
          <button onClick={() => addAll(true)} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]" title="공개 이메일 보유 크리에이터만 = 연결 가능성↑">✉ 이메일보유 전체추가</button>
          <button onClick={() => addAll(false)} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]" title="보유 크리에이터 전체">👥 전체추가</button>
          <button onClick={load} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> 새로고침</button>
        </div>
      </div>
      {importMsg && <p className="mb-2 text-[11px] font-semibold text-emerald-700">{importMsg}</p>}

      {/* 발송 — 일일 한도(rate limit) 준수 */}
      <div className="mb-3 rounded-xl border border-[var(--border)] bg-slate-50/60 p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-[12px] font-black"><Send size={13} className="text-[var(--accent)]" /> 발송 (일일 한도 준수)</span>
          {quota && (
            <>
              <span className="text-[11px] font-bold">오늘 <span className={quota.remaining === 0 ? "text-rose-600" : "text-emerald-600"}>{quota.sentToday}/{quota.perDay}</span> · 대기 {quota.pending}</span>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, (quota.sentToday / quota.perDay) * 100)}%` }} /></div>
              {!quota.configured && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Resend 미설정 — 수기기록만</span>}
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <label className="text-[10px] font-semibold text-[var(--muted)]">일일 한도</label>
            <input type="number" min={1} max={500} value={perDayInput} onChange={(e) => setPerDayInput(Number(e.target.value))} className="w-16 rounded-md border border-[var(--border)] px-2 py-1 text-[12px]" />
            <button onClick={saveQuota} className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-semibold text-[var(--accent)]">저장</button>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select value={sendTplId} onChange={(e) => setSendTplId(e.target.value ? Number(e.target.value) : "")} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[12px]">
            <option value="">발송 템플릿 선택…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button onClick={() => runSend(false)} disabled={sending || !quota?.configured || (quota?.remaining ?? 0) === 0}
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40">
            <Send size={13} /> {sending ? "발송 중…" : `오늘 배치 발송 (남은 ${quota?.remaining ?? 0})`}
          </button>
          <button onClick={() => runSend(true)} disabled={sending} title="실제 발송 없이 접촉 기록만(수기 발송 대응). 한도 동일 적용."
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-semibold text-[var(--muted)] disabled:opacity-40">수기 기록</button>
          {sendMsg && <span className="text-[11px] font-semibold text-emerald-700">{sendMsg}</span>}
        </div>
        <p className="mt-1.5 text-[10px] text-[var(--muted)]">이메일 보유·미접촉(발굴) 대상을 적합도순으로 <b>한도 내에서만</b> 발송 → 상태 자동 접촉 전환. 도달성 위해 하루 소량부터 권장(예: 30~50).</p>
      </div>

      {/* 템플릿 관리 */}
      {showTpl && (
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-black">메시지 템플릿 <span className="text-[10px] font-normal text-[var(--muted)]">· 변수: {"{{handle}} {{views}} {{score}}"}</span></h2>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-white p-3">
              <div className="flex gap-1.5">
                <input value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} placeholder="템플릿 이름" className="flex-1 rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]" />
                <select value={tplForm.channel} onChange={(e) => setTplForm({ ...tplForm, channel: e.target.value })} className="rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px] outline-none">
                  <option value="email">이메일</option><option value="dm">DM</option><option value="form">폼</option>
                </select>
              </div>
              <input value={tplForm.subject} onChange={(e) => setTplForm({ ...tplForm, subject: e.target.value })} placeholder="제목(이메일)" className="mt-1.5 w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]" />
              <textarea value={tplForm.body} onChange={(e) => setTplForm({ ...tplForm, body: e.target.value })} placeholder={"안녕하세요 {{handle}}님, 평균 조회 {{views}}의 성과 잘 봤습니다..."} rows={4} className="mt-1.5 w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]" />
              <button onClick={saveTemplate} disabled={!tplForm.name.trim() || !tplForm.body.trim()} className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-3 py-1.5 text-[12px] font-bold text-white disabled:opacity-40"><Plus size={13} /> {tplForm.id ? "수정 저장" : "템플릿 추가"}</button>
              {tplForm.id && <button onClick={() => setTplForm({ name: "", channel: "email", subject: "", body: "" })} className="mt-1.5 ml-2 text-[11px] text-[var(--muted)] underline">취소</button>}
            </div>
            <div className="space-y-2">
              {templates.length === 0 ? <p className="text-[11px] text-[var(--muted)]">템플릿이 없습니다.</p> : templates.map((t) => (
                <div key={t.id} className="rounded-lg border border-[var(--border)] bg-white p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold">{t.name} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">{t.channel}</span></span>
                    <div className="flex gap-1.5">
                      <button onClick={() => setTplForm({ id: t.id, name: t.name, channel: t.channel, subject: t.subject || "", body: t.body })} className="text-[11px] text-[var(--accent)] underline">편집</button>
                      <button onClick={() => deleteTemplate(t.id)} className="text-[11px] text-rose-500 underline">삭제</button>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-[11px] text-[var(--muted)]">{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

            {/* 담당자 배정 */}
            <div className="mt-4">
              <div className="mb-1.5 text-[11px] font-bold text-[var(--muted)]">담당자</div>
              <div className="flex gap-1.5">
                <input value={ownerInput} onChange={(e) => setOwnerInput(e.target.value)} placeholder="담당자명(예: 지영)" className="flex-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]" />
                <button onClick={saveOwner} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-bold text-[var(--muted)] hover:text-[var(--accent)]">배정</button>
              </div>
            </div>

            {/* 메시지 생성(템플릿 변수치환) */}
            {templates.length > 0 && (
              <div className="mt-4">
                <div className="mb-1.5 text-[11px] font-bold text-[var(--muted)]">메시지 생성 (템플릿)</div>
                <div className="flex gap-1.5">
                  <select value={genTplId} onChange={(e) => setGenTplId(e.target.value ? Number(e.target.value) : "")} className="flex-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]">
                    <option value="">템플릿 선택…</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button onClick={copyMessage} disabled={!genTplId} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[12px] font-bold disabled:opacity-40 ${copied ? "bg-emerald-50 text-emerald-700" : "bg-[var(--accent)] text-white"}`}>{copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "복사됨" : "복사"}</button>
                </div>
                {genTplId !== "" && (() => {
                  const tpl = templates.find((t) => t.id === genTplId);
                  if (!tpl) return null;
                  return <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-[12px]">
                    {tpl.subject && <div className="font-semibold">제목: {renderTemplate(tpl.subject, sel)}</div>}
                    <div className="mt-1 whitespace-pre-wrap">{renderTemplate(tpl.body, sel)}</div>
                  </div>;
                })()}
              </div>
            )}

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

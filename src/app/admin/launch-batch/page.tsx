"use client";

// 글로벌 진출 배치 1기 — 전용 관리자(신청 목록/상세/상태·메모). 관리자 전용, 서버측 인증.
// 데이터: /api/admin/launch-batch (GET 목록·상세 / PATCH 상태·메모). 외부 전달 없음.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import { ShieldCheck, Loader2, ArrowLeft, RefreshCw, Search, LogOut, Save, Inbox } from "lucide-react";

const STATUSES = ["new", "contacting", "selected", "onboarding", "done", "hold"] as const;
type Status = (typeof STATUSES)[number];
const STATUS_LABEL: Record<Status, string> = {
  new: "신규", contacting: "연락중", selected: "선정", onboarding: "온보딩", done: "완료", hold: "보류",
};
const STATUS_CLS: Record<Status, string> = {
  new: "bg-sky-100 text-sky-700",
  contacting: "bg-amber-100 text-amber-700",
  selected: "bg-violet-100 text-violet-700",
  onboarding: "bg-emerald-100 text-emerald-700",
  done: "bg-zinc-200 text-zinc-700",
  hold: "bg-rose-100 text-rose-700",
};

interface ListItem {
  id: number; brand: string; manager: string; email: string; phone: string | null;
  regions: string[]; region_count: number; cost_incl: number;
  is_test: boolean; status: string; created_at: string; updated_at: string;
}
interface Detail extends ListItem {
  product_url: string | null; sea_countries: string[]; message: string | null;
  cost_supply: number; consent: boolean; consent_version: string | null; consent_at: string | null;
  admin_note: string | null;
}

const won = (n: number) => "₩" + Number(n || 0).toLocaleString();
const kst = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? String(s) : d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
};
const asArr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : typeof v === "string" ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } })() : []);

export default function LaunchBatchAdmin() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [loginErr, setLoginErr] = useState<string | null>(null);

  const [items, setItems] = useState<ListItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [includeTest, setIncludeTest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [selId, setSelId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<Status>("new");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" }).then((r) => r.json()).then((j) => setAuthed(!!j.authed)).catch(() => setAuthed(false));
  }, []);

  const load = useCallback(() => {
    setLoading(true); setLoadErr(null);
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (statusFilter) sp.set("status", statusFilter);
    if (includeTest) sp.set("test", "1");
    fetch("/api/admin/launch-batch?" + sp.toString(), { cache: "no-store" })
      .then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "조회 실패"); return r.json(); })
      .then((j) => { setItems((j.items || []).map((it: ListItem) => ({ ...it, regions: asArr(it.regions) }))); setCounts(j.counts || {}); })
      .catch((e) => setLoadErr(String(e.message || e)))
      .finally(() => setLoading(false));
  }, [q, statusFilter, includeTest]);
  useEffect(() => { if (authed) load(); }, [authed, load]);

  const openDetail = useCallback((id: number) => {
    setSelId(id); setDetail(null); setDetailLoading(true); setSaveMsg(null);
    fetch("/api/admin/launch-batch?id=" + id, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j.item) throw new Error("not found");
        const it = j.item;
        const d: Detail = { ...it, regions: asArr(it.regions), sea_countries: asArr(it.sea_countries) };
        setDetail(d); setNoteDraft(d.admin_note || ""); setStatusDraft((STATUSES as readonly string[]).includes(d.status) ? (d.status as Status) : "new");
      })
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoginErr(null);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) setAuthed(true); else setLoginErr(d.error || "로그인 실패");
  }
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    setAuthed(false);
  }

  async function save() {
    if (!detail) return;
    setSaving(true); setSaveMsg(null);
    try {
      const r = await fetch("/api/admin/launch-batch", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: detail.id, status: statusDraft, note: noteDraft }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || "저장 실패");
      // 실제 API readback — 새로고침 후 유지 확인
      openDetail(detail.id);
      load();
      setSaveMsg("저장됨");
    } catch (e) {
      setSaveMsg("오류: " + String((e as Error).message || e));
    } finally { setSaving(false); }
  }

  if (authed === null) return <PageShell><div className="py-24 text-center text-[var(--muted)]"><Loader2 className="mx-auto animate-spin" /></div></PageShell>;
  if (!authed) {
    return (
      <PageShell>
        <div className="mx-auto max-w-sm py-16">
          <div className="kt-card p-6">
            <h1 className="flex items-center gap-2 text-[18px] font-black"><ShieldCheck size={18} className="text-[var(--accent)]" /> 관리자 로그인</h1>
            <p className="mt-1 text-[11px] text-[var(--muted)]">글로벌 진출 배치 1기 신청 관리(관리자 전용)</p>
            <form onSubmit={login} className="mt-4 space-y-2.5">
              <input value={u} onChange={(e) => setU(e.target.value)} placeholder="아이디" autoComplete="username" className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
              <input type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder="비밀번호" autoComplete="current-password" className="w-full rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]" />
              {loginErr && <p className="text-[11px] font-semibold text-rose-600">{loginErr}</p>}
              <button className="kt-btn kt-btn-primary w-full py-2.5 text-[12px]">로그인</button>
            </form>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Link href="/admin" className="mb-1 inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--accent)]"><ArrowLeft size={12} /> 관리자 콘솔</Link>
          <h1 className="flex items-center gap-2 text-[20px] font-black tracking-tight"><Inbox size={18} className="text-[var(--accent)]" /> 글로벌 진출 배치 1기 신청</h1>
          <p className="text-[11px] text-[var(--muted)]">start.glovek.space 온라인 접수 · 실집계 {Object.values(counts).reduce((a, b) => a + b, 0)}건(테스트 제외)</p>
        </div>
        <button onClick={logout} className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--muted)] hover:text-rose-600"><LogOut size={12} /> 로그아웃</button>
      </div>

      {/* 상태별 집계 */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <button onClick={() => setStatusFilter("")} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${statusFilter === "" ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}>전체</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "" : s)} className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${statusFilter === s ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}>
            {STATUS_LABEL[s]} <span className="opacity-70">{counts[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* 검색/옵션 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1.5">
            <Search size={13} className="text-[var(--muted)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="브랜드·이메일·전화 검색" className="w-48 text-[12px] outline-none" />
          </div>
          <button className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]">검색</button>
        </form>
        <label className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
          <input type="checkbox" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} /> 테스트 포함
        </label>
        <button onClick={load} className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[11px] text-[var(--muted)]"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> 새로고침</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* 목록 */}
        <div className="kt-card overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-[var(--muted)]"><Loader2 className="mx-auto animate-spin" /></div>
          ) : loadErr ? (
            <div className="py-12 text-center text-[12px] text-rose-600">{loadErr}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-[12px] text-[var(--muted)]">신청 내역이 없습니다.</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--bg-soft,#f7f7f8)] text-left text-[10px] uppercase text-[var(--muted)]">
                <tr><th className="px-3 py-2">접수</th><th className="px-3 py-2">브랜드</th><th className="px-3 py-2">권역</th><th className="px-3 py-2">비용(VAT)</th><th className="px-3 py-2">상태</th></tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} onClick={() => openDetail(it.id)} className={`cursor-pointer border-t border-[var(--border)] hover:bg-[var(--bg-soft,#f7f7f8)] ${selId === it.id ? "bg-[var(--bg-soft,#f2f2f3)]" : ""}`}>
                    <td className="px-3 py-2 whitespace-nowrap text-[var(--muted)]">{kst(it.created_at)}</td>
                    <td className="px-3 py-2 font-semibold">{it.brand}{it.is_test && <span className="ml-1 rounded bg-zinc-200 px-1 text-[9px] text-zinc-600">TEST</span>}<div className="text-[10px] font-normal text-[var(--muted)] whitespace-nowrap">{it.phone || "전화 미수집"}</div></td>
                    <td className="px-3 py-2 whitespace-nowrap">{it.regions.join("·")} <span className="text-[var(--muted)]">({it.region_count})</span></td>
                    <td className="px-3 py-2 whitespace-nowrap">{won(it.cost_incl)}</td>
                    <td className="px-3 py-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_CLS[(STATUSES as readonly string[]).includes(it.status) ? (it.status as Status) : "new"]}`}>{STATUS_LABEL[(STATUSES as readonly string[]).includes(it.status) ? (it.status as Status) : "new"]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 상세 */}
        <div className="kt-card p-4">
          {selId === null ? (
            <p className="py-12 text-center text-[12px] text-[var(--muted)]">목록에서 신청을 선택하세요.</p>
          ) : detailLoading ? (
            <div className="py-12 text-center text-[var(--muted)]"><Loader2 className="mx-auto animate-spin" /></div>
          ) : !detail ? (
            <p className="py-12 text-center text-[12px] text-rose-600">불러오기 실패</p>
          ) : (
            <div className="space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-black">{detail.brand}{detail.is_test && <span className="ml-1.5 rounded bg-zinc-200 px-1.5 py-0.5 text-[9px] text-zinc-600">TEST</span>}</h2>
                <span className="text-[10px] text-[var(--muted)]">접수 {kst(detail.created_at)} (KST)</span>
              </div>
              <Field k="담당자" v={detail.manager} />
              <Field k="이메일" v={<a className="break-all text-[var(--accent)] underline" href={`mailto:${detail.email}`}>{detail.email}</a>} />
              <Field k="전화번호" v={detail.phone ? <a className="text-[var(--accent)] underline" href={`tel:${detail.phone}`}>{detail.phone}</a> : <span className="text-[var(--muted)]">미수집</span>} />
              <Field k="제품 URL" v={detail.product_url ? <a className="break-all text-[var(--accent)] underline" href={detail.product_url} target="_blank" rel="noreferrer noopener">{detail.product_url}</a> : "—"} />
              <Field k="희망 권역" v={`${detail.regions.join(", ")} (${detail.region_count}권역)`} />
              {detail.regions.includes("동남아") && <Field k="동남아 국가" v={detail.sea_countries.join(", ") || "—"} />}
              <Field k="비용(서버 산정)" v={`공급가 ${won(detail.cost_supply)} · VAT 포함 ${won(detail.cost_incl)}`} />
              <Field k="개인정보 동의" v={detail.consent ? `동의 (v${detail.consent_version || "-"} · ${kst(detail.consent_at)})` : "미동의"} />
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-[var(--muted)]">메시지</p>
                <p className="whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--bg-soft,#f7f7f8)] p-2">{detail.message || "—"}</p>
              </div>

              <div className="border-t border-[var(--border)] pt-2.5">
                <p className="mb-1 text-[10px] font-bold uppercase text-[var(--muted)]">상태</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button key={s} onClick={() => setStatusDraft(s)} className={`rounded-md px-2 py-1 text-[11px] font-semibold ${statusDraft === s ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}>{STATUS_LABEL[s]}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase text-[var(--muted)]">내부 메모</p>
                <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} className="w-full rounded-md border border-[var(--border)] p-2 text-[12px] outline-none focus:border-[var(--accent)]" placeholder="내부 메모(신청자에게 노출되지 않음)" />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={save} disabled={saving} className="kt-btn kt-btn-primary inline-flex items-center gap-1 px-3 py-1.5 text-[12px] disabled:opacity-60"><Save size={13} /> {saving ? "저장 중…" : "저장"}</button>
                {saveMsg && <span className={`text-[11px] ${saveMsg.startsWith("오류") ? "text-rose-600" : "text-emerald-600"}`}>{saveMsg}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-[10px] font-bold uppercase text-[var(--muted)] pt-0.5">{k}</span>
      <span className="flex-1">{v}</span>
    </div>
  );
}

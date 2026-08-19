"use client";

// 크리에이터 아웃리치(제품 컨셉 → 필터 → Gmail 그룹 발송 → 이력) — 관리자 전용, 메뉴 비노출.
// 데이터: /api/admin/oc/*. 발송은 등록된 Gmail 발신계정(allow-list)으로만.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import {
  ShieldCheck, Loader2, ArrowLeft, Upload, Trash2, Send, RefreshCw, Users, Package,
  Filter, Mail, History, UserCog, Check, X, Play, Inbox,
} from "lucide-react";

/* ── 타입 ── */
interface OcFilter {
  hasEmail?: boolean; minAvgViews?: number; maxAvgViews?: number; minTotalViews?: number;
  minVideos?: number; maxVideos?: number; brands?: string[]; region?: string; search?: string;
}
interface Product { id: number; name: string; brand: string | null; category: string | null; concept: string | null; usp: string | null; }
interface Sender { id: number; email: string; display_name: string | null; daily_limit: number; active: boolean; configured: boolean; }
interface InboxRow { id: number; mailbox: string; from_email: string; from_name: string | null; subject: string | null; snippet: string | null; received_at: string | null; matched_handle: string | null; matched_campaign_id: number | null; }
interface Campaign { id: number; name: string; status: string; total: number; sent: number; failed: number; created_at: string; product_name: string | null; sender_email: string | null; }
interface CreatorRow { handle: string; email: string | null; avg_views: number | null; total_views: number | null; videos: number | null; brands: string | null; region: string | null; }
interface MsgRow { id: number; handle: string | null; to_email: string; status: string; error: string | null; subject: string | null; sent_at: string | null; }

const compact = (n: number | null | undefined) => {
  const v = Number(n) || 0;
  return v >= 1_000_000 ? (v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1) + "M" : v >= 1_000 ? (v / 1_000).toFixed(v >= 10_000 ? 0 : 1) + "K" : String(v);
};
const dt = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? String(s).slice(0, 16) : d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
};

/* ── 브라우저 CSV 파서(따옴표/콤마/개행 처리) ── */
function parseCSV(text: string): Record<string, string>[] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let field = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; }
      else if (c === "\r") { /* skip */ }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    if (rows[r].length === 1 && rows[r][0] === "") continue;
    const o: Record<string, string> = {};
    headers.forEach((h, i) => { o[h] = rows[r][i] ?? ""; });
    out.push(o);
  }
  return out;
}

const TABS = [
  { k: "data", label: "데이터", icon: Upload },
  { k: "products", label: "제품·컨셉", icon: Package },
  { k: "creators", label: "크리에이터 필터", icon: Filter },
  { k: "compose", label: "발송(캠페인)", icon: Mail },
  { k: "history", label: "발송이력", icon: History },
  { k: "inbox", label: "회신함", icon: Inbox },
  { k: "senders", label: "발신계정", icon: UserCog },
] as const;
type TabKey = (typeof TABS)[number]["k"];

export default function OcConsole() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("data");

  // 공용 데이터
  const [products, setProducts] = useState<Product[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [facetBrands, setFacetBrands] = useState<{ brand: string; n: number }[]>([]);
  const [importStat, setImportStat] = useState<{ total: number; with_email: number } | null>(null);

  // 필터(크리에이터 ↔ 캠페인 공유)
  const [filter, setFilter] = useState<OcFilter>({ hasEmail: true });
  const [preview, setPreview] = useState<{ count: number; withEmail: number; rows: CreatorRow[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session", { cache: "no-store" }).then((r) => r.json()).then((j) => setAuthed(!!j.authed)).catch(() => setAuthed(false));
  }, []);

  const loadAll = useCallback(() => {
    fetch("/api/admin/oc/import").then((r) => r.json()).then(setImportStat).catch(() => {});
    fetch("/api/admin/oc/products").then((r) => r.json()).then((j) => setProducts(j.rows || [])).catch(() => {});
    fetch("/api/admin/oc/senders").then((r) => r.json()).then((j) => setSenders(j.rows || [])).catch(() => {});
    fetch("/api/admin/oc/campaigns").then((r) => r.json()).then((j) => setCampaigns(j.rows || [])).catch(() => {});
    fetch("/api/admin/oc/creators").then((r) => r.json()).then((j) => setFacetBrands(j.brands || [])).catch(() => {});
  }, []);
  useEffect(() => { if (authed) loadAll(); }, [authed, loadAll]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) setAuthed(true); else setErr(d.error || "로그인 실패");
  }

  async function runPreview() {
    setPreviewing(true);
    try {
      const r = await fetch("/api/admin/oc/creators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filter, limit: 30 }) });
      const j = await r.json();
      if (r.ok) setPreview({ count: j.count, withEmail: j.withEmail, rows: j.rows || [] });
      else alert(j.error || "조회 실패");
    } finally { setPreviewing(false); }
  }

  if (authed === null) return <PageShell><div className="py-24 text-center text-[var(--muted)]"><Loader2 className="mx-auto animate-spin" /></div></PageShell>;
  if (!authed) {
    return (
      <PageShell>
        <div className="mx-auto max-w-sm py-16">
          <div className="kt-card p-6">
            <h1 className="flex items-center gap-2 text-[18px] font-black"><ShieldCheck size={18} className="text-[var(--accent)]" /> 관리자 로그인</h1>
            <p className="mt-1 text-[11px] text-[var(--muted)]">크리에이터 아웃리치(관리자 전용)</p>
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

  return (
    <PageShell>
      <div className="mb-3">
        <Link href="/admin" className="mb-1 inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--accent)]"><ArrowLeft size={12} /> 관리자 콘솔</Link>
        <h1 className="flex items-center gap-2 text-[20px] font-black tracking-tight"><Users size={18} className="text-[var(--accent)]" /> 크리에이터 아웃리치</h1>
        <p className="text-[11px] text-[var(--muted)]">
          제품 컨셉 등록 → 인플루언서 필터 → 등록된 Gmail로 그룹 발송 → 이력 관리 · 크리에이터 {importStat?.total?.toLocaleString() || 0}명(이메일 {importStat?.with_email?.toLocaleString() || 0})
        </p>
      </div>

      {/* 탭 */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map(({ k, label, icon: Icon }) => (
          <button key={k} onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold ${tab === k ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "data" && <DataTab stat={importStat} onDone={loadAll} />}
      {tab === "products" && <ProductsTab products={products} reload={loadAll} />}
      {tab === "creators" && (
        <CreatorsTab filter={filter} setFilter={setFilter} facetBrands={facetBrands} preview={preview} previewing={previewing}
          runPreview={runPreview} goCompose={() => setTab("compose")} />
      )}
      {tab === "compose" && (
        <ComposeTab filter={filter} products={products} senders={senders} campaigns={campaigns} preview={preview}
          runPreview={runPreview} reload={loadAll} />
      )}
      {tab === "history" && <HistoryTab campaigns={campaigns} />}
      {tab === "inbox" && <InboxTab senders={senders} />}
      {tab === "senders" && <SendersTab senders={senders} reload={loadAll} />}
    </PageShell>
  );
}

/* ── 데이터(CSV 업로드) ── */
function DataTab({ stat, onDone }: { stat: { total: number; with_email: number } | null; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<{ done: number; total: number; inserted: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setMsg(null); setProg(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) { setMsg("행이 없습니다"); setBusy(false); return; }
      if (!("handle" in rows[0])) { setMsg("handle 컬럼을 찾을 수 없습니다. 원본 CSV인지 확인하세요."); setBusy(false); return; }
      const CH = 500; let inserted = 0;
      for (let i = 0; i < rows.length; i += CH) {
        const chunk = rows.slice(i, i + CH);
        const r = await fetch("/api/admin/oc/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: chunk }) });
        const j = await r.json();
        if (!r.ok) { setMsg("업로드 실패: " + (j.error || r.status)); break; }
        inserted += j.inserted || 0;
        setProg({ done: Math.min(i + CH, rows.length), total: rows.length, inserted });
      }
      setMsg(`완료 · ${inserted.toLocaleString()}행 반영`);
      onDone();
    } catch (e2) {
      setMsg("오류: " + String(e2 instanceof Error ? e2.message : e2));
    } finally { setBusy(false); e.target.value = ""; }
  }

  return (
    <div className="kt-card p-5">
      <h2 className="text-[14px] font-black">크리에이터 데이터 업로드</h2>
      <p className="mt-1 text-[12px] text-[var(--muted)]">
        원본 CSV(<code>tiktok_creators_all_records_final.csv</code>)를 그대로 올리세요. 브라우저에서 파싱해 500행 단위로 안전하게 적재하고, handle 기준으로 업서트합니다.
        기존 데이터는 덮어쓰지 않고 병합됩니다.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <label className={`kt-btn kt-btn-primary cursor-pointer px-4 py-2 text-[12px] ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} CSV 선택
          <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} className="hidden" />
        </label>
        {stat && <span className="text-[12px] text-[var(--muted)]">현재 적재: <b>{stat.total.toLocaleString()}</b>명 · 이메일 보유 <b>{stat.with_email.toLocaleString()}</b></span>}
      </div>
      {prog && (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.round((prog.done / prog.total) * 100)}%` }} />
          </div>
          <div className="mt-1 text-[11px] text-[var(--muted)]">{prog.done.toLocaleString()} / {prog.total.toLocaleString()} · 반영 {prog.inserted.toLocaleString()}</div>
        </div>
      )}
      {msg && <p className="mt-2 text-[12px] font-semibold text-[var(--accent)]">{msg}</p>}
    </div>
  );
}

/* ── 제품·컨셉 ── */
function ProductsTab({ products, reload }: { products: Product[]; reload: () => void }) {
  const [f, setF] = useState({ name: "", brand: "", category: "", concept: "", usp: "" });
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!f.name.trim()) { alert("제품명을 입력하세요"); return; }
    setBusy(true);
    const r = await fetch("/api/admin/oc/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    setBusy(false);
    if (r.ok) { setF({ name: "", brand: "", category: "", concept: "", usp: "" }); reload(); }
    else alert((await r.json()).error || "저장 실패");
  }
  async function del(id: number) {
    if (!confirm("삭제할까요?")) return;
    await fetch(`/api/admin/oc/products?id=${id}`, { method: "DELETE" }); reload();
  }
  const inp = "w-full rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]";
  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <div className="kt-card p-5">
        <h2 className="text-[14px] font-black">제품 · 컨셉 등록</h2>
        <div className="mt-3 space-y-2.5">
          <input className={inp} placeholder="제품명 *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className={inp} placeholder="브랜드" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} />
          <input className={inp} placeholder="카테고리 (예: 스킨케어/토너)" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          <textarea className={inp} rows={2} placeholder="컨셉" value={f.concept} onChange={(e) => setF({ ...f, concept: e.target.value })} />
          <textarea className={inp} rows={2} placeholder="USP (핵심 강점)" value={f.usp} onChange={(e) => setF({ ...f, usp: e.target.value })} />
          <button onClick={save} disabled={busy} className="kt-btn kt-btn-primary w-full py-2 text-[12px]">{busy ? "저장 중…" : "등록"}</button>
        </div>
      </div>
      <div className="kt-card p-5">
        <h2 className="text-[14px] font-black">등록된 제품 ({products.length})</h2>
        <div className="mt-3 space-y-2">
          {products.map((p) => (
            <div key={p.id} className="rounded-lg border border-[var(--border)] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[13px] font-bold">{p.name} {p.brand && <span className="text-[11px] text-[var(--muted)]">· {p.brand}</span>}</div>
                  {p.category && <div className="text-[11px] text-[var(--muted)]">{p.category}</div>}
                  {p.concept && <div className="mt-1 text-[12px] text-slate-600">{p.concept}</div>}
                  {p.usp && <div className="mt-0.5 text-[12px] text-[var(--accent)]">USP · {p.usp}</div>}
                </div>
                <button onClick={() => del(p.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {!products.length && <p className="text-[12px] text-[var(--muted)]">아직 등록된 제품이 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}

/* ── 크리에이터 필터 ── */
function CreatorsTab({ filter, setFilter, facetBrands, preview, previewing, runPreview, goCompose }: {
  filter: OcFilter; setFilter: (f: OcFilter) => void; facetBrands: { brand: string; n: number }[];
  preview: { count: number; withEmail: number; rows: CreatorRow[] } | null; previewing: boolean; runPreview: () => void; goCompose: () => void;
}) {
  const inp = "w-full rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]";
  const tier = (min: number) => setFilter({ ...filter, minAvgViews: min || undefined });
  const toggleBrand = (b: string) => {
    const cur = filter.brands || [];
    setFilter({ ...filter, brands: cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b] });
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <div className="kt-card p-5">
        <h2 className="text-[14px] font-black">필터</h2>
        <p className="mt-1 text-[11px] text-[var(--muted)]">이 데이터셋은 팔로워 값이 없어 <b>평균 조회수(avg_views)</b>로 규모를 판단합니다.</p>

        <label className="mt-3 flex items-center gap-2 text-[12px]">
          <input type="checkbox" checked={!!filter.hasEmail} onChange={(e) => setFilter({ ...filter, hasEmail: e.target.checked })} />
          이메일 보유(발송 가능)만
        </label>

        <div className="mt-3 text-[11px] font-bold text-[var(--muted)]">규모(평균 조회수)</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {[["전체", 0], ["1K+", 1000], ["10K+", 10000], ["100K+", 100000], ["1M+", 1000000]].map(([label, v]) => (
            <button key={label} onClick={() => tier(v as number)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${(filter.minAvgViews || 0) === v ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}>{label}</button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className={inp} type="number" placeholder="avg 최소" value={filter.minAvgViews ?? ""} onChange={(e) => setFilter({ ...filter, minAvgViews: e.target.value ? +e.target.value : undefined })} />
          <input className={inp} type="number" placeholder="avg 최대" value={filter.maxAvgViews ?? ""} onChange={(e) => setFilter({ ...filter, maxAvgViews: e.target.value ? +e.target.value : undefined })} />
          <input className={inp} type="number" placeholder="총조회수 최소" value={filter.minTotalViews ?? ""} onChange={(e) => setFilter({ ...filter, minTotalViews: e.target.value ? +e.target.value : undefined })} />
          <input className={inp} type="number" placeholder="영상수 최소" value={filter.minVideos ?? ""} onChange={(e) => setFilter({ ...filter, minVideos: e.target.value ? +e.target.value : undefined })} />
        </div>
        <input className={`${inp} mt-2`} placeholder="지역(부분일치, 예: canada)" value={filter.region ?? ""} onChange={(e) => setFilter({ ...filter, region: e.target.value })} />
        <input className={`${inp} mt-2`} placeholder="핸들 검색(부분일치)" value={filter.search ?? ""} onChange={(e) => setFilter({ ...filter, search: e.target.value })} />

        <div className="mt-3 text-[11px] font-bold text-[var(--muted)]">브랜드 이력(카테고리 시그널) — 하나라도 포함</div>
        <div className="mt-1 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {facetBrands.map((b) => (
            <button key={b.brand} onClick={() => toggleBrand(b.brand)}
              className={`rounded-md px-2 py-0.5 text-[11px] ${(filter.brands || []).includes(b.brand) ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}>
              {b.brand} <span className="opacity-60">{b.n}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={runPreview} disabled={previewing} className="kt-btn kt-btn-primary flex-1 py-2 text-[12px]">{previewing ? "조회 중…" : "조회"}</button>
          <button onClick={() => setFilter({ hasEmail: true })} className="kt-btn kt-btn-outline px-3 py-2 text-[12px]">초기화</button>
        </div>
      </div>

      <div className="kt-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-black">결과</h2>
          {preview && (
            <button onClick={goCompose} className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]"><Mail size={13} /> 이 조건으로 캠페인 만들기</button>
          )}
        </div>
        {preview ? (
          <>
            <div className="mt-2 flex gap-4 text-[13px]">
              <span>대상 <b className="text-[var(--accent)]">{preview.count.toLocaleString()}</b>명</span>
              <span>이메일 보유 <b>{preview.withEmail.toLocaleString()}</b>명</span>
            </div>
            <div className="mt-3 max-h-[440px] overflow-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-[11.5px]">
                <thead className="sticky top-0 bg-slate-50 text-left text-[var(--muted)]">
                  <tr><th className="px-2 py-1.5">handle</th><th className="px-2 py-1.5">email</th><th className="px-2 py-1.5 text-right">avg</th><th className="px-2 py-1.5 text-right">total</th><th className="px-2 py-1.5">brands</th></tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.handle} className="border-t border-[var(--border)]">
                      <td className="px-2 py-1.5 font-medium">@{r.handle}</td>
                      <td className="px-2 py-1.5 text-[var(--muted)]">{r.email || "—"}</td>
                      <td className="px-2 py-1.5 text-right">{compact(r.avg_views)}</td>
                      <td className="px-2 py-1.5 text-right">{compact(r.total_views)}</td>
                      <td className="px-2 py-1.5 text-[var(--muted)] max-w-[220px] truncate">{r.brands || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-[var(--muted)]">상위 30명 미리보기 · 실제 발송은 전체 대상에 적용됩니다.</p>
          </>
        ) : <p className="mt-3 text-[12px] text-[var(--muted)]">필터를 설정하고 [조회]를 누르세요.</p>}
      </div>
    </div>
  );
}

/* ── 발송(캠페인) ── */
const DEFAULT_BODY = `안녕하세요 @{{handle}} 님,

{{brand}}의 신제품 「{{product}}」 협업을 제안드립니다.
- 카테고리: {{category}}
- 핵심: {{usp}}

콘텐츠 제작에 관심 있으시면 회신 부탁드립니다. 감사합니다.`;

function ComposeTab({ filter, products, senders, campaigns, preview, runPreview, reload }: {
  filter: OcFilter; products: Product[]; senders: Sender[]; campaigns: Campaign[];
  preview: { count: number; withEmail: number } | null; runPreview: () => void; reload: () => void;
}) {
  const [name, setName] = useState("");
  const [productId, setProductId] = useState<number | "">("");
  const [senderId, setSenderId] = useState<number | "">("");
  const [subject, setSubject] = useState("[{{brand}}] {{product}} 크리에이터 협업 제안");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [busy, setBusy] = useState(false);
  const [sendState, setSendState] = useState<{ id: number; sent: number; failed: number; queued: number; running: boolean; note?: string } | null>(null);
  const inp = "w-full rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]";

  async function createCampaign() {
    if (!name.trim() || !subject.trim() || !body.trim()) { alert("캠페인명·제목·본문을 입력하세요"); return; }
    if (!senderId) { alert("발신계정을 선택하세요"); return; }
    setBusy(true);
    const r = await fetch("/api/admin/oc/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, productId: productId || null, senderId, subject, body, filter }),
    });
    const j = await r.json(); setBusy(false);
    if (r.ok) { alert(`캠페인 생성 · 수신자 ${j.total.toLocaleString()}명 확정`); setName(""); reload(); }
    else alert(j.error || "생성 실패");
  }

  async function runSend(id: number, dry = false) {
    setSendState({ id, sent: 0, failed: 0, queued: 0, running: true });
    let guard = 0;
    for (;;) {
      guard++;
      const r = await fetch("/api/admin/oc/campaigns/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: id, batch: 30, dry }) });
      const j = await r.json();
      if (!r.ok) { setSendState((s) => s && { ...s, running: false, note: j.error }); break; }
      setSendState((s) => ({ id, sent: (s?.sent || 0) + (j.sentNow || 0), failed: (s?.failed || 0) + (j.failedNow || 0), queued: j.remainingQueued ?? 0, running: !j.done && j.dailyRemaining > 0, note: j.note }));
      if (j.done || j.dailyRemaining <= 0) break;
      if ((j.sentNow || 0) + (j.failedNow || 0) === 0) break; // 진전 없음 → 중단
      if (guard > 1000) break;
    }
    reload();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="kt-card p-5">
        <h2 className="text-[14px] font-black">새 캠페인(그룹 발송)</h2>
        <div className="mt-1 rounded-md bg-slate-50 px-3 py-2 text-[11px] text-[var(--muted)]">
          현재 필터 대상: {preview ? <b className="text-[var(--accent)]">{preview.withEmail.toLocaleString()}명(이메일 보유)</b> : "미조회"}
          <button onClick={runPreview} className="ml-2 underline">대상 재조회</button>
          <div className="mt-0.5">※ [크리에이터 필터] 탭에서 조건을 설정하면 여기에 반영됩니다.</div>
        </div>
        <div className="mt-3 space-y-2.5">
          <input className={inp} placeholder="캠페인명 *" value={name} onChange={(e) => setName(e.target.value)} />
          <select className={inp} value={productId} onChange={(e) => setProductId(e.target.value ? +e.target.value : "")}>
            <option value="">제품 선택(선택)</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.brand ? ` · ${p.brand}` : ""}</option>)}
          </select>
          <select className={inp} value={senderId} onChange={(e) => setSenderId(e.target.value ? +e.target.value : "")}>
            <option value="">발신계정 선택 *</option>
            {senders.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.email}{s.configured ? "" : " (env 미설정)"}</option>)}
          </select>
          <input className={inp} placeholder="제목" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <textarea className={`${inp} font-mono`} rows={9} value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="text-[11px] text-[var(--muted)]">변수: <code>{"{{handle}} {{views}} {{brands}} {{product}} {{brand}} {{category}} {{concept}} {{usp}} {{region}}"}</code></div>
          <button onClick={createCampaign} disabled={busy} className="kt-btn kt-btn-primary w-full py-2 text-[12px]">{busy ? "생성 중…" : "캠페인 생성(수신자 확정)"}</button>
        </div>
      </div>

      <div className="kt-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-black">캠페인 ({campaigns.length})</h2>
          <button onClick={reload} className="kt-btn kt-btn-outline px-2.5 py-1 text-[11px]"><RefreshCw size={12} /> 새로고침</button>
        </div>
        <div className="mt-3 space-y-2">
          {campaigns.map((c) => {
            const ss = sendState?.id === c.id ? sendState : null;
            const pct = c.total ? Math.round(((c.sent + c.failed) / c.total) * 100) : 0;
            return (
              <div key={c.id} className="rounded-lg border border-[var(--border)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold">{c.name}</div>
                    <div className="text-[11px] text-[var(--muted)]">{c.product_name || "제품없음"} · {c.sender_email || "발신없음"} · {dt(c.created_at)}</div>
                  </div>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${c.status === "done" ? "bg-emerald-100 text-emerald-700" : c.status === "sending" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{c.status}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span>총 {c.total.toLocaleString()} · 발송 {c.sent.toLocaleString()} · 실패 {c.failed.toLocaleString()}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => runSend(c.id, true)} disabled={!!ss?.running} className="kt-btn kt-btn-outline px-2 py-0.5 text-[10px]" title="실제 발송 없이 기록만"><Play size={11} /> 드라이런</button>
                    <button onClick={() => runSend(c.id, false)} disabled={!!ss?.running} className="kt-btn kt-btn-primary px-2 py-0.5 text-[10px]"><Send size={11} /> {ss?.running ? "발송중…" : "발송"}</button>
                  </div>
                </div>
                {ss && <div className="mt-1 text-[11px] text-[var(--accent)]">이번 실행: 발송 {ss.sent} · 실패 {ss.failed} · 남은 {ss.queued}{ss.note ? ` · ${ss.note}` : ""}</div>}
              </div>
            );
          })}
          {!campaigns.length && <p className="text-[12px] text-[var(--muted)]">캠페인이 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}

/* ── 발송이력 ── */
function HistoryTab({ campaigns }: { campaigns: Campaign[] }) {
  const [cid, setCid] = useState<number | "">("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<MsgRow[]>([]);
  const [loading, setLoading] = useState(false);
  const inp = "rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]";

  const load = useCallback(() => {
    if (!cid) { setRows([]); return; }
    setLoading(true);
    const qs = new URLSearchParams({ campaignId: String(cid), limit: "300" });
    if (status) qs.set("status", status);
    fetch(`/api/admin/oc/messages?${qs}`).then((r) => r.json()).then((j) => setRows(j.rows || [])).finally(() => setLoading(false));
  }, [cid, status]);
  useEffect(() => { load(); }, [load]);

  const sc: Record<string, string> = { sent: "bg-emerald-100 text-emerald-700", failed: "bg-rose-100 text-rose-600", queued: "bg-slate-100 text-slate-600", skipped: "bg-amber-100 text-amber-700" };
  return (
    <div className="kt-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <select className={inp} value={cid} onChange={(e) => setCid(e.target.value ? +e.target.value : "")}>
          <option value="">캠페인 선택</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name} (총 {c.total})</option>)}
        </select>
        <select className={inp} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="sent">sent</option><option value="failed">failed</option><option value="queued">queued</option><option value="skipped">skipped</option>
        </select>
        <button onClick={load} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> 새로고침</button>
        <span className="text-[11px] text-[var(--muted)]">{rows.length}건</span>
      </div>
      <div className="mt-3 max-h-[560px] overflow-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-[11.5px]">
          <thead className="sticky top-0 bg-slate-50 text-left text-[var(--muted)]">
            <tr><th className="px-2 py-1.5">상태</th><th className="px-2 py-1.5">handle</th><th className="px-2 py-1.5">email</th><th className="px-2 py-1.5">제목</th><th className="px-2 py-1.5">발송시각</th><th className="px-2 py-1.5">오류</th></tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-[var(--border)]">
                <td className="px-2 py-1.5"><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${sc[m.status] || ""}`}>{m.status}</span></td>
                <td className="px-2 py-1.5">{m.handle ? "@" + m.handle : "—"}</td>
                <td className="px-2 py-1.5 text-[var(--muted)]">{m.to_email}</td>
                <td className="px-2 py-1.5 max-w-[240px] truncate">{m.subject || "—"}</td>
                <td className="px-2 py-1.5 text-[var(--muted)]">{dt(m.sent_at)}</td>
                <td className="px-2 py-1.5 max-w-[200px] truncate text-rose-500">{m.error || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!cid && <p className="mt-2 text-[12px] text-[var(--muted)]">캠페인을 선택하면 수신자별 발송 이력이 표시됩니다.</p>}
    </div>
  );
}

/* ── 발신계정(공용 메일함, 서비스계정 DWD) ── */
function SendersTab({ senders, reload }: { senders: Sender[]; reload: () => void }) {
  const [f, setF] = useState({ email: "", display_name: "", daily_limit: 300 });
  const inp = "w-full rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]";
  async function save() {
    if (!f.email.trim()) { alert("메일함 이메일 필수"); return; }
    const r = await fetch("/api/admin/oc/senders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (r.ok) { setF({ email: "", display_name: "", daily_limit: 300 }); reload(); }
    else alert((await r.json()).error || "저장 실패");
  }
  async function del(id: number) { if (!confirm("삭제?")) return; await fetch(`/api/admin/oc/senders?id=${id}`, { method: "DELETE" }); reload(); }
  async function test(id: number) {
    const to = prompt("테스트 수신 이메일을 입력하세요"); if (!to) return;
    const r = await fetch("/api/admin/oc/senders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test", id, to }) });
    const j = await r.json();
    alert(r.ok ? "발송 성공: " + (j.id || "") : "실패: " + (j.error || ""));
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
      <div className="kt-card p-5">
        <h2 className="text-[14px] font-black">발신 메일함 등록(allow-list)</h2>
        <p className="mt-1 text-[11px] text-[var(--muted)]">등록된 공용 메일함으로만 발송·열람됩니다. Google Workspace <b>서비스계정 + 도메인 전체 위임(DWD)</b>으로 해당 메일함을 impersonate 합니다.</p>
        <div className="mt-3 space-y-2.5">
          <input className={inp} placeholder="공용 메일함 (예: cs@glovek.space)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input className={inp} placeholder="표시 이름 (예: GloveK)" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
          <input className={inp} type="number" placeholder="일일 한도" value={f.daily_limit} onChange={(e) => setF({ ...f, daily_limit: +e.target.value })} />
          <button onClick={save} className="kt-btn kt-btn-primary w-full py-2 text-[12px]">등록 / 수정</button>
        </div>
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] text-[var(--muted)]">
          <b>설정 (한 번만)</b>
          <div className="mt-1">1. Vercel env <code>GOOGLE_SA_KEY_JSON</code> = 서비스계정 키 JSON</div>
          <div>2. Workspace 관리콘솔 → 도메인 위임에 서비스계정 client_id 승인</div>
          <div className="ml-3">scope: <code>gmail.send</code>, <code>gmail.readonly</code></div>
          <div>3. 위임 대상 메일함(예 cs@glovek.space)을 여기 등록</div>
        </div>
      </div>
      <div className="kt-card p-5">
        <h2 className="text-[14px] font-black">등록된 메일함 ({senders.length})</h2>
        <div className="mt-3 space-y-2">
          {senders.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] p-3">
              <div className="min-w-0">
                <div className="text-[13px] font-bold">{s.email} {s.display_name && <span className="text-[11px] text-[var(--muted)]">· {s.display_name}</span>}</div>
                <div className="text-[11px] text-[var(--muted)]">서비스계정 위임 · 일일 {s.daily_limit}
                  {s.configured ? <span className="ml-1 text-emerald-600"><Check size={11} className="inline" /> SA 설정됨</span> : <span className="ml-1 text-rose-500"><X size={11} className="inline" /> SA 미설정</span>}
                  {!s.active && <span className="ml-1 text-slate-400">· 비활성</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => test(s.id)} className="kt-btn kt-btn-outline px-2 py-0.5 text-[10px]">테스트</button>
                <button onClick={() => del(s.id)} className="text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {!senders.length && <p className="text-[12px] text-[var(--muted)]">등록된 메일함이 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}

/* ── 회신함(수신 매칭) ── */
function InboxTab({ senders }: { senders: Sender[] }) {
  const [mailbox, setMailbox] = useState("");
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inp = "rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]";

  const load = useCallback((mb: string) => {
    const qs = mb ? `?mailbox=${encodeURIComponent(mb)}` : "";
    fetch(`/api/admin/oc/inbox${qs}`).then((r) => r.json()).then((j) => setRows(j.rows || [])).catch(() => {});
  }, []);
  useEffect(() => { load(mailbox); }, [mailbox, load]);

  async function sync() {
    if (!mailbox) { alert("메일함을 선택하세요"); return; }
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/oc/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mailbox }) });
    const j = await r.json(); setBusy(false);
    if (r.ok) { setMsg(`동기화 완료 · 조회 ${j.fetched} · 신규 ${j.stored} · 매칭 ${j.matched}`); load(mailbox); }
    else setMsg("실패: " + (j.error || ""));
  }
  return (
    <div className="kt-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <select className={inp} value={mailbox} onChange={(e) => setMailbox(e.target.value)}>
          <option value="">메일함 선택</option>
          {senders.map((s) => <option key={s.id} value={s.email}>{s.email}</option>)}
        </select>
        <button onClick={sync} disabled={busy || !mailbox} className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]">{busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} 최근 30일 동기화</button>
        <span className="text-[11px] text-[var(--muted)]">{rows.length}건 · 회신을 크리에이터/캠페인에 매칭·적재</span>
      </div>
      {msg && <p className="mt-2 text-[12px] font-semibold text-[var(--accent)]">{msg}</p>}
      <div className="mt-3 max-h-[560px] overflow-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-[11.5px]">
          <thead className="sticky top-0 bg-slate-50 text-left text-[var(--muted)]">
            <tr><th className="px-2 py-1.5">보낸사람</th><th className="px-2 py-1.5">제목</th><th className="px-2 py-1.5">내용</th><th className="px-2 py-1.5">매칭</th><th className="px-2 py-1.5">수신</th></tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-[var(--border)] align-top">
                <td className="px-2 py-1.5"><div className="font-medium">{m.from_name || "—"}</div><div className="text-[var(--muted)]">{m.from_email}</div></td>
                <td className="px-2 py-1.5 max-w-[220px]">{m.subject || "—"}</td>
                <td className="px-2 py-1.5 max-w-[280px] text-[var(--muted)]">{m.snippet || ""}</td>
                <td className="px-2 py-1.5">
                  {m.matched_handle && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">@{m.matched_handle}</span>}
                  {m.matched_campaign_id && <span className="ml-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">캠페인#{m.matched_campaign_id}</span>}
                  {!m.matched_handle && !m.matched_campaign_id && <span className="text-slate-400">—</span>}
                </td>
                <td className="px-2 py-1.5 text-[var(--muted)]">{(m.received_at || "").slice(0, 22)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!mailbox && <p className="mt-2 text-[12px] text-[var(--muted)]">메일함을 선택하고 [동기화]를 누르면 회신이 크리에이터·캠페인에 매칭되어 적재됩니다.</p>}
    </div>
  );
}

"use client";

// 크리에이터 아웃리치(제품 컨셉 → 필터 → Gmail 그룹 발송 → 이력) — 관리자 전용, 메뉴 비노출.
// 데이터: /api/admin/oc/*. 발송은 등록된 Gmail 발신계정(allow-list)으로만.
import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import {
  ShieldCheck, Loader2, ArrowLeft, Upload, Trash2, Send, RefreshCw, Users, Package,
  Filter, Mail, History, UserCog, Check, X, Play, Inbox, BarChart3, Link2, Save, LayoutDashboard,
} from "lucide-react";

/* ── 타입 ── */
interface OcFilter {
  hasEmail?: boolean; minAvgViews?: number; maxAvgViews?: number; minTotalViews?: number;
  minVideos?: number; maxVideos?: number; brands?: string[]; region?: string; search?: string;
}
interface Product { id: number; name: string; brand: string | null; category: string | null; country: string | null; concept: string | null; usp: string | null; }

// GloveK 분류/시장 (객관식)
const OC_CATEGORIES = [{ id: "스킨케어", ko: "스킨케어" }, { id: "메이크업", ko: "메이크업" }, { id: "헤어케어", ko: "헤어케어" }];
const OC_COUNTRIES = [{ id: "US", ko: "미국", flag: "🇺🇸" }, { id: "TH", ko: "태국", flag: "🇹🇭" }, { id: "VN", ko: "베트남", flag: "🇻🇳" }, { id: "MY", ko: "말레이시아", flag: "🇲🇾" }, { id: "SG", ko: "싱가포르", flag: "🇸🇬" }];
const COUNTRY_KO: Record<string, string> = Object.fromEntries(OC_COUNTRIES.map((c) => [c.id, `${c.flag} ${c.ko}`]));
interface Sender { id: number; email: string; display_name: string | null; daily_limit: number; active: boolean; configured: boolean; warmup_start: string | null; pause_reason?: string | null; }
interface InboxRow { id: number; mailbox: string; from_email: string; from_name: string | null; subject: string | null; snippet: string | null; body_text: string | null; received_at: string | null; matched_handle: string | null; matched_campaign_id: number | null; status: string; is_bounce: boolean; }
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
  { k: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { k: "data", label: "데이터", icon: Upload },
  { k: "products", label: "제품·컨셉", icon: Package },
  { k: "creators", label: "크리에이터 필터", icon: Filter },
  { k: "compose", label: "발송(캠페인)", icon: Mail },
  { k: "history", label: "발송이력", icon: History },
  { k: "inbox", label: "회신함", icon: Inbox },
  { k: "stats", label: "성과", icon: BarChart3 },
  { k: "match", label: "매칭", icon: Link2 },
  { k: "senders", label: "발신·안전", icon: UserCog },
] as const;
type TabKey = (typeof TABS)[number]["k"];

export default function OcConsole() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("dashboard");

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
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]); // 필터 결과에서 체크로 고른 대상

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
      const r = await fetch("/api/admin/oc/creators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filter, limit: 300 }) });
      const j = await r.json();
      if (r.ok) {
        const rows: CreatorRow[] = j.rows || [];
        setPreview({ count: j.count, withEmail: j.withEmail, rows });
        setSelectedEmails(rows.filter((x) => x.email).map((x) => x.email!.toLowerCase())); // 기본 전체 선택
      } else alert(j.error || "조회 실패");
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

      {tab === "dashboard" && <DashboardTab go={setTab} />}
      {tab === "data" && <DataTab stat={importStat} onDone={loadAll} />}
      {tab === "products" && <ProductsTab products={products} reload={loadAll} />}
      {tab === "creators" && (
        <CreatorsTab filter={filter} setFilter={setFilter} facetBrands={facetBrands} preview={preview} previewing={previewing}
          runPreview={runPreview} goCompose={() => setTab("compose")} selectedEmails={selectedEmails} setSelectedEmails={setSelectedEmails} />
      )}
      {tab === "compose" && (
        <ComposeTab filter={filter} products={products} senders={senders} campaigns={campaigns} preview={preview}
          runPreview={runPreview} reload={loadAll} selectedEmails={selectedEmails} />
      )}
      {tab === "history" && <HistoryTab campaigns={campaigns} />}
      {tab === "inbox" && <InboxTab senders={senders} />}
      {tab === "stats" && <StatsTab />}
      {tab === "match" && <MatchTab facetBrands={facetBrands} products={products} />}
      {tab === "senders" && <SendersTab senders={senders} reload={loadAll} />}
    </PageShell>
  );
}

/* ── 매핑 점검 ── */
interface MapReport {
  oc: { total: number; with_email: number }; creators: { total: number; with_email: number };
  overlap_handle: number; overlap_handle_ci: number; overlap_email: number; only_in_oc: number;
  linked_targets: number; match_rate: number;
  sample_matched: { handle: string; oc_avg: number | null; cr_avg: number | null; email: string | null }[];
  sample_only_oc: { handle: string; avg_views: number | null; email: string | null }[];
}
function MappingCheck() {
  const [rep, setRep] = useState<MapReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    setBusy(true); setErr(null);
    const r = await fetch("/api/admin/oc/mapping"); const j = await r.json(); setBusy(false);
    if (r.ok) setRep(j); else setErr(j.error || "조회 실패");
  }
  return (
    <div className="mt-4 kt-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-black">매핑 점검</h3>
          <p className="text-[11px] text-[var(--muted)]">업로드 데이터가 기존 크리에이터 데이터(분석 <code>creators</code>)·아웃리치 CRM과 <b>handle/email</b>로 연결되는지 확인</p>
        </div>
        <button onClick={run} disabled={busy} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]">{busy ? "확인 중…" : "매핑 확인"}</button>
      </div>
      {err && <p className="mt-2 text-[12px] text-rose-600">{err}</p>}
      {rep && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["업로드(oc)", `${rep.oc.total.toLocaleString()}명`, `이메일 ${rep.oc.with_email.toLocaleString()}`],
              ["기존(creators)", `${rep.creators.total.toLocaleString()}명`, `이메일 ${rep.creators.with_email.toLocaleString()}`],
              ["handle 매칭", `${rep.overlap_handle.toLocaleString()}명`, `일치율 ${rep.match_rate}%`],
              ["email 매칭", `${rep.overlap_email.toLocaleString()}명`, `CRM 연결 ${rep.linked_targets.toLocaleString()}`],
            ].map(([a, b, c]) => (
              <div key={a} className="rounded-lg border border-[var(--border)] p-3">
                <div className="text-[11px] text-[var(--muted)]">{a}</div>
                <div className="text-[18px] font-black">{b}</div>
                <div className="text-[11px] text-[var(--muted)]">{c}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-[var(--muted)]">
            · handle 매칭 {rep.overlap_handle.toLocaleString()}명(대소문자 무시 시 {rep.overlap_handle_ci.toLocaleString()}) · 업로드에만 있는 신규 {rep.only_in_oc.toLocaleString()}명
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] p-3">
              <div className="mb-1 text-[11px] font-bold text-emerald-600">양쪽에 있는 매칭 샘플</div>
              {rep.sample_matched.length ? rep.sample_matched.map((m) => (
                <div key={m.handle} className="text-[11px] text-[var(--muted)]">@{m.handle} · oc {compact(m.oc_avg)} / cr {compact(m.cr_avg)}</div>
              )) : <div className="text-[11px] text-[var(--muted)]">매칭 없음</div>}
            </div>
            <div className="rounded-lg border border-[var(--border)] p-3">
              <div className="mb-1 text-[11px] font-bold text-sky-600">업로드에만 있는 신규 샘플</div>
              {rep.sample_only_oc.length ? rep.sample_only_oc.map((m) => (
                <div key={m.handle} className="text-[11px] text-[var(--muted)]">@{m.handle} · {compact(m.avg_views)} · {m.email || "이메일없음"}</div>
              )) : <div className="text-[11px] text-[var(--muted)]">신규 없음(전부 기존에 존재)</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 대시보드 홈(운영 현황) ── */
interface Dash {
  creators: { total: number; with_email: number };
  campaigns: { total: number; sending: number; done: number; draft: number };
  funnel: { sent: number; opened: number; clicked: number; queued: number; failed: number };
  today: { sent: number; dailyLimit: number; dailyRemaining: number };
  replies: { total: number; new: number };
  suppression: number;
  senders: { total: number; active: number; configured: boolean };
  recentCampaigns: { id: number; name: string; status: string; total: number; sent: number; failed: number; created_at: string; product_name: string | null }[];
}
function DashboardTab({ go }: { go: (t: TabKey) => void }) {
  const [d, setD] = useState<Dash | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { setBusy(true); fetch("/api/admin/oc/dashboard").then((r) => r.json()).then(setD).finally(() => setBusy(false)); }, []);
  useEffect(() => { load(); }, [load]);
  const rate = (n: number, dd: number) => (dd ? ((n / dd) * 100).toFixed(1) : "0") + "%";
  const K = (n: number) => (n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : String(n));

  if (!d) return <div className="kt-card p-8 text-center text-[var(--muted)]"><Loader2 className="mx-auto animate-spin" /></div>;

  const Stat = ({ label, value, sub, tone, onClick }: { label: string; value: React.ReactNode; sub?: string; tone?: string; onClick?: () => void }) => (
    <button onClick={onClick} disabled={!onClick} className={`kt-card p-4 text-left ${onClick ? "cursor-pointer hover:border-[var(--accent)]" : "cursor-default"}`}>
      <div className="text-[11px] text-[var(--muted)]">{label}</div>
      <div className={`mt-1 text-[22px] font-black leading-none ${tone || ""}`}>{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-[var(--muted)]">{sub}</div>}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* 준비 상태 배너 */}
      {(!d.senders.configured || d.creators.total === 0) && (
        <div className="kt-card border-amber-200 bg-amber-50 p-4 text-[12.5px] text-amber-800">
          <b>시작 전 준비</b> —
          {d.creators.total === 0 && <> 크리에이터 데이터가 없습니다. <button onClick={() => go("data")} className="underline">데이터 업로드</button>.</>}
          {!d.senders.configured && <> 발신계정(서비스계정)이 설정되지 않았습니다. <button onClick={() => go("senders")} className="underline">발신·안전</button>에서 확인.</>}
        </div>
      )}

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="크리에이터" value={K(d.creators.total)} sub={`이메일 ${K(d.creators.with_email)}`} onClick={() => go("creators")} />
        <Stat label="캠페인" value={d.campaigns.total} sub={`진행중 ${d.campaigns.sending} · 완료 ${d.campaigns.done}`} onClick={() => go("compose")} />
        <Stat label="오늘 발송" value={K(d.today.sent)} sub={`잔여 ${K(d.today.dailyRemaining)} / ${K(d.today.dailyLimit)}`} tone="text-[var(--accent)]" />
        <Stat label="신규 회신" value={d.replies.new} sub={`누적 회신 ${d.replies.total}`} tone={d.replies.new ? "text-emerald-600" : ""} onClick={() => go("inbox")} />
        <Stat label="발신 메일함" value={`${d.senders.active}/${d.senders.total}`} sub={d.senders.configured ? "SA 설정됨" : "SA 미설정"} tone={d.senders.configured ? "" : "text-rose-500"} onClick={() => go("senders")} />
        <Stat label="제외목록" value={K(d.suppression)} sub="수신거부·바운스" onClick={() => go("senders")} />
      </div>

      {/* 퍼널 */}
      <div className="kt-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-black">발송 퍼널 (전체 누적)</h2>
          <div className="flex gap-2">
            <button onClick={() => go("stats")} className="kt-btn kt-btn-outline px-2.5 py-1 text-[11px]"><BarChart3 size={12} /> 성과 상세</button>
            <button onClick={load} className="kt-btn kt-btn-outline px-2.5 py-1 text-[11px]"><RefreshCw size={12} className={busy ? "animate-spin" : ""} /></button>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["발송", d.funnel.sent, ""], ["오픈", d.funnel.opened, rate(d.funnel.opened, d.funnel.sent)], ["클릭", d.funnel.clicked, rate(d.funnel.clicked, d.funnel.sent)], ["회신", d.replies.total, rate(d.replies.total, d.funnel.sent)]].map(([a, b, c]) => (
            <div key={a as string} className="rounded-lg border border-[var(--border)] p-3">
              <div className="text-[11px] text-[var(--muted)]">{a}</div>
              <div className="text-[20px] font-black">{Number(b).toLocaleString()}</div>
              {c && <div className="text-[11px] text-[var(--accent)]">{c}</div>}
            </div>
          ))}
        </div>
        {(d.funnel.queued > 0 || d.funnel.failed > 0) && <div className="mt-2 text-[11px] text-[var(--muted)]">대기 {d.funnel.queued.toLocaleString()} · 실패 {d.funnel.failed.toLocaleString()}</div>}
      </div>

      {/* 빠른 실행 + 최근 캠페인 */}
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="kt-card p-5">
          <h2 className="text-[14px] font-black">빠른 실행</h2>
          <div className="mt-3 space-y-2">
            <button onClick={() => go("products")} className="kt-btn kt-btn-outline w-full justify-start px-3 py-2 text-[12px]"><Package size={14} /> 제품·컨셉 등록</button>
            <button onClick={() => go("creators")} className="kt-btn kt-btn-outline w-full justify-start px-3 py-2 text-[12px]"><Filter size={14} /> 크리에이터 필터·선택</button>
            <button onClick={() => go("compose")} className="kt-btn kt-btn-primary w-full justify-start px-3 py-2 text-[12px]"><Mail size={14} /> 새 캠페인·발송</button>
            <button onClick={() => go("inbox")} className="kt-btn kt-btn-outline w-full justify-start px-3 py-2 text-[12px]"><Inbox size={14} /> 회신함 확인{d.replies.new ? ` (${d.replies.new})` : ""}</button>
          </div>
        </div>
        <div className="kt-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-black">최근 캠페인</h2>
            <button onClick={() => go("history")} className="text-[11px] text-[var(--muted)] underline">발송이력</button>
          </div>
          <div className="mt-3 space-y-2">
            {d.recentCampaigns.map((c) => {
              const pct = c.total ? Math.round(((c.sent + c.failed) / c.total) * 100) : 0;
              return (
                <div key={c.id} className="rounded-lg border border-[var(--border)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate text-[13px] font-bold">{c.name} {c.product_name && <span className="text-[11px] font-normal text-[var(--muted)]">· {c.product_name}</span>}</div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${c.status === "done" ? "bg-emerald-100 text-emerald-700" : c.status === "sending" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{c.status}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} /></div>
                  <div className="mt-1 text-[11px] text-[var(--muted)]">총 {c.total.toLocaleString()} · 발송 {c.sent.toLocaleString()} · 실패 {c.failed.toLocaleString()}</div>
                </div>
              );
            })}
            {!d.recentCampaigns.length && <p className="text-[12px] text-[var(--muted)]">아직 캠페인이 없습니다. <button onClick={() => go("compose")} className="underline">새 캠페인</button></p>}
          </div>
        </div>
      </div>
    </div>
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
    <>
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
    <MappingCheck />
    </>
  );
}

/* ── 제품·컨셉 ── */
function ProductsTab({ products, reload }: { products: Product[]; reload: () => void }) {
  const [f, setF] = useState({ name: "", brand: "", concept: "", usp: "" });
  const [cats, setCats] = useState<string[]>([]);
  const [ctrys, setCtrys] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/admin/oc/products?catalog=1").then((r) => r.json()).then((j) => setNames(j.names || [])).catch(() => {}); }, [products.length]);
  const toggle = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  async function save() {
    if (!f.name.trim()) { alert("제품명을 입력하세요"); return; }
    setBusy(true);
    const body = { ...f, category: cats.join(","), country: ctrys.join(",") };
    const r = await fetch("/api/admin/oc/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (r.ok) { setF({ name: "", brand: "", concept: "", usp: "" }); setCats([]); setCtrys([]); reload(); }
    else alert((await r.json()).error || "저장 실패");
  }
  async function del(id: number) {
    if (!confirm("삭제할까요?")) return;
    await fetch(`/api/admin/oc/products?id=${id}`, { method: "DELETE" }); reload();
  }
  const inp = "w-full rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]";
  const chip = (on: boolean) => `rounded-full px-3 py-1 text-[11px] font-semibold ${on ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`;
  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <div className="kt-card p-5">
        <h2 className="text-[14px] font-black">제품 · 컨셉 등록</h2>
        <div className="mt-3 space-y-2.5">
          <div>
            <input list="oc-prod-names" className={inp} placeholder="제품명 * (직접 입력 또는 등록된 제품 선택)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <datalist id="oc-prod-names">{names.map((n) => <option key={n} value={n} />)}</datalist>
          </div>
          <input className={inp} placeholder="브랜드" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} />
          <div>
            <div className="mb-1 text-[11px] font-bold text-[var(--muted)]">카테고리 (복수 선택)</div>
            <div className="flex flex-wrap gap-1.5">
              {OC_CATEGORIES.map((c) => <button key={c.id} type="button" onClick={() => toggle(cats, setCats, c.id)} className={chip(cats.includes(c.id))}>{c.ko}</button>)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-bold text-[var(--muted)]">타겟 국가 (복수 선택 · 언어변환 기준)</div>
            <div className="flex flex-wrap gap-1.5">
              {OC_COUNTRIES.map((c) => <button key={c.id} type="button" onClick={() => toggle(ctrys, setCtrys, c.id)} className={chip(ctrys.includes(c.id))}>{c.flag} {c.ko}</button>)}
            </div>
          </div>
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
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {(p.category || "").split(",").filter(Boolean).map((c) => <span key={c} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{c}</span>)}
                    {(p.country || "").split(",").filter(Boolean).map((c) => <span key={c} className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-700">{COUNTRY_KO[c] || c}</span>)}
                  </div>
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
function CreatorsTab({ filter, setFilter, facetBrands, preview, previewing, runPreview, goCompose, selectedEmails, setSelectedEmails }: {
  filter: OcFilter; setFilter: (f: OcFilter) => void; facetBrands: { brand: string; n: number }[];
  preview: { count: number; withEmail: number; rows: CreatorRow[] } | null; previewing: boolean; runPreview: () => void; goCompose: () => void;
  selectedEmails: string[]; setSelectedEmails: (v: string[]) => void;
}) {
  const sel = new Set(selectedEmails);
  const emailRows = preview ? preview.rows.filter((r) => r.email) : [];
  const allSel = emailRows.length > 0 && emailRows.every((r) => sel.has(r.email!.toLowerCase()));
  const toggleOne = (email: string) => {
    const e = email.toLowerCase();
    setSelectedEmails(sel.has(e) ? selectedEmails.filter((x) => x !== e) : [...selectedEmails, e]);
  };
  const toggleAll = () => setSelectedEmails(allSel ? [] : emailRows.map((r) => r.email!.toLowerCase()));
  const inp = "w-full rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]";
  const tier = (min: number) => setFilter({ ...filter, minAvgViews: min || undefined });
  const toggleBrand = (b: string) => {
    const cur = filter.brands || [];
    setFilter({ ...filter, brands: cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b] });
  };
  const [segs, setSegs] = useState<{ id: number; name: string; filter: OcFilter }[]>([]);
  const loadSegs = useCallback(() => { fetch("/api/admin/oc/segments").then((r) => r.json()).then((j) => setSegs(j.rows || [])).catch(() => {}); }, []);
  useEffect(() => { loadSegs(); }, [loadSegs]);
  async function saveSeg() {
    const name = prompt("세그먼트 이름"); if (!name) return;
    await fetch("/api/admin/oc/segments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, filter }) });
    loadSegs();
  }
  async function delSeg(id: number) { await fetch(`/api/admin/oc/segments?id=${id}`, { method: "DELETE" }); loadSegs(); }
  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <div className="kt-card p-5">
        <h2 className="text-[14px] font-black">필터</h2>
        <p className="mt-1 text-[11px] text-[var(--muted)]">이 데이터셋은 팔로워 값이 없어 <b>평균 조회수(avg_views)</b>로 규모를 판단합니다.</p>

        {/* 저장 세그먼트 */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <select className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px]" defaultValue="" onChange={(e) => { const s = segs.find((x) => x.id === +e.target.value); if (s) setFilter(s.filter || {}); }}>
            <option value="">저장된 세그먼트 불러오기</option>
            {segs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={saveSeg} className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--muted)] hover:border-[var(--accent)]"><Save size={11} /> 현재 필터 저장</button>
        </div>
        {segs.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {segs.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                {s.name}<button onClick={() => { if (confirm(`"${s.name}" 삭제?`)) delSeg(s.id); }} className="text-slate-400 hover:text-rose-500"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}

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
          <h2 className="text-[14px] font-black">결과 · 대상 선택</h2>
          {preview && (
            <button onClick={goCompose} disabled={!selectedEmails.length} className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px] disabled:opacity-50"><Mail size={13} /> 선택 {selectedEmails.length}명으로 캠페인</button>
          )}
        </div>
        {preview ? (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
              <span>조건 대상 <b className="text-[var(--accent)]">{preview.count.toLocaleString()}</b>명</span>
              <span>이메일 보유 <b>{preview.withEmail.toLocaleString()}</b>명</span>
              <span className="text-[var(--muted)]">· 로드 {emailRows.length}명 · <b className="text-[var(--accent)]">선택 {selectedEmails.length}</b></span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[12px] font-semibold"><input type="checkbox" checked={allSel} onChange={toggleAll} /> 전체 선택/해제</label>
              <button onClick={() => setSelectedEmails([])} className="rounded border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--muted)] hover:text-rose-500">선택 비우기</button>
            </div>
            <div className="mt-2 max-h-[460px] overflow-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-[11.5px]">
                <thead className="sticky top-0 bg-slate-50 text-left text-[var(--muted)]">
                  <tr><th className="w-8 px-2 py-1.5"><input type="checkbox" checked={allSel} onChange={toggleAll} /></th><th className="px-2 py-1.5">handle</th><th className="px-2 py-1.5">email</th><th className="px-2 py-1.5 text-right">avg</th><th className="px-2 py-1.5">brands</th></tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => {
                    const has = !!r.email; const on = has && sel.has(r.email!.toLowerCase());
                    return (
                      <tr key={r.handle} className={`border-t border-[var(--border)] ${has ? "cursor-pointer" : "opacity-50"} ${on ? "bg-[var(--accent-light)]" : ""}`} onClick={() => has && toggleOne(r.email!)}>
                        <td className="px-2 py-1.5"><input type="checkbox" disabled={!has} checked={on} onChange={() => has && toggleOne(r.email!)} onClick={(e) => e.stopPropagation()} /></td>
                        <td className="px-2 py-1.5 font-medium">@{r.handle}</td>
                        <td className="px-2 py-1.5 text-[var(--muted)]">{r.email || "—"}</td>
                        <td className="px-2 py-1.5 text-right">{compact(r.avg_views)}</td>
                        <td className="px-2 py-1.5 text-[var(--muted)] max-w-[200px] truncate">{r.brands || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-[var(--muted)]">행 클릭 또는 체크로 선택/해제 · 최대 300명 로드. 선택한 대상에게만 발송됩니다.</p>
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

function ComposeTab({ filter, products, senders, campaigns, preview, runPreview, reload, selectedEmails }: {
  filter: OcFilter; products: Product[]; senders: Sender[]; campaigns: Campaign[];
  preview: { count: number; withEmail: number } | null; runPreview: () => void; reload: () => void; selectedEmails: string[];
}) {
  const [name, setName] = useState("");
  const [productId, setProductId] = useState<number | "">("");
  const [senderIds, setSenderIds] = useState<number[]>([]);
  const [subject, setSubject] = useState("[{{brand}}] {{product}} 크리에이터 협업 제안");
  const [subjectB, setSubjectB] = useState("");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [busy, setBusy] = useState(false);
  const [transBusy, setTransBusy] = useState(false);
  const [spam, setSpam] = useState<{ score: number; grade: string; issues: { level: string; msg: string }[] } | null>(null);
  const [spamBusy, setSpamBusy] = useState(false);
  async function checkSpam() {
    setSpamBusy(true);
    const r = await fetch("/api/admin/oc/spam-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, body }) }).then((x) => x.json()).catch(() => null);
    setSpamBusy(false);
    if (r && !r.error) setSpam(r);
  }
  const [useSelection, setUseSelection] = useState(true);
  const [sendState, setSendState] = useState<{ id: number; sent: number; failed: number; queued: number; running: boolean; note?: string } | null>(null);
  const inp = "w-full rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]";

  const selProduct = products.find((p) => p.id === productId);
  const productCountries = (selProduct?.country || "").split(",").map((c) => c.trim()).filter(Boolean);
  const [transCountry, setTransCountry] = useState("");
  const targetCountry = transCountry || productCountries[0] || "";
  const usingSelection = useSelection && selectedEmails.length > 0;

  async function translate() {
    if (!body.trim()) { alert("본문을 먼저 작성하세요"); return; }
    if (!targetCountry) { alert("제품에 타겟 국가를 등록하거나 국가를 선택하세요"); return; }
    setTransBusy(true);
    try {
      const [rb, rs] = await Promise.all([
        fetch("/api/admin/oc/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: body, country: targetCountry }) }).then((r) => r.json()),
        subject.trim() ? fetch("/api/admin/oc/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: subject, country: targetCountry, subject: true }) }).then((r) => r.json()) : Promise.resolve(null),
      ]);
      if (rb.error) { alert("번역 실패: " + rb.error); return; }
      setBody(rb.translated);
      if (rs && rs.translated) setSubject(rs.translated);
    } finally { setTransBusy(false); }
  }

  async function createCampaign() {
    if (!name.trim() || !subject.trim() || !body.trim()) { alert("캠페인명·제목·본문을 입력하세요"); return; }
    if (!senderIds.length) { alert("발신 메일함을 1개 이상 선택하세요"); return; }
    setBusy(true);
    const payload: Record<string, unknown> = { name, productId: productId || null, senderIds, subject, subjectB: subjectB || null, body };
    if (usingSelection) payload.emails = selectedEmails; else payload.filter = filter;
    const r = await fetch("/api/admin/oc/campaigns", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
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
          <label className="flex items-center gap-1.5 font-semibold text-[var(--fg)]">
            <input type="checkbox" checked={useSelection} onChange={(e) => setUseSelection(e.target.checked)} disabled={!selectedEmails.length} />
            선택한 대상만 발송 (<b className="text-[var(--accent)]">{selectedEmails.length}명</b>)
          </label>
          <div className="mt-0.5">{usingSelection
            ? "[크리에이터 필터] 탭에서 체크한 대상에게만 발송됩니다."
            : <>필터 조건 전체로 발송: {preview ? <b>{preview.withEmail.toLocaleString()}명</b> : "미조회"} <button onClick={runPreview} className="ml-1 underline">재조회</button></>}
          </div>
        </div>
        <div className="mt-3 space-y-2.5">
          <input className={inp} placeholder="캠페인명 *" value={name} onChange={(e) => setName(e.target.value)} />
          <select className={inp} value={productId} onChange={(e) => setProductId(e.target.value ? +e.target.value : "")}>
            <option value="">제품 선택(선택)</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.brand ? ` · ${p.brand}` : ""}</option>)}
          </select>
          <div className="rounded-md border border-[var(--border)] p-2.5">
            <div className="mb-1 text-[11px] font-bold text-[var(--muted)]">발신 메일함 * (여러 개 선택 시 로테이션 발송)</div>
            <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
              {senders.filter((s) => s.active).map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-[12px]">
                  <input type="checkbox" checked={senderIds.includes(s.id)}
                    onChange={(e) => setSenderIds((prev) => e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id))} />
                  {s.email} <span className="text-[10px] text-[var(--muted)]">일일 {s.daily_limit}{s.configured ? "" : " · SA 미설정"}</span>
                </label>
              ))}
              {!senders.some((s) => s.active) && <span className="text-[11px] text-[var(--muted)]">활성 발신 메일함이 없습니다(발신계정 탭에서 등록).</span>}
            </div>
            {senderIds.length > 1 && <div className="mt-1 text-[10px] text-[var(--accent)]">{senderIds.length}개 메일함 로테이션 · 합산 일일한도까지 분산 발송</div>}
          </div>
          <input className={inp} placeholder="제목 (A)" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <input className={inp} placeholder="제목 B (선택 · 입력 시 A/B 테스트 자동 분할)" value={subjectB} onChange={(e) => setSubjectB(e.target.value)} />
          <textarea className={`${inp} font-mono`} rows={9} value={body} onChange={(e) => setBody(e.target.value)} />
          {/* 언어 변환 */}
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-slate-50 px-2.5 py-2 text-[11px]">
            <span className="font-bold text-[var(--muted)]">🌐 언어 변환</span>
            <select className="rounded border border-[var(--border)] px-1.5 py-1 text-[11px]" value={targetCountry} onChange={(e) => setTransCountry(e.target.value)}>
              <option value="">국가 선택</option>
              {OC_COUNTRIES.map((c) => <option key={c.id} value={c.id}>{c.flag} {c.ko}</option>)}
            </select>
            <button onClick={translate} disabled={transBusy} className="kt-btn kt-btn-outline px-2.5 py-1 text-[11px]">{transBusy ? "변환 중…" : "제목·본문 번역"}</button>
            <span className="text-[10px] text-[var(--muted)]">한국어로 작성 후 → 해당 국가 언어로 변환(제품 국가 자동)</span>
          </div>
          <div className="text-[11px] text-[var(--muted)]">변수: <code>{"{{handle}} {{views}} {{brands}} {{product}} {{brand}} {{category}} {{concept}} {{usp}} {{region}}"}</code></div>
          {/* C4: 발송 전 스팸 점검 */}
          <div className="rounded-md bg-slate-50 px-2.5 py-2 text-[11px]">
            <div className="flex items-center gap-2">
              <button onClick={checkSpam} disabled={spamBusy || !body.trim()} className="kt-btn kt-btn-outline px-2.5 py-1 text-[11px]">{spamBusy ? "점검 중…" : "🛡 스팸 점검"}</button>
              {spam && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${spam.grade === "안전" ? "bg-emerald-100 text-emerald-700" : spam.grade === "주의" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
                  {spam.grade} · 위험도 {spam.score}/100
                </span>
              )}
              <span className="text-[10px] text-[var(--muted)]">수신거부 헤더·링크는 발송 시 자동 삽입</span>
            </div>
            {spam && spam.issues.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {spam.issues.map((i, k) => (
                  <li key={k} className={`text-[10px] ${i.level === "high" ? "text-rose-600" : i.level === "mid" ? "text-amber-600" : "text-[var(--muted)]"}`}>· {i.msg}</li>
                ))}
              </ul>
            )}
            {spam && !spam.issues.length && <div className="mt-1 text-[10px] text-emerald-600">발견된 문제 없음 — 발송해도 좋습니다.</div>}
          </div>
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

/* ── 성과(퍼널) ── */
interface StatCampaign { id: number; name: string; has_ab: boolean; sent: number; opened: number; clicked: number; failed: number; replied: number; open_rate: number; click_rate: number; reply_rate: number; }
interface AbRow { cid: number; name: string; variant: string; sent: number; opened: number; }
function StatsTab() {
  const [rows, setRows] = useState<StatCampaign[]>([]);
  const [ab, setAb] = useState<AbRow[]>([]);
  const [totals, setTotals] = useState<{ sent: number; opened: number; clicked: number; replied: number }>({ sent: 0, opened: 0, clicked: 0, replied: 0 });
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    setBusy(true);
    fetch("/api/admin/oc/stats").then((r) => r.json()).then((j) => { setRows(j.perCampaign || []); setAb(j.ab || []); setTotals(j.totals || {}); }).finally(() => setBusy(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const rate = (n: number, d: number) => (d ? ((n / d) * 100).toFixed(1) : "0") + "%";
  return (
    <div className="space-y-4">
      <div className="kt-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-black">성과 요약 (전체)</h2>
          <button onClick={load} className="kt-btn kt-btn-outline px-2.5 py-1 text-[11px]"><RefreshCw size={12} className={busy ? "animate-spin" : ""} /> 새로고침</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["발송", totals.sent, ""], ["오픈", totals.opened, rate(totals.opened, totals.sent)], ["클릭", totals.clicked, rate(totals.clicked, totals.sent)], ["회신", totals.replied, rate(totals.replied, totals.sent)]].map(([a, b, c]) => (
            <div key={a as string} className="rounded-lg border border-[var(--border)] p-3">
              <div className="text-[11px] text-[var(--muted)]">{a}</div>
              <div className="text-[20px] font-black">{Number(b).toLocaleString()}</div>
              {c && <div className="text-[11px] text-[var(--accent)]">{c}</div>}
            </div>
          ))}
        </div>
      </div>
      <div className="kt-card p-5">
        <h2 className="text-[14px] font-black">캠페인별 퍼널</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[560px] text-[11.5px]">
            <thead className="bg-slate-50 text-left text-[var(--muted)]"><tr><th className="px-2 py-1.5">캠페인</th><th className="px-2 py-1.5 text-right">발송</th><th className="px-2 py-1.5 text-right">오픈</th><th className="px-2 py-1.5 text-right">클릭</th><th className="px-2 py-1.5 text-right">회신</th><th className="px-2 py-1.5 text-right">실패</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-[var(--border)]">
                  <td className="px-2 py-1.5 max-w-[200px] truncate">{c.name}{c.has_ab && <span className="ml-1 rounded bg-indigo-100 px-1 text-[9px] font-bold text-indigo-700">A/B</span>}</td>
                  <td className="px-2 py-1.5 text-right">{c.sent.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right">{c.opened.toLocaleString()} <span className="text-[var(--muted)]">{c.open_rate}%</span></td>
                  <td className="px-2 py-1.5 text-right">{c.clicked.toLocaleString()} <span className="text-[var(--muted)]">{c.click_rate}%</span></td>
                  <td className="px-2 py-1.5 text-right font-bold text-[var(--accent)]">{c.replied.toLocaleString()} <span className="font-normal text-[var(--muted)]">{c.reply_rate}%</span></td>
                  <td className="px-2 py-1.5 text-right text-rose-500">{c.failed.toLocaleString()}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="px-2 py-3 text-center text-[var(--muted)]">데이터 없음</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-[var(--muted)]">오픈·클릭은 추적 픽셀/링크 기반이라 이미지 차단 환경에선 실제보다 낮게 잡힐 수 있습니다.</p>
      </div>
      {ab.length > 0 && (
        <div className="kt-card p-5">
          <h2 className="text-[14px] font-black">A/B 제목 비교</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-[11.5px]">
              <thead className="bg-slate-50 text-left text-[var(--muted)]"><tr><th className="px-2 py-1.5">캠페인</th><th className="px-2 py-1.5">변형</th><th className="px-2 py-1.5 text-right">발송</th><th className="px-2 py-1.5 text-right">오픈</th><th className="px-2 py-1.5 text-right">오픈율</th></tr></thead>
              <tbody>
                {ab.map((r, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="px-2 py-1.5 max-w-[180px] truncate">{r.name}</td>
                    <td className="px-2 py-1.5"><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${r.variant === "A" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>{r.variant}</span></td>
                    <td className="px-2 py-1.5 text-right">{r.sent.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right">{r.opened.toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-right font-bold">{rate(r.opened, r.sent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 제품↔크리에이터 매칭 ── */
function MatchTab({ facetBrands, products }: { facetBrands: { brand: string; n: number }[]; products: Product[] }) {
  const [brand, setBrand] = useState("");
  const [hasEmail, setHasEmail] = useState(true);
  const [res, setRes] = useState<{ count: number; withEmail: number; rows: CreatorRow[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const inp = "rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]";
  async function run(b?: string) {
    const q = (b ?? brand).trim(); if (!q) return;
    setBrand(q); setBusy(true);
    const r = await fetch(`/api/admin/oc/match?brand=${encodeURIComponent(q)}&hasEmail=${hasEmail ? 1 : 0}&limit=200`);
    const j = await r.json(); setBusy(false);
    if (r.ok) setRes(j); else alert(j.error || "실패");
  }
  return (
    <div className="kt-card p-5">
      <h2 className="text-[14px] font-black">제품↔크리에이터 매칭</h2>
      <p className="mt-1 text-[12px] text-[var(--muted)]">브랜드 이력 기반 — 그 브랜드 콘텐츠 경험이 있는 크리에이터를 찾습니다(kalodata형).</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input className={inp} placeholder="브랜드명" value={brand} onChange={(e) => setBrand(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} />
        {products.length > 0 && (
          <select className={inp} onChange={(e) => e.target.value && run(e.target.value)} defaultValue="">
            <option value="">제품의 브랜드로</option>
            {products.filter((p) => p.brand).map((p) => <option key={p.id} value={p.brand!}>{p.name} · {p.brand}</option>)}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-[12px]"><input type="checkbox" checked={hasEmail} onChange={(e) => setHasEmail(e.target.checked)} /> 이메일 보유만</label>
        <button onClick={() => run()} disabled={busy} className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]">{busy ? "조회 중…" : "조회"}</button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {facetBrands.slice(0, 20).map((b) => (
          <button key={b.brand} onClick={() => run(b.brand)} className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[11px] text-[var(--muted)] hover:border-[var(--accent)]">{b.brand} <span className="opacity-60">{b.n}</span></button>
        ))}
      </div>
      {res && (
        <>
          <div className="mt-3 text-[13px]">「{brand}」 매칭 <b className="text-[var(--accent)]">{res.count.toLocaleString()}</b>명 · 이메일 <b>{res.withEmail.toLocaleString()}</b></div>
          <div className="mt-2 max-h-[440px] overflow-auto rounded-lg border border-[var(--border)]">
            <table className="w-full text-[11.5px]">
              <thead className="sticky top-0 bg-slate-50 text-left text-[var(--muted)]"><tr><th className="px-2 py-1.5">handle</th><th className="px-2 py-1.5">email</th><th className="px-2 py-1.5 text-right">avg</th><th className="px-2 py-1.5">brands</th></tr></thead>
              <tbody>
                {res.rows.map((r) => (
                  <tr key={r.handle} className="border-t border-[var(--border)]">
                    <td className="px-2 py-1.5">@{r.handle}</td>
                    <td className="px-2 py-1.5 text-[var(--muted)]">{r.email || "—"}</td>
                    <td className="px-2 py-1.5 text-right">{compact(r.avg_views)}</td>
                    <td className="px-2 py-1.5 max-w-[240px] truncate text-[var(--muted)]">{r.brands || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ── 발신계정(공용 메일함, 서비스계정 DWD) + 안전(제외목록·DNS) ── */
function SendersTab({ senders, reload }: { senders: Sender[]; reload: () => void }) {
  const [f, setF] = useState({ email: "", display_name: "", daily_limit: 300, warmup: false });
  const inp = "w-full rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]";
  async function save() {
    if (!f.email.trim()) { alert("메일함 이메일 필수"); return; }
    const r = await fetch("/api/admin/oc/senders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
    if (r.ok) { setF({ email: "", display_name: "", daily_limit: 300, warmup: false }); reload(); }
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
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[400px_1fr]">
        <div className="kt-card p-5">
          <h2 className="text-[14px] font-black">발신 메일함 등록(allow-list)</h2>
          <p className="mt-1 text-[11px] text-[var(--muted)]">등록된 공용 메일함으로만 발송·열람됩니다. Google Workspace <b>서비스계정 + 도메인 전체 위임(DWD)</b>으로 impersonate. 여러 개 등록 시 캠페인에서 로테이션됩니다.</p>
          <div className="mt-3 space-y-2.5">
            <input className={inp} placeholder="공용 메일함 (예: cs@glovek.space)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className={inp} placeholder="표시 이름 (예: GloveK)" value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} />
            <input className={inp} type="number" placeholder="일일 한도" value={f.daily_limit} onChange={(e) => setF({ ...f, daily_limit: +e.target.value })} />
            <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={f.warmup} onChange={(e) => setF({ ...f, warmup: e.target.checked })} /> 워밍업 시작(신규 메일함 권장 · 초기 소량→점증)</label>
            <button onClick={save} className="kt-btn kt-btn-primary w-full py-2 text-[12px]">등록 / 수정</button>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] text-[var(--muted)]">
            <b>설정 (한 번만)</b>
            <div className="mt-1">1. Vercel env <code>GOOGLE_SA_KEY_JSON</code> = 서비스계정 키 JSON</div>
            <div>2. Workspace 관리콘솔 → 도메인 위임에 서비스계정 client_id 승인 (scope <code>gmail.send</code>, <code>gmail.readonly</code>)</div>
            <div>3. 위임 대상 메일함을 여기 등록</div>
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
                    {s.configured ? <span className="ml-1 text-emerald-600"><Check size={11} className="inline" /> SA</span> : <span className="ml-1 text-rose-500"><X size={11} className="inline" /> SA 미설정</span>}
                    {s.warmup_start && <span className="ml-1 rounded bg-orange-100 px-1 text-[9px] font-bold text-orange-700">워밍업</span>}
                    {!s.active && <span className="ml-1 text-slate-400">· 비활성</span>}
                    {!s.active && s.pause_reason && <span className="ml-1 rounded bg-rose-50 px-1 text-[9px] font-bold text-rose-600" title={s.pause_reason}>자동정지: {s.pause_reason.slice(0, 40)}</span>}
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
      <DnsCheck />
      <SuppressionPanel />
    </div>
  );
}

/* ── 도메인 인증(SPF/DKIM/DMARC) 점검 ── */
function DnsCheck() {
  const [domain, setDomain] = useState("glovek.space");
  const [rep, setRep] = useState<{ domain: string; spf: { found: boolean; value: string; google: boolean }; dkim: { found: boolean; value: string }; dmarc: { found: boolean; value: string }; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const r = await fetch(`/api/admin/oc/dns-check?domain=${encodeURIComponent(domain)}`); const j = await r.json(); setBusy(false);
    if (r.ok) setRep(j); else alert(j.error || "실패");
  }
  const Row = ({ label, ok, val }: { label: string; ok: boolean; val: string }) => (
    <div className="flex items-start gap-2 border-t border-[var(--border)] py-2 text-[12px]">
      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>{ok ? "OK" : "없음"}</span>
      <div className="min-w-0"><b>{label}</b><div className="break-all text-[11px] text-[var(--muted)]">{val || "레코드 없음"}</div></div>
    </div>
  );
  return (
    <div className="kt-card p-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-[14px] font-black">도메인 인증 점검 (SPF · DKIM · DMARC)</h2><p className="text-[11px] text-[var(--muted)]">스팸함 방지 필수 · 배포 서버에서 실제 DNS 조회</p></div>
        <div className="flex gap-2">
          <input className="rounded-md border border-[var(--border)] px-2 py-1 text-[12px]" value={domain} onChange={(e) => setDomain(e.target.value)} />
          <button onClick={run} disabled={busy} className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]">{busy ? "조회 중…" : "점검"}</button>
        </div>
      </div>
      {rep && (
        <div className="mt-3">
          <Row label="SPF" ok={rep.spf.found} val={rep.spf.value + (rep.spf.found && !rep.spf.google ? "  ⚠ google include 없음" : "")} />
          <Row label="DKIM (google._domainkey)" ok={rep.dkim.found} val={rep.dkim.value} />
          <Row label="DMARC" ok={rep.dmarc.found} val={rep.dmarc.value} />
          {!rep.ok && <p className="mt-2 text-[11px] text-rose-600">일부 레코드 누락 — 발송 전 DNS에 SPF/DKIM/DMARC를 추가하세요(스팸 처리 위험).</p>}
        </div>
      )}
    </div>
  );
}

/* ── 발송 제외목록(수신거부·바운스·스팸) ── */
interface SupRow { email: string; reason: string | null; source: string | null; created_at: string; }
function SuppressionPanel() {
  const [rows, setRows] = useState<SupRow[]>([]);
  const [count, setCount] = useState(0);
  const [email, setEmail] = useState("");
  const load = useCallback(() => { fetch("/api/admin/oc/suppression").then((r) => r.json()).then((j) => { setRows(j.rows || []); setCount(j.count || 0); }).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  async function add() { if (!email.trim()) return; await fetch("/api/admin/oc/suppression", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); setEmail(""); load(); }
  async function rm(e: string) { await fetch(`/api/admin/oc/suppression?email=${encodeURIComponent(e)}`, { method: "DELETE" }); load(); }
  return (
    <div className="kt-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-[14px] font-black">발송 제외목록 ({count.toLocaleString()})</h2><p className="text-[11px] text-[var(--muted)]">수신거부·바운스·스팸신고 주소는 자동 등록되어 재발송에서 제외됩니다</p></div>
        <div className="flex gap-2">
          <input className="rounded-md border border-[var(--border)] px-2 py-1 text-[12px]" placeholder="이메일 수동 추가" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button onClick={add} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]">추가</button>
        </div>
      </div>
      <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-[11.5px]">
          <thead className="sticky top-0 bg-slate-50 text-left text-[var(--muted)]"><tr><th className="px-2 py-1.5">이메일</th><th className="px-2 py-1.5">사유</th><th className="px-2 py-1.5">등록</th><th className="px-2 py-1.5"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email} className="border-t border-[var(--border)]">
                <td className="px-2 py-1.5">{r.email}</td>
                <td className="px-2 py-1.5"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">{r.reason}</span></td>
                <td className="px-2 py-1.5 text-[var(--muted)]">{dt(r.created_at)}</td>
                <td className="px-2 py-1.5 text-right"><button onClick={() => rm(r.email)} className="text-slate-400 hover:text-rose-500"><X size={12} /></button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="px-2 py-3 text-center text-[var(--muted)]">비어있음</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── 회신함(수신 매칭 + 회신 현황) ── */
interface CampReply { id: number; name: string; sent: number; replied: number; new_replies: number; }
interface MailReply { mailbox: string; total: number; new_replies: number; matched: number; }
function InboxTab({ senders }: { senders: Sender[] }) {
  const [mailbox, setMailbox] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [camp, setCamp] = useState<CampReply[]>([]);
  const [mail, setMail] = useState<MailReply[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [hideBounce, setHideBounce] = useState(true);
  const [draft, setDraft] = useState<{ id: number; subject: string; body: string; busy: boolean; sent?: boolean } | null>(null);
  const inp = "rounded-md border border-[var(--border)] px-3 py-2 text-[12px] outline-none focus:border-[var(--accent)]";

  const load = useCallback((mb: string, st: string) => {
    const qs = new URLSearchParams();
    if (mb) qs.set("mailbox", mb);
    if (st) qs.set("status", st);
    fetch(`/api/admin/oc/inbox?${qs}`).then((r) => r.json()).then((j) => setRows(j.rows || [])).catch(() => {});
  }, []);

  async function genDraft(id: number) {
    setDraft({ id, subject: "", body: "", busy: true });
    const r = await fetch("/api/admin/oc/reply-draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = await r.json();
    if (r.ok) setDraft({ id, subject: j.subject || "Re:", body: j.draft, busy: false });
    else { setDraft(null); alert("초안 실패: " + (j.error || "")); }
  }
  async function sendReply() {
    if (!draft || !draft.body.trim()) return;
    setDraft({ ...draft, busy: true });
    const r = await fetch("/api/admin/oc/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sendReply", id: draft.id, subject: draft.subject, body: draft.body }) });
    const j = await r.json();
    if (r.ok) { setDraft({ ...draft, busy: false, sent: true }); load(mailbox, status); loadSummary(); }
    else { setDraft({ ...draft, busy: false }); alert("발송 실패: " + (j.error || "")); }
  }
  const loadSummary = useCallback(() => {
    fetch("/api/admin/oc/inbox?summary=1").then((r) => r.json()).then((j) => { setCamp(j.perCampaign || []); setMail(j.perMailbox || []); }).catch(() => {});
  }, []);
  useEffect(() => { load(mailbox, status); }, [mailbox, status, load]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  async function sync() {
    if (!mailbox) { alert("메일함을 선택하세요"); return; }
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/oc/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mailbox }) });
    const j = await r.json(); setBusy(false);
    if (r.ok) { setMsg(`동기화 완료 · 조회 ${j.fetched} · 신규 ${j.stored} · 매칭 ${j.matched}`); load(mailbox, status); loadSummary(); }
    else setMsg("실패: " + (j.error || ""));
  }
  async function setRowStatus(id: number, st: string) {
    await fetch("/api/admin/oc/inbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setStatus", id, status: st }) });
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, status: st } : x)));
    loadSummary();
  }
  const visible = rows.filter((r) => !hideBounce || !r.is_bounce);
  const selected = open ? rows.find((r) => r.id === open) || null : null;

  return (
    <div className="space-y-4">
      {/* 회신 현황 요약 */}
      <div className="kt-card p-5">
        <h2 className="text-[14px] font-black">회신 현황</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-1 text-[11px] font-bold text-[var(--muted)]">캠페인별 회신율</div>
            <div className="max-h-52 overflow-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-[11.5px]">
                <thead className="sticky top-0 bg-slate-50 text-left text-[var(--muted)]"><tr><th className="px-2 py-1.5">캠페인</th><th className="px-2 py-1.5 text-right">발송</th><th className="px-2 py-1.5 text-right">회신</th><th className="px-2 py-1.5 text-right">회신율</th><th className="px-2 py-1.5 text-right">신규</th></tr></thead>
                <tbody>
                  {camp.map((c) => (
                    <tr key={c.id} className="border-t border-[var(--border)]">
                      <td className="px-2 py-1.5 max-w-[180px] truncate">{c.name}</td>
                      <td className="px-2 py-1.5 text-right">{c.sent.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right font-bold text-[var(--accent)]">{c.replied.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right">{c.sent ? ((c.replied / c.sent) * 100).toFixed(1) : "0"}%</td>
                      <td className="px-2 py-1.5 text-right">{c.new_replies ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{c.new_replies}</span> : "—"}</td>
                    </tr>
                  ))}
                  {!camp.length && <tr><td colSpan={5} className="px-2 py-3 text-center text-[var(--muted)]">데이터 없음</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="mb-1 text-[11px] font-bold text-[var(--muted)]">메일함별 수신</div>
            <div className="max-h-52 overflow-auto rounded-lg border border-[var(--border)]">
              <table className="w-full text-[11.5px]">
                <thead className="sticky top-0 bg-slate-50 text-left text-[var(--muted)]"><tr><th className="px-2 py-1.5">메일함</th><th className="px-2 py-1.5 text-right">수신</th><th className="px-2 py-1.5 text-right">매칭</th><th className="px-2 py-1.5 text-right">신규</th></tr></thead>
                <tbody>
                  {mail.map((m) => (
                    <tr key={m.mailbox} className="border-t border-[var(--border)]">
                      <td className="px-2 py-1.5">{m.mailbox}</td>
                      <td className="px-2 py-1.5 text-right">{m.total.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right">{m.matched.toLocaleString()}</td>
                      <td className="px-2 py-1.5 text-right">{m.new_replies ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{m.new_replies}</span> : "—"}</td>
                    </tr>
                  ))}
                  {!mail.length && <tr><td colSpan={4} className="px-2 py-3 text-center text-[var(--muted)]">데이터 없음</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 수신함 — 2단(목록 / 본문·컨텍스트·AI답장) */}
      <div className="kt-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <select className={inp} value={mailbox} onChange={(e) => setMailbox(e.target.value)}>
            <option value="">전체 메일함</option>
            {senders.map((s) => <option key={s.id} value={s.email}>{s.email}</option>)}
          </select>
          <select className={inp} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">전체 상태</option>
            <option value="new">신규</option><option value="handled">처리완료</option><option value="ignored">무시</option>
          </select>
          <button onClick={sync} disabled={busy || !mailbox} className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]">{busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} 최근 30일 동기화</button>
          <label className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]"><input type="checkbox" checked={hideBounce} onChange={(e) => setHideBounce(e.target.checked)} /> 반송 숨기기</label>
          <span className="text-[11px] text-[var(--muted)]">{visible.length}건</span>
        </div>
        {msg && <p className="mt-2 text-[12px] font-semibold text-[var(--accent)]">{msg}</p>}

        <div className="mt-3 grid gap-3 lg:grid-cols-[340px_1fr]">
          {/* 좌: 메일 목록 */}
          <div className="max-h-[560px] overflow-auto rounded-lg border border-[var(--border)]">
            {visible.map((m) => (
              <button key={m.id} onClick={() => { setOpen(m.id); setDraft(null); }}
                className={`block w-full border-b border-[var(--border)] px-3 py-2.5 text-left ${open === m.id ? "bg-[var(--accent-light)]" : "hover:bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-[12px] font-bold">{m.from_name || m.from_email || "—"}</div>
                  <div className="flex shrink-0 items-center gap-1">
                    {m.is_bounce && <span className="rounded bg-slate-100 px-1 text-[9px] font-bold text-slate-500">반송</span>}
                    {m.status === "new" && !m.is_bounce && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
                  </div>
                </div>
                <div className="truncate text-[11.5px] text-[var(--fg)]">{m.subject || "(제목 없음)"}</div>
                <div className="truncate text-[11px] text-[var(--muted)]">{m.snippet || ""}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--muted)]">
                  {m.matched_campaign_id && <span className="rounded bg-sky-100 px-1 font-bold text-sky-700">#{m.matched_campaign_id}</span>}
                  {m.matched_handle && <span className="rounded bg-emerald-100 px-1 font-bold text-emerald-700">@{m.matched_handle}</span>}
                  <span className="ml-auto">{(m.received_at || "").slice(0, 22)}</span>
                </div>
              </button>
            ))}
            {!visible.length && <div className="p-6 text-center text-[12px] text-[var(--muted)]">메일함을 선택하고 [동기화]하세요.</div>}
          </div>

          {/* 우: 본문 + 컨텍스트 + AI 답장 */}
          <div className="min-h-[300px] rounded-lg border border-[var(--border)] p-4">
            {!selected ? (
              <div className="grid h-full min-h-[260px] place-items-center text-[13px] text-[var(--muted)]">왼쪽에서 메일을 선택하세요.</div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[15px] font-black">{selected.subject || "(제목 없음)"}</div>
                    <div className="mt-0.5 text-[12px] text-[var(--muted)]">{selected.from_name ? `${selected.from_name} · ` : ""}{selected.from_email} → {selected.mailbox}</div>
                    <div className="text-[11px] text-[var(--muted)]">{selected.received_at}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {selected.status !== "handled" && <button onClick={() => setRowStatus(selected.id, "handled")} className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">완료</button>}
                    {selected.status !== "ignored" && <button onClick={() => setRowStatus(selected.id, "ignored")} className="rounded bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">무시</button>}
                  </div>
                </div>
                {(selected.matched_campaign_id || selected.matched_handle) && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    {selected.matched_campaign_id && <span className="rounded bg-sky-100 px-1.5 py-0.5 font-bold text-sky-700">캠페인 #{selected.matched_campaign_id}</span>}
                    {selected.matched_handle && <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700">@{selected.matched_handle}</span>}
                  </div>
                )}
                <div className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 p-3 text-[12.5px] leading-relaxed">{selected.body_text || selected.snippet || "(본문 없음)"}</div>

                {/* AI 답장 */}
                {!selected.is_bounce && (
                  <div className="mt-4 rounded-lg border border-[var(--accent)] bg-white p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-black text-[var(--accent)]">🤖 AI 답장 초안</div>
                      {draft?.id !== selected.id && <button onClick={() => genDraft(selected.id)} className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]">답장 초안 생성</button>}
                    </div>
                    {draft?.id === selected.id && (
                      draft.busy && !draft.body
                        ? <div className="mt-2 flex items-center gap-2 text-[12px] text-[var(--muted)]"><Loader2 size={13} className="animate-spin" /> 초안 생성 중…</div>
                        : draft.sent
                          ? <div className="mt-2 text-[12px] font-semibold text-emerald-600">✓ 답장을 보냈습니다 · 완료 처리됨</div>
                          : <div className="mt-2 space-y-2">
                              <input className={`${inp} w-full`} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="제목" />
                              <textarea className={`${inp} w-full`} rows={8} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
                              <div className="flex gap-2">
                                <button onClick={sendReply} disabled={draft.busy} className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]"><Send size={12} /> {draft.busy ? "보내는 중…" : "답장 보내기"}</button>
                                <button onClick={() => genDraft(selected.id)} disabled={draft.busy} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]">다시 생성</button>
                                <button onClick={() => { navigator.clipboard?.writeText(draft.body); }} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]">복사</button>
                              </div>
                            </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Users, CreditCard, UserSquare2, Tag, SlidersHorizontal, Loader2, LogOut, Gift, Inbox, Database, Play, Link2 as LinkIcon } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { INFLUENCERS, contactFor } from "@/data/ktrend/influencers";
import { BRANDS } from "@/data/ktrend/brands";
import { TIERS } from "@/data/ktrend/meta";
import { DEFAULT_CRAWL_RULES, type CrawlRules } from "@/lib/crawl-rules";

interface Member {
  id: string; email: string; name: string; brand: string | null; role: string | null;
  plan: string; pro_until: number; created_at: string; paid_total: number; last_paid: string | null;
}
interface Order {
  order_id: string; user_id: string; plan: string; amount: number; status: string; created_at: string; paid: boolean;
}
interface Totals { users: number; payments: number; revenue: number; active_pro: number; }
interface Inquiry { id: number; kind: string; user_email: string | null; payload: Record<string, unknown> | null; status?: string; response?: string | null; created_at: string; }
interface BrandReq { id: number; brand_name: string; handle: string | null; source: string; status: string; collected: number; note: string | null; created_at: string; }
interface Run { id: number; kind: string; target: string | null; status: string; collected: number; error: string | null; created_at: string; }
interface Track { brand_name: string; tracked: boolean; interval_hours: number; hashtags: string | null; last_collected_at: string | null; }

const KIND_LABEL: Record<string, string> = {
  marketing: "마케팅 1:1", tiktokshop: "틱톡샵 온보딩", proposal: "인플루언서 제안", sales: "도입 문의", password_reset: "비밀번호 재설정",
};

const won = (n: number) => "₩" + Number(n || 0).toLocaleString();
const dt = (s: string | null) => (s ? s.slice(0, 16).replace("T", " ") : "—");
const proState = (until: number) => (Number(until) > Date.now() ? `Pro ~${new Date(Number(until)).toISOString().slice(0, 10)}` : "—");

type Tab = "members" | "payments" | "inquiries" | "collect" | "influencers" | "brands" | "utm" | "rules";
interface UtmRow { key: string; visits: number; signups: number }
interface UtmRecent { kind: string; source: string | null; medium: string | null; campaign: string | null; content: string | null; user_email: string | null; created_at: string }

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [configured, setConfigured] = useState(true);
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<Tab>("members");

  const [members, setMembers] = useState<Member[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [brandReqs, setBrandReqs] = useState<BrandReq[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [collectedCount, setCollectedCount] = useState(0);
  const [creatorsCount, setCreatorsCount] = useState(0);
  const [newBrand, setNewBrand] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [tracking, setTracking] = useState<Track[]>([]);
  const [blocks, setBlocks] = useState<{ kind: string; value: string; reason: string | null }[]>([]);
  const [blockVal, setBlockVal] = useState("");
  const [blockKind, setBlockKind] = useState<"handle" | "brand">("handle");
  const [promos, setPromos] = useState<{ code: string; trial_days: number; max_uses: number; used_count: number; active: boolean }[]>([]);
  const [utm, setUtm] = useState<{ bySource: UtmRow[]; byCampaign: UtmRow[]; byMedium: UtmRow[]; recent: UtmRecent[]; totals: { visits: number; signups: number } } | null>(null);
  const [linkBase, setLinkBase] = useState("https://glovek.space");
  const [linkUtm, setLinkUtm] = useState({ source: "", medium: "", campaign: "", content: "", term: "" });
  const [promoDays, setPromoDays] = useState(3);
  const [promoUses, setPromoUses] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [totals, setTotals] = useState<Totals | null>(null);
  const [rules, setRules] = useState<CrawlRules>(DEFAULT_CRAWL_RULES);
  const [loadingData, setLoadingData] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantDays, setGrantDays] = useState(30);
  const [toast, setToast] = useState("");

  const checkSession = async () => {
    const r = await fetch("/api/admin/session", { cache: "no-store" }).then((x) => x.json()).catch(() => ({ authed: false }));
    setAuthed(!!r.authed);
    setConfigured(r.configured !== false);
  };
  useEffect(() => { checkSession(); }, []);

  const loadData = async () => {
    setLoadingData(true);
    const r = await fetch("/api/admin/overview", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    setLoadingData(false);
    if (r && !r.error) {
      setMembers(r.members ?? []);
      setOrders(r.orders ?? []);
      setInquiries(r.inquiries ?? []);
      setBrandReqs(r.brandRequests ?? []);
      setRuns(r.collectionRuns ?? []);
      setCollectedCount(r.collectedCount ?? 0);
      setCreatorsCount(r.creatorsCount ?? 0);
      setTotals(r.totals ?? null);
      if (r.crawlRules) setRules({ ...DEFAULT_CRAWL_RULES, ...r.crawlRules });
    }
  };
  useEffect(() => { if (authed) loadData(); }, [authed]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) setAuthed(true);
    else setErr(d.error ?? "로그인 실패");
  };

  const logout = async () => { await fetch("/api/admin/logout", { method: "POST" }); setAuthed(false); };

  const saveRules = async () => {
    const r = await fetch("/api/admin/settings", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rules),
    });
    setToast(r.ok ? "크롤링 규칙 저장됨" : "저장 실패");
    setTimeout(() => setToast(""), 2000);
  };

  const grant = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/admin/grant", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: grantEmail, days: grantDays }),
    });
    const d = await r.json().catch(() => ({}));
    setToast(r.ok ? `${grantEmail}에 Pro ${grantDays}일 부여` : (d.error ?? "실패"));
    setTimeout(() => setToast(""), 2500);
    if (r.ok) { setGrantEmail(""); loadData(); }
  };

  const replyInquiry = async (id: number, status: string, response: string) => {
    const r = await fetch("/api/admin/inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, response }) });
    setToast(r.ok ? "답변 저장됨 (회원 마이페이지 노출)" : "저장 실패");
    setTimeout(() => setToast(""), 2500);
    if (r.ok) loadData();
  };

  const resetPw = async (email: string) => {
    if (!confirm(`${email}\n비밀번호를 임시값으로 초기화하시겠습니까?`)) return;
    const r = await fetch("/api/admin/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { alert(`임시 비밀번호: ${d.tempPassword}\n\n회원에게 전달 후 로그인 시 변경하도록 안내하세요.`); }
    else setToast(d.error ?? "초기화 실패");
    setTimeout(() => setToast(""), 2500);
  };

  const addBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrand.trim()) return;
    await fetch("/api/brands/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brandName: newBrand }) });
    setNewBrand("");
    setToast("브랜드 수집 요청 추가됨");
    setTimeout(() => setToast(""), 2000);
    loadData();
  };

  const loadTracking = async () => {
    const r = await fetch("/api/admin/tracking", { cache: "no-store" }).then((x) => x.json()).catch(() => ({ rows: [] }));
    setTracking(r.rows ?? []);
  };
  useEffect(() => { if (authed) { loadTracking(); loadBlocks(); loadPromos(); loadUtm(); } }, [authed]);

  const updateTrack = async (brand_name: string, patch: Partial<Track>) => {
    await fetch("/api/admin/tracking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand_name, ...patch }) });
    loadTracking();
  };
  const seedTracking = async () => {
    await fetch("/api/admin/tracking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "seed" }) });
    setToast("기존 브랜드 추적 등록됨");
    setTimeout(() => setToast(""), 2000);
    loadTracking();
  };

  const loadBlocks = async () => {
    const r = await fetch("/api/admin/block", { cache: "no-store" }).then((x) => x.json()).catch(() => ({ rows: [] }));
    setBlocks(r.rows ?? []);
  };
  const loadPromos = async () => {
    const r = await fetch("/api/admin/promo", { cache: "no-store" }).then((x) => x.json()).catch(() => ({ rows: [] }));
    setPromos(r.rows ?? []);
  };
  const loadUtm = async () => {
    const r = await fetch("/api/admin/utm", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (r) setUtm(r);
  };
  const builtLink = () => {
    const p = new URLSearchParams();
    if (linkUtm.source) p.set("utm_source", linkUtm.source);
    if (linkUtm.medium) p.set("utm_medium", linkUtm.medium);
    if (linkUtm.campaign) p.set("utm_campaign", linkUtm.campaign);
    if (linkUtm.content) p.set("utm_content", linkUtm.content);
    if (linkUtm.term) p.set("utm_term", linkUtm.term);
    const qs = p.toString();
    return qs ? `${linkBase}?${qs}` : linkBase;
  };
  const createPromo = async () => {
    const r = await fetch("/api/admin/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: promoCode || undefined, trial_days: promoDays, max_uses: promoUses }) });
    const d = await r.json().catch(() => ({}));
    setPromoCode("");
    setToast(r.ok ? `코드 생성: ${d.code} (${d.trial_days}일)` : "생성 실패");
    setTimeout(() => setToast(""), 2500);
    loadPromos();
  };
  const togglePromo = async (code: string, active: boolean) => {
    await fetch("/api/admin/promo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, active }) });
    loadPromos();
  };
  const deletePromo = async (code: string) => {
    await fetch("/api/admin/promo", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    loadPromos();
  };
  const addBlock = async (kind: "handle" | "brand", value: string) => {
    const v = value.trim().replace(/^@/, "");
    if (!v) return;
    await fetch("/api/admin/block", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, value: v }) });
    setBlockVal("");
    setToast(`블락: ${kind === "handle" ? "@" : ""}${v}`);
    setTimeout(() => setToast(""), 2000);
    loadBlocks();
  };
  const removeBlock = async (kind: string, value: string) => {
    await fetch("/api/admin/block", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, value }) });
    loadBlocks();
  };

  const seedMaster = async () => {
    setToast("브랜드 마스터 시드 중…");
    const r = await fetch("/api/admin/seed-brands", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setToast(r.ok ? `마스터 시드 완료: 추적 ${d.tracked ?? 0} / 1차학습 큐 ${d.queued ?? 0}` : "시드 실패");
    setTimeout(() => setToast(""), 3500);
    loadTracking();
  };

  const runCollect = async () => {
    setCollecting(true);
    const r = await fetch("/api/admin/collect", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setCollecting(false);
    setToast(r.ok ? `수집 실행: 신규 ${d.collected ?? 0}건${d.scraper === false ? " (스크래퍼 키 미설정 → 0)" : ""}` : "수집 실패");
    setTimeout(() => setToast(""), 3500);
    loadData();
  };

  if (authed === null) {
    return <PageShell><div className="py-24 text-center text-[var(--muted)]"><Loader2 className="mx-auto animate-spin" /></div></PageShell>;
  }
  if (!authed) {
    return (
      <PageShell>
        <div className="mx-auto max-w-sm py-16">
          <div className="kt-card p-6">
            <h1 className="flex items-center gap-2 text-[18px] font-black"><ShieldCheck size={18} className="text-[var(--accent)]" /> 관리자 로그인</h1>
            <p className="mt-1 text-[11px] text-[var(--muted)]">관리자 전용 페이지입니다.</p>
            {!configured && <p className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700">DB 미연결 — 로그인은 되지만 데이터가 비어 있습니다.</p>}
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

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "members", label: "회원·결제", icon: <Users size={13} /> },
    { id: "payments", label: "결제현황", icon: <CreditCard size={13} /> },
    { id: "inquiries", label: "문의·제안", icon: <Inbox size={13} /> },
    { id: "collect", label: "브랜드 수집", icon: <Database size={13} /> },
    { id: "influencers", label: "인플루언서", icon: <UserSquare2 size={13} /> },
    { id: "brands", label: "브랜드", icon: <Tag size={13} /> },
    { id: "utm", label: "유입(UTM)", icon: <LinkIcon size={13} /> },
    { id: "rules", label: "크롤링 규칙", icon: <SlidersHorizontal size={13} /> },
  ];

  return (
    <PageShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[20px] font-black tracking-tight"><ShieldCheck size={18} className="text-[var(--accent)]" /> 관리자 콘솔</h1>
        <button onClick={logout} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]"><LogOut size={13} /> 로그아웃</button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { l: "가입 회원", v: totals ? `${totals.users}` : "…" },
          { l: "Pro 활성", v: totals ? `${totals.active_pro}` : "…" },
          { l: "결제 건수", v: totals ? `${totals.payments}` : "…" },
          { l: "누적 매출", v: totals ? won(totals.revenue) : "…" },
          { l: "브랜드", v: `${BRANDS.length}` },
        ].map((s) => (
          <div key={s.l} className="kt-card p-3"><div className="text-[10px] text-[var(--muted)]">{s.l}</div><div className="mt-0.5 text-[18px] font-black text-[var(--accent)]">{s.v}</div></div>
        ))}
      </div>

      <div className="kt-noscrollbar mb-4 flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold ${tab === t.id ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}>{t.icon} {t.label}</button>
        ))}
        <button onClick={loadData} className="ml-auto shrink-0 rounded-md border border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--muted)]">새로고침</button>
      </div>

      {toast && <div className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">{toast}</div>}
      {loadingData && <div className="mb-3 flex items-center gap-2 text-[11px] text-[var(--muted)]"><Loader2 size={13} className="animate-spin" /> 불러오는 중…</div>}

      {tab === "members" && (
        <>
          <form onSubmit={grant} className="mb-3 flex flex-wrap items-center gap-2 kt-card p-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold"><Gift size={13} className="text-[var(--accent)]" /> Pro 수동 부여</span>
            <input value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} placeholder="회원 이메일" className="rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px]" />
            <input type="number" value={grantDays} onChange={(e) => setGrantDays(Number(e.target.value))} className="w-20 rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px]" />
            <span className="text-[10px] text-[var(--muted)]">일</span>
            <button className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]">부여</button>
          </form>

          {/* 프로모션 코드 생성 (가입 시 입력 → 무료 Pro 체험) */}
          <div className="mb-4 rounded-md border border-[var(--border)] p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold"><Gift size={13} className="text-[var(--accent)]" /> 프로모션 코드 ({promos.length})</span>
              <input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="코드(비우면 자동생성)" className="rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px]" />
              <input type="number" value={promoDays} onChange={(e) => setPromoDays(Number(e.target.value))} className="w-16 rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px]" />
              <span className="text-[10px] text-[var(--muted)]">일 체험</span>
              <input type="number" value={promoUses} onChange={(e) => setPromoUses(Number(e.target.value))} className="w-16 rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px]" />
              <span className="text-[10px] text-[var(--muted)]">최대횟수(0=무제한)</span>
              <button onClick={createPromo} className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]">코드 생성</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {promos.map((p) => (
                <span key={p.code} className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[10px] ring-1 ${p.active ? "bg-[var(--accent-light)] text-[var(--accent)] ring-[var(--accent)]/30" : "bg-slate-100 text-slate-400 ring-slate-200"}`}>
                  <b>{p.code}</b> · {p.trial_days}일 · {p.used_count}/{p.max_uses || "∞"}
                  <button onClick={() => togglePromo(p.code, !p.active)} className="font-semibold underline">{p.active ? "중지" : "재개"}</button>
                  <button onClick={() => deletePromo(p.code)} className="font-bold text-rose-400 hover:text-rose-700">×</button>
                </span>
              ))}
              {!promos.length && <span className="text-[10px] text-[var(--muted)]">생성된 코드 없음</span>}
            </div>
          </div>

          <Table head={["이메일", "이름", "브랜드", "플랜", "결제액", "최근결제", "Pro 상태", "가입일", "비번"]}>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2 font-semibold">{m.email}</td>
                <td className="p-2">{m.name}</td>
                <td className="p-2">{m.brand ?? "—"}</td>
                <td className="p-2"><span className="kt-badge-brand">{m.plan}</span></td>
                <td className="p-2 text-right">{won(m.paid_total)}</td>
                <td className="p-2 text-[var(--muted)]">{dt(m.last_paid)}</td>
                <td className="p-2">{proState(m.pro_until)}</td>
                <td className="p-2 text-[var(--muted)]">{dt(m.created_at)}</td>
                <td className="p-2"><button onClick={() => resetPw(m.email)} className="text-[10px] font-semibold text-[var(--accent)] hover:underline">초기화</button></td>
              </tr>
            ))}
            {!members.length && <EmptyRow cols={9} text="가입 회원 없음" />}
          </Table>
        </>
      )}

      {tab === "payments" && (
        <Table head={["주문번호", "회원ID", "플랜", "금액", "상태", "결제됨", "시각"]}>
          {orders.map((o) => (
            <tr key={o.order_id} className="border-b border-[var(--border)] last:border-0">
              <td className="p-2 font-mono text-[10px]">{o.order_id}</td>
              <td className="p-2 text-[10px]">{o.user_id.slice(0, 12)}</td>
              <td className="p-2">{o.plan}</td>
              <td className="p-2 text-right">{won(o.amount)}</td>
              <td className="p-2"><span className={o.status === "paid" ? "text-emerald-600" : o.status === "failed" ? "text-rose-600" : "text-[var(--muted)]"}>{o.status}</span></td>
              <td className="p-2">{o.paid ? "✓" : "—"}</td>
              <td className="p-2 text-[var(--muted)]">{dt(o.created_at)}</td>
            </tr>
          ))}
          {!orders.length && <EmptyRow cols={7} text="결제 내역 없음" />}
        </Table>
      )}

      {tab === "inquiries" && (
        <Table head={["유형", "보낸 사람", "대상", "내용", "상태·답변", "시각"]}>
          {inquiries.map((q) => {
            const pl = q.payload ?? {};
            return (
              <tr key={q.id} className="border-b border-[var(--border)] last:border-0 align-top">
                <td className="p-2"><span className="kt-badge-brand">{KIND_LABEL[q.kind] ?? q.kind}</span></td>
                <td className="p-2">{q.user_email ?? String(pl.email ?? "—")}</td>
                <td className="p-2 text-[10px]">{String(pl.context ?? "—")}</td>
                <td className="p-2 text-[10px] text-[var(--muted)]">{String(pl.message ?? "")}{pl.budget ? ` · 예산 ${pl.budget}` : ""}</td>
                <td className="p-2 min-w-[220px]"><InquiryReply q={q} onSave={replyInquiry} /></td>
                <td className="p-2 text-[var(--muted)]">{dt(q.created_at)}</td>
              </tr>
            );
          })}
          {!inquiries.length && <EmptyRow cols={6} text="문의·제안 없음" />}
        </Table>
      )}

      {tab === "collect" && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 kt-card p-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold"><Database size={13} className="text-[var(--accent)]" /> 신규 브랜드 발굴 요청</span>
            <form onSubmit={addBrand} className="flex items-center gap-2">
              <input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="브랜드명" className="rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px]" />
              <button className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]">요청 추가</button>
            </form>
            <button onClick={runCollect} disabled={collecting} className="kt-btn kt-btn-primary ml-auto px-3 py-1.5 text-[11px] disabled:opacity-50">
              {collecting ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} 지금 수집 실행
            </button>
            <span className="text-[10px] text-[var(--muted)]">수집 영상 {collectedCount.toLocaleString()}건 · 인플루언서 {creatorsCount.toLocaleString()}명</span>
          </div>
          <p className="mb-3 rounded-md bg-[var(--accent-light)] px-3 py-2 text-[10px] text-[var(--muted)]">
            수집 1회 = <b>브랜드 → 콘텐츠(영상) → 인플루언서 집계 → 브랜드 통계 재계산</b>이 한 사이클로 함께 갱신됩니다.
          </p>
          <h2 className="mb-2 text-[13px] font-bold">브랜드 요청 큐 ({brandReqs.length})</h2>
          <div className="mb-5">
            <Table head={["브랜드", "핸들", "요청자", "상태", "수집", "비고", "시각"]}>
              {brandReqs.map((b) => (
                <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-2 font-semibold">{b.brand_name}</td>
                  <td className="p-2 text-[10px]">{b.handle ?? "—"}</td>
                  <td className="p-2 text-[10px]">{b.source}</td>
                  <td className="p-2"><span className={b.status === "active" ? "text-emerald-600" : b.status === "collecting" ? "text-[var(--accent)]" : b.status === "failed" ? "text-rose-600" : "text-[var(--muted)]"}>{b.status}</span></td>
                  <td className="p-2 text-right">{b.collected}</td>
                  <td className="p-2 max-w-[220px] truncate text-[10px] text-[var(--muted)]" title={b.note ?? ""}>{b.note ?? "—"}</td>
                  <td className="p-2 text-[var(--muted)]">{dt(b.created_at)}</td>
                </tr>
              ))}
              {!brandReqs.length && <EmptyRow cols={7} text="요청 없음" />}
            </Table>
          </div>
          <h2 className="mb-2 text-[13px] font-bold">최근 수집 로그</h2>
          <Table head={["종류", "대상", "상태", "건수", "오류", "시각"]}>
            {runs.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2">{r.kind}</td>
                <td className="p-2">{r.target ?? "—"}</td>
                <td className="p-2"><span className={r.status === "ok" ? "text-emerald-600" : "text-rose-600"}>{r.status}</span></td>
                <td className="p-2 text-right">{r.collected}</td>
                <td className="p-2 max-w-[220px] truncate text-[10px] text-rose-600" title={r.error ?? ""}>{r.error ?? "—"}</td>
                <td className="p-2 text-[var(--muted)]">{dt(r.created_at)}</td>
              </tr>
            ))}
            {!runs.length && <EmptyRow cols={6} text="수집 로그 없음" />}
          </Table>
          <p className="mt-3 text-[10px] text-[var(--muted)]">※ 스크래핑 키(SCRAPER_API_KEY) 설정 시 실제 수집됩니다. 정기 수집은 매일 자동(Vercel Cron)으로 실행됩니다.</p>

          {/* 브랜드별 수집 주기 관리 */}
          <div className="mt-6 mb-2 flex items-center gap-2">
            <h2 className="text-[13px] font-bold">추적 브랜드 관리 ({tracking.length})</h2>
            {tracking.length === 0 && (
              <button onClick={seedTracking} className="kt-btn kt-btn-outline px-3 py-1 text-[10px]">기존 브랜드 추적 등록</button>
            )}
            <button onClick={seedMaster} className="kt-btn kt-btn-outline px-3 py-1 text-[10px]">브랜드 마스터(422) 시드 + 1차학습 큐</button>
          </div>
          <Table head={["브랜드", "추적", "수집 주기(시간)", "마지막 수집"]}>
            {tracking.map((t) => (
              <tr key={t.brand_name} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2 font-semibold">{t.brand_name}</td>
                <td className="p-2">
                  <button
                    onClick={() => updateTrack(t.brand_name, { tracked: !t.tracked, interval_hours: t.interval_hours })}
                    className={`rounded px-2 py-0.5 text-[9px] font-bold ${t.tracked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {t.tracked ? "추적 중" : "중지"}
                  </button>
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    defaultValue={t.interval_hours}
                    onBlur={(e) => { const v = Number(e.target.value); if (v && v !== t.interval_hours) updateTrack(t.brand_name, { tracked: t.tracked, interval_hours: v }); }}
                    className="w-20 rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px]"
                  />
                </td>
                <td className="p-2 text-[var(--muted)]">{dt(t.last_collected_at)}</td>
              </tr>
            ))}
            {!tracking.length && <EmptyRow cols={4} text="추적 브랜드 없음 (위 버튼으로 등록)" />}
          </Table>
        </>
      )}

      {tab === "influencers" && (
        <>
          {/* 블락리스트 관리 */}
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50/50 p-3">
            <h3 className="mb-2 text-[12px] font-bold text-rose-700">블락리스트 ({blocks.length}) — 수집·노출 차단</h3>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <select value={blockKind} onChange={(e) => setBlockKind(e.target.value as "handle" | "brand")} className="rounded border border-[var(--border)] px-2 py-1 text-[11px]">
                <option value="handle">인플루언서(handle)</option>
                <option value="brand">브랜드(brand)</option>
              </select>
              <input value={blockVal} onChange={(e) => setBlockVal(e.target.value)} placeholder={blockKind === "handle" ? "@handle" : "브랜드명"} className="rounded border border-[var(--border)] px-2 py-1 text-[11px]" />
              <button onClick={() => addBlock(blockKind, blockVal)} className="rounded-md bg-rose-600 px-3 py-1 text-[11px] font-semibold text-white">블락 추가</button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {([
                { kind: "handle", title: "인플루언서", pre: "@" },
                { kind: "brand", title: "브랜드", pre: "" },
                { kind: "video", title: "콘텐츠(영상)", pre: "" },
              ] as const).map((grp) => {
                const items = blocks.filter((b) => b.kind === grp.kind);
                return (
                  <div key={grp.kind} className="rounded border border-rose-100 bg-white p-2">
                    <div className="mb-1.5 text-[10px] font-bold text-rose-700">{grp.title} ({items.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {items.map((b) => (
                        <span key={b.value} className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] text-rose-700 ring-1 ring-rose-200">
                          {grp.kind === "video" ? <a href={`https://www.tiktok.com/video/${b.value}`} target="_blank" rel="noreferrer" className="hover:underline">{b.value.slice(0, 10)}…</a> : `${grp.pre}${b.value}`}
                          <button onClick={() => removeBlock(b.kind, b.value)} className="font-bold text-rose-400 hover:text-rose-700">×</button>
                        </span>
                      ))}
                      {!items.length && <span className="text-[10px] text-[var(--muted)]">없음</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mb-2 text-[10px] text-[var(--muted)]">※ 컨택 정보는 내부 DB 전용입니다 (사용자 화면 미노출).</p>
          <Table head={["#", "핸들", "티어", "영상", "평균조회", "누적조회", "이메일", "연락처", "평균단가", "협업 브랜드", "블락"]}>
            {INFLUENCERS.slice(0, 200).map((inf, i) => {
              const c = contactFor(inf.handle);
              const isBlocked = blocks.some((b) => b.kind === "handle" && b.value === inf.handle);
              return (
                <tr key={inf.handle} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-2 text-[var(--muted)]">{i + 1}</td>
                  <td className="p-2 font-semibold">@{inf.handle}</td>
                  <td className="p-2"><span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: TIERS[inf.tier].color }}>{TIERS[inf.tier].label}</span></td>
                  <td className="p-2 text-right">{inf.videos}</td>
                  <td className="p-2 text-right">{inf.avgViews.toLocaleString()}</td>
                  <td className="p-2 text-right">{inf.totalViews.toLocaleString()}</td>
                  <td className="p-2 text-[10px]">{c.email}</td>
                  <td className="p-2 text-[10px]">{c.whatsapp}</td>
                  <td className="p-2 text-[10px] font-semibold text-[var(--accent)]">{won(c.avgRateUSD * 1300)}</td>
                  <td className="p-2 text-[10px] text-[var(--muted)]">{inf.brands.slice(0, 3).join(", ")}</td>
                  <td className="p-2">
                    {isBlocked ? (
                      <button onClick={() => removeBlock("handle", inf.handle)} className="text-[10px] font-semibold text-rose-600">해제</button>
                    ) : (
                      <button onClick={() => addBlock("handle", inf.handle)} className="text-[10px] text-[var(--muted)] hover:text-rose-600">블락</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        </>
      )}

      {tab === "brands" && (
        <Table head={["순위", "브랜드", "카테고리", "영상", "인플루언서", "누적조회", "Shop%"]}>
          {BRANDS.map((b) => (
            <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
              <td className="p-2 text-[var(--muted)]">{b.rank}</td>
              <td className="p-2 font-semibold">{b.name}</td>
              <td className="p-2">{b.category}</td>
              <td className="p-2 text-right">{b.videos}</td>
              <td className="p-2 text-right">{b.influencers}</td>
              <td className="p-2 text-right">{b.totalViews.toLocaleString()}</td>
              <td className="p-2 text-right">{b.shopRatio}%</td>
            </tr>
          ))}
        </Table>
      )}

      {tab === "utm" && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="kt-card p-3"><div className="text-[10px] text-[var(--muted)]">UTM 방문</div><div className="mt-0.5 text-[18px] font-black text-[var(--accent)]">{utm?.totals.visits ?? "…"}</div></div>
            <div className="kt-card p-3"><div className="text-[10px] text-[var(--muted)]">UTM 가입</div><div className="mt-0.5 text-[18px] font-black text-[var(--accent)]">{utm?.totals.signups ?? "…"}</div></div>
            <div className="kt-card p-3"><div className="text-[10px] text-[var(--muted)]">가입 전환율</div><div className="mt-0.5 text-[18px] font-black text-[var(--accent)]">{utm && utm.totals.visits ? `${Math.round((utm.totals.signups / utm.totals.visits) * 1000) / 10}%` : "—"}</div></div>
            <div className="kt-card p-3"><div className="text-[10px] text-[var(--muted)]">소스 수</div><div className="mt-0.5 text-[18px] font-black text-[var(--accent)]">{utm?.bySource.length ?? "…"}</div></div>
          </div>

          {/* 캠페인 링크 빌더 */}
          <div className="mb-4 rounded-md border border-[var(--border)] p-3">
            <h3 className="mb-2 text-[12px] font-bold">캠페인 링크 빌더 (UTM)</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={linkBase} onChange={(e) => setLinkBase(e.target.value)} placeholder="기본 URL" className="rounded border border-[var(--border)] px-2 py-1.5 text-[11px]" />
              {(["source", "medium", "campaign", "content", "term"] as const).map((k) => (
                <input key={k} value={linkUtm[k]} onChange={(e) => setLinkUtm((s) => ({ ...s, [k]: e.target.value }))} placeholder={`utm_${k}`} className="rounded border border-[var(--border)] px-2 py-1.5 text-[11px]" />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-slate-50 px-2 py-1.5 text-[11px]">{builtLink()}</code>
              <button onClick={() => { navigator.clipboard?.writeText(builtLink()); setToast("링크 복사됨"); setTimeout(() => setToast(""), 1500); }} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]">복사</button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {([["소스 (utm_source)", utm?.bySource], ["캠페인 (utm_campaign)", utm?.byCampaign], ["매체 (utm_medium)", utm?.byMedium]] as const).map(([title, rows]) => (
              <div key={title}>
                <h3 className="mb-2 text-[12px] font-bold">{title}</h3>
                <Table head={["값", "방문", "가입"]}>
                  {(rows ?? []).map((r) => (
                    <tr key={r.key} className="border-b border-[var(--border)] last:border-0">
                      <td className="p-2 font-semibold">{r.key}</td>
                      <td className="p-2 text-right">{r.visits}</td>
                      <td className="p-2 text-right text-[var(--accent)]">{r.signups}</td>
                    </tr>
                  ))}
                  {!rows?.length && <EmptyRow cols={3} text="데이터 없음" />}
                </Table>
              </div>
            ))}
          </div>

          <h3 className="mb-2 mt-6 text-[12px] font-bold">최근 유입 이벤트</h3>
          <Table head={["종류", "소스", "매체", "캠페인", "가입이메일", "시각"]}>
            {(utm?.recent ?? []).map((e, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2"><span className={e.kind === "signup" ? "font-semibold text-[var(--accent)]" : "text-[var(--muted)]"}>{e.kind}</span></td>
                <td className="p-2">{e.source ?? "—"}</td>
                <td className="p-2">{e.medium ?? "—"}</td>
                <td className="p-2">{e.campaign ?? "—"}</td>
                <td className="p-2 text-[10px]">{e.user_email ?? "—"}</td>
                <td className="p-2 text-[var(--muted)]">{dt(e.created_at)}</td>
              </tr>
            ))}
            {!utm?.recent.length && <EmptyRow cols={6} text="유입 이벤트 없음" />}
          </Table>
        </>
      )}

      {tab === "rules" && (
        <div className="kt-card max-w-2xl p-5">
          <h3 className="mb-3 text-[13px] font-bold">크롤링 / 수집 규칙</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <RuleNum label="콘텐츠 수집 주기(시간)" value={rules.collectIntervalHours} onChange={(v) => setRules({ ...rules, collectIntervalHours: v })} />
            <RuleNum label="신규 브랜드 자가학습(시간)" value={rules.newBrandLearningHours} onChange={(v) => setRules({ ...rules, newBrandLearningHours: v })} />
            <RuleText label="주간 재학습 요일(쉼표)" value={rules.weeklyLearningDays.join(",")} onChange={(v) => setRules({ ...rules, weeklyLearningDays: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
            <RuleText label="재학습 시각" value={rules.weeklyLearningTime} onChange={(v) => setRules({ ...rules, weeklyLearningTime: v })} />
            <RuleNum label="최소 조회수 필터" value={rules.minViews} onChange={(v) => setRules({ ...rules, minViews: v })} />
            <label className="flex items-end gap-2 text-[11px] font-semibold">
              <input type="checkbox" checked={rules.excludeOfficialAccounts} onChange={(e) => setRules({ ...rules, excludeOfficialAccounts: e.target.checked })} className="h-3.5 w-3.5 accent-[var(--accent)]" />
              브랜드 공식/샵 계정 제외
            </label>
            <RuleText label="공식계정 제외 키워드(쉼표)" value={rules.excludeKeywords.join(",")} onChange={(v) => setRules({ ...rules, excludeKeywords: v.split(",").map((x) => x.trim()).filter(Boolean) })} full />
            <RuleText label="수집 소스(쉼표)" value={rules.sources.join(",")} onChange={(v) => setRules({ ...rules, sources: v.split(",").map((x) => x.trim()).filter(Boolean) })} full />
          </div>
          <button onClick={saveRules} className="kt-btn kt-btn-primary mt-4 px-5 py-2 text-[12px]">규칙 저장</button>
          <p className="mt-2 text-[10px] text-[var(--muted)]">※ 규칙 저장까지 지원합니다. 실제 수집 워커(cron) 연동 시 이 값이 파이프라인에 적용됩니다.</p>
        </div>
      )}
    </PageShell>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="kt-card overflow-x-auto">
      <table className="w-full min-w-[640px] text-[11px]">
        <thead><tr className="border-b border-[var(--border)] text-left text-[10px] uppercase text-[var(--muted)]">{head.map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return <tr><td colSpan={cols} className="p-6 text-center text-[var(--muted)]">{text}</td></tr>;
}
function InquiryReply({ q, onSave }: { q: Inquiry; onSave: (id: number, status: string, response: string) => void }) {
  const [status, setStatus] = useState(q.status ?? "pending");
  const [resp, setResp] = useState(q.response ?? "");
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-[var(--border)] px-1 py-0.5 text-[10px]">
          {["pending", "reviewing", "accepted", "declined", "done"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => onSave(q.id, status, resp)} className="rounded bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white">저장</button>
      </div>
      <textarea value={resp} onChange={(e) => setResp(e.target.value)} rows={2} placeholder="회원에게 보낼 답변" className="w-full rounded border border-[var(--border)] px-1.5 py-1 text-[10px]" />
    </div>
  );
}
function RuleNum({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold">{label}</span><input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" /></label>;
}
function RuleText({ label, value, onChange, full }: { label: string; value: string; onChange: (v: string) => void; full?: boolean }) {
  return <label className={`block ${full ? "sm:col-span-2" : ""}`}><span className="mb-1 block text-[11px] font-semibold">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border border-[var(--border)] px-2.5 py-2 text-[12px] outline-none focus:border-[var(--accent)]" /></label>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Users, CreditCard, UserSquare2, Tag, SlidersHorizontal, Loader2, LogOut, Gift, Inbox, Database, Play, Link2 as LinkIcon, ShoppingBag, X } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { INFLUENCERS, contactFor } from "@/data/ktrend/influencers";
import { BRANDS } from "@/data/ktrend/brands";
import { TIERS, COUNTRIES } from "@/data/ktrend/meta";

// 관리자 승인으로 부여 가능한 시장(US는 기본 허용이라 제외)
const GRANT_MARKETS = COUNTRIES.filter((c) => c.active && c.id !== "US");
import { SELF_CHECK_QUESTIONS, ONB_COUNTRY_MAP, COMMON_CERT } from "@/lib/onboarding";
import { DEFAULT_CRAWL_RULES, type CrawlRules } from "@/lib/crawl-rules";

interface Member {
  id: string; email: string; name: string; brand: string | null; role: string | null;
  plan: string; pro_until: number; created_at: string; paid_total: number; last_paid: string | null;
  promo_code?: string | null; sub_status?: string | null; invite_count?: number;
  markets?: string | null; // 열람 승인 시장 CSV(US 제외 저장)
}
interface Order {
  order_id: string; user_id: string; plan: string; amount: number; status: string; created_at: string; paid: boolean;
}
interface MemberDetail {
  user: { id: string; email: string; name: string; brand: string | null; role: string | null; plan: string; pro_until: number | string; referred_by: string | null; markets: string | null; admin_note: string | null; created_at: string };
  subscription: { plan: string; amount: number; status: string; next_charge_at: number | string; failures: number } | null;
  mallSubscription: { track: string; amount: number; status: string; next_charge_at: number | string; failures: number } | null;
  orders: { order_id: string; plan: string; amount: number; charge_amount: number | null; goods_name: string | null; status: string; kind: string; tid: string | null; created_at: string }[];
  onboarding: { id: string; name: string | null; brand: string | null; contact: string | null; email: string | null; track: string | null; grade: string | null; countries: string | null; term: string | null; amount: number | null; status: string; phase: string | null; referral_code: string | null; payload: OnbPayload | null; updated_at: string } | null;
  files: { id: string; kind: string; product_index: number | null; filename: string | null; mime: string | null; size: number | null; created_at: string }[];
  inquiries: { id: number; kind: string; payload: Record<string, unknown> | null; status: string | null; response: string | null; created_at: string }[];
  consults: { id: number; company: string; manager_name: string | null; contact: string | null; category: string | null; message: string | null; source: string | null; status: string; created_at: string }[];
}
interface Totals { users: number; payments: number; revenue: number; active_pro: number; }
interface Inquiry { id: number; kind: string; user_email: string | null; payload: Record<string, unknown> | null; status?: string; response?: string | null; created_at: string; }
interface BrandReq { id: number; brand_name: string; handle: string | null; source: string; status: string; collected: number; note: string | null; created_at: string; }
interface Run { id: number; kind: string; target: string | null; status: string; collected: number; error: string | null; created_at: string; }
interface BrandHealth { brand_name: string; videos: number; influencers: number; total_views: number; last_collected_at: string | null; tracked: boolean | null; interval_hours: number | null; }
interface ShopStat { brand_name: string; products: number; avg_commission: string | number | null; total_sold: string | number | null; est_gmv: string | number | null; updated_at: string; }
interface Track { brand_name: string; tracked: boolean; interval_hours: number; hashtags: string | null; last_collected_at: string | null; }

const KIND_LABEL: Record<string, string> = {
  marketing: "마케팅 1:1", tiktokshop: "틱톡샵 온보딩", proposal: "인플루언서 제안", sales: "도입 문의", password_reset: "비밀번호 재설정",
};

const won = (n: number) => "₩" + Number(n || 0).toLocaleString();
// 한국시간(KST) 표기. 숫자면 epoch(ms), 아니면 ISO 문자열로 파싱.
const dt = (s: string | number | null) => {
  if (s == null || s === "") return "—";
  const d = new Date(typeof s === "number" || /^\d+$/.test(String(s)) ? Number(s) : String(s));
  if (isNaN(d.getTime())) return String(s).slice(0, 16).replace("T", " ");
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "2-digit", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
};
const proState = (until: number) => (Number(until) > Date.now() ? `Pro ~${new Date(Number(until)).toISOString().slice(0, 10)}` : "—");
const proSource = (m: { pro_until: number; sub_status?: string | null; promo_code?: string | null; invite_count?: number; paid_total?: number }) => {
  if (Number(m.pro_until) <= Date.now()) return "—";
  if (m.sub_status) return m.sub_status === "trial" ? "결제 체험(7일)" : `구독(${m.sub_status})`;
  if (m.promo_code) return `프로모션(${m.promo_code})`;
  if ((m.invite_count ?? 0) >= 3) return "동료 초대(7일)";
  if ((m.paid_total ?? 0) > 0) return "결제";
  return "수동/기타";
};

interface OnbFile { id: string; filename: string }
interface OnbProduct { nameKo?: string; nameEn?: string; cat?: string; price?: string; cost?: string; netWeight?: string; netUnit?: string; packWeight?: string; w?: string; h?: string; d?: string; desc?: string; cert?: OnbFile | null; photos?: OnbFile[]; label?: { productName?: boolean; netQuantity?: boolean; directions?: boolean; ingredients?: boolean; contact?: boolean }; contact?: { address?: string; phone?: string; website?: string }; realPhoto?: boolean }
interface OnbPayload {
  checks?: Record<string, boolean>; yes?: number; countries?: string[]; certs?: Record<string, string>; referral?: string;
  details?: {
    brandKo?: string; brandEn?: string; bizNo?: string; repName?: string; managerName?: string; contact?: string; email?: string;
    meetingType?: string; meetingSlots?: string[]; products?: OnbProduct[]; settlement?: { bank?: string; acct?: string; holder?: string };
    bizRegFile?: OnbFile | null; note?: string;
  };
}
interface OnbApp {
  id: string; user_id: string; name: string | null; brand: string | null; contact: string | null;
  email: string | null; track: string | null; grade: string | null; recommended_track: string | null;
  countries: string | null; term: string | null; amount: number | null; phase: string | null;
  referral_code: string | null; status: string; order_id: string | null; payload: OnbPayload | null;
  created_ms: number; updated_ms: number;
}
const TRACK_LABEL: Record<string, string> = { ready: "Start", live: "Live Focus", guarantee: "Guarantee", onboarding: "Onboarding" };
interface Referrer { code: string; login_id: string; name: string | null; created_ms: number; signups: number; paid_users: number; revenue: number; rate: number; commission: number }
type Tab = "members" | "payments" | "inquiries" | "consult" | "funnel" | "promo" | "onboarding" | "referrers" | "collect" | "influencers" | "brands" | "utm" | "rules";
interface FunnelData {
  totals: { sessions: number; completed: number; abandoned: number; completionRate: number };
  funnel: { key: string; label: string; reached: number; pct: number }[];
  dropoff: { field: string | null; label: string; count: number }[];
  sources: { source: string; medium: string; campaign: string; sessions: number; started: number; completed: number; completionRate: number }[];
  recent: { sid: string; fieldCount: number; lastField: string; category: string; agreed: boolean; completed: boolean; mobile: boolean; source: string; medium: string; campaign: string; landing: string; updatedAt: string }[];
}
interface PromoRow { code: string; plan: string; trial_days: number; max_uses: number; used_count: number; active: boolean; created_at: string }
interface ConsultRow { id: number; company: string; brand_url: string | null; category: string | null; overseas: string | null; manager_name: string; email: string; contact: string; message: string | null; agreed: boolean; status: string; created_at: string }
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
  const [consult, setConsult] = useState<ConsultRow[]>([]);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [newPromo, setNewPromo] = useState({ code: "", max_uses: 0 });
  const [brandReqs, setBrandReqs] = useState<BrandReq[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [brandHealth, setBrandHealth] = useState<BrandHealth[]>([]);
  const [shopStats, setShopStats] = useState<ShopStat[]>([]);
  const [collectedCount, setCollectedCount] = useState(0);
  const [creatorsCount, setCreatorsCount] = useState(0);
  const [newBrand, setNewBrand] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [autoMin, setAutoMin] = useState(10);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [lastCollect, setLastCollect] = useState<{ at: string; ok: boolean; scraper?: boolean; mode?: string; reason?: string; ingested?: number; polledDone?: number; kickedNew?: number; kickedRefresh?: number } | null>(null);
  const [tracking, setTracking] = useState<Track[]>([]);
  const [onbApps, setOnbApps] = useState<OnbApp[]>([]);
  const [onbDetail, setOnbDetail] = useState<OnbApp | null>(null);
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null);
  const [memberLoading, setMemberLoading] = useState<string | null>(null);
  const openMemberDetail = async (id: string) => {
    setMemberLoading(id);
    const r = await fetch(`/api/admin/member?id=${encodeURIComponent(id)}`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    setMemberLoading(null);
    if (r?.ok) setMemberDetail(r as MemberDetail);
    else setToast(r?.error ?? "회원 상세 로드 실패");
  };
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [refName, setRefName] = useState("");
  const [refLoginId, setRefLoginId] = useState("");
  const [refPw, setRefPw] = useState("");
  const [newRef, setNewRef] = useState<{ code: string; loginId: string; name: string } | null>(null);
  const [blocks, setBlocks] = useState<{ kind: string; value: string; reason: string | null }[]>([]);
  const [blockVal, setBlockVal] = useState("");
  const [blockKind, setBlockKind] = useState<"handle" | "brand">("handle");
  const [utm, setUtm] = useState<{ bySource: UtmRow[]; byCampaign: UtmRow[]; byMedium: UtmRow[]; recent: UtmRecent[]; totals: { visits: number; signups: number } } | null>(null);
  const [linkBase, setLinkBase] = useState("https://glovek.space");
  const [linkUtm, setLinkUtm] = useState({ source: "", medium: "", campaign: "", content: "", term: "" });
  const [totals, setTotals] = useState<Totals | null>(null);
  const [rules, setRules] = useState<CrawlRules>(DEFAULT_CRAWL_RULES);
  const [tuning, setTuning] = useState<{ initialLimit: number; refreshLimit: number; maxPending: number; maxRefresh: number; maxPoll: number } | null>(null);
  const [shopTuning, setShopTuning] = useState<{ maxItems: number; maxBrands: number; maxRunning: number; maxPoll: number; retryDays: number } | null>(null);
  const [shopCountries, setShopCountries] = useState<string[]>([]);
  const [shopAllowed, setShopAllowed] = useState<string[]>(["US", "TH", "VN", "MY", "SG", "ID", "PH", "GB", "JP"]);
  const [shopTestBrand, setShopTestBrand] = useState("");
  const [shopTestCountry, setShopTestCountry] = useState("US");
  const [shopTestResult, setShopTestResult] = useState<Record<string, unknown> | null>(null);
  const [shopTestBusy, setShopTestBusy] = useState(false);
  const [enrich, setEnrich] = useState<{ total: number; enriched: number; withEmail: number; remaining: number; configured: boolean } | null>(null);
  const [enrichBusy, setEnrichBusy] = useState(false);
  const [enrichMsg, setEnrichMsg] = useState<string | null>(null);
  const [collectPaused, setCollectPaused] = useState<boolean | null>(null);
  const [collectLog, setCollectLog] = useState<{
    summary: { totalProducts: number; totalImage: number; imagePct: number };
    byCountry: { country: string; products: number; with_image: number; with_commission: number; last_collected: string | null }[];
    shopJobs: Record<string, number>;
    runs: { id: number; kind: string; target: string | null; status: string; collected: number; error: string | null; created_at: string }[];
  } | null>(null);
  const [regions, setRegions] = useState<string[] | null>(null);
  const [regionOpts, setRegionOpts] = useState<{ id: string; nameKo: string; flag: string }[]>([]);
  const loadedTabs = useRef<Set<string>>(new Set());
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

  // 핵심(overview)만 진입 시 로드. 탭별 부가 데이터는 해당 탭 진입 시 지연 로드(로드 시간 단축).
  const loadData = async () => {
    setLoadingData(true);
    const r = await fetch("/api/admin/overview", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    setLoadingData(false);
    if (r && !r.error) {
      setMembers(r.members ?? []);
      setOrders(r.orders ?? []);
      setInquiries(r.inquiries ?? []);
      setConsult(r.consultRequests ?? []);
      setBrandReqs(r.brandRequests ?? []);
      setRuns(r.collectionRuns ?? []);
      setBrandHealth(r.brandHealth ?? []);
      setShopStats(r.shopStats ?? []);
      setCollectedCount(r.collectedCount ?? 0);
      setCreatorsCount(r.creatorsCount ?? 0);
      setTotals(r.totals ?? null);
      if (r.crawlRules) setRules({ ...DEFAULT_CRAWL_RULES, ...r.crawlRules });
    }
  };
  const loadOnb = async () => {
    const onb = await fetch("/api/onboarding/apply", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (onb?.ok) setOnbApps(onb.items ?? []);
  };
  const loadReferrers = async () => {
    const refs = await fetch("/api/admin/referrers", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (refs?.ok) setReferrers(refs.items ?? []);
  };
  const loadFunnel = async () => {
    const fn = await fetch("/api/admin/consult-funnel", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (fn && !fn.error) setFunnel(fn as FunnelData);
  };
  const loadTuning = async () => {
    const t = await fetch("/api/admin/collect-tuning", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (t?.ok) setTuning(t.tuning);
    const g = await fetch("/api/admin/collect-regions", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (g?.ok) { setRegions(g.regions); setRegionOpts(g.options ?? []); }
    const s = await fetch("/api/admin/shop-tuning", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (s?.ok) { setShopTuning(s.tuning); setShopCountries(s.countries ?? ["US"]); if (Array.isArray(s.allowed)) setShopAllowed(s.allowed); }
    loadCollectLog();
  };
  const loadCollectLog = async () => {
    const l = await fetch("/api/admin/collect-log", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (l?.ok) setCollectLog(l);
    const e = await fetch("/api/admin/creators/enrich-emails", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (e?.ok) setEnrich(e);
    const p = await fetch("/api/admin/collect-pause", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (p?.ok) setCollectPaused(!!p.paused);
  };
  const togglePause = async (paused: boolean) => {
    setCollectPaused(paused);
    await fetch("/api/admin/collect-pause", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused }) });
    setToast(paused ? "⏸ 모든 자동 수집 정지됨 (비용 차단)" : "▶ 수집 재개됨");
  };
  const runEnrich = async () => {
    setEnrichBusy(true); setEnrichMsg(null);
    try {
      const r = await fetch("/api/admin/creators/enrich-emails", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batch: 20 }) });
      const j = await r.json();
      setEnrichMsg(j.ok ? `배치 완료: ${j.processed}건 처리 · 이메일 ${j.foundEmail}건 발견${j.reason ? ` · ${j.reason}` : ""}` : (j.error || "실패"));
      if (j.total != null) setEnrich((cur) => ({ ...(cur || { configured: true }), total: j.total, enriched: j.enriched, withEmail: j.withEmail, remaining: j.remaining } as typeof cur));
    } catch (e) { setEnrichMsg(String((e as Error).message || e)); }
    finally { setEnrichBusy(false); }
  };
  const saveShopTuning = async () => {
    if (!shopTuning) return;
    const r = await fetch("/api/admin/shop-tuning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tuning: shopTuning }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) { setShopTuning(d.tuning); setToast("샵 수집 설정 저장됨 (즉시 적용)"); } else setToast(d.error ?? "저장 실패");
  };
  const runShopTest = async (ingest: boolean) => {
    if (!shopTestBrand.trim()) { setToast("브랜드명을 입력하세요"); return; }
    setShopTestBusy(true); setShopTestResult(null);
    try {
      const r = await fetch("/api/admin/shop-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ brand: shopTestBrand.trim(), country: shopTestCountry, maxItems: 5, ingest }) });
      const d = await r.json();
      setShopTestResult(d);
      if (ingest) loadCollectLog();
      setToast(d?.ok ? `테스트 완료: ${d?.diagnostics?.verdict ?? ""}` : (d?.error ?? "실패"));
    } catch (e) { setShopTestResult({ ok: false, error: String((e as Error).message || e) }); }
    finally { setShopTestBusy(false); }
  };
  const saveShopCountries = async (next: string[]) => {
    const final = next.length ? next : ["US"];
    setShopCountries(final);
    const r = await fetch("/api/admin/shop-tuning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ countries: final }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) { setShopCountries(d.countries); setToast("샵 수집 국가 저장됨 (즉시 적용)"); } else setToast(d.error ?? "저장 실패");
  };
  const saveRegions = async (next: string[]) => {
    setRegions(next);
    const r = await fetch("/api/admin/collect-regions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ regions: next }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) { setRegions(d.regions); setToast("수집 지역 저장됨 (즉시 적용)"); } else setToast(d.error ?? "저장 실패");
  };
  // 탭 진입 시 1회 지연 로드
  useEffect(() => {
    if (!authed) return;
    const k = (key: string, fn: () => void) => { if (!loadedTabs.current.has(key)) { loadedTabs.current.add(key); fn(); } };
    if (tab === "onboarding") k("onboarding", loadOnb);
    if (tab === "referrers") k("referrers", loadReferrers);
    if (tab === "collect") k("tuning", loadTuning);
    if (tab === "promo") k("promo", loadPromos);
    if (tab === "funnel") k("funnel", loadFunnel);
  }, [authed, tab]);
  // 새로고침: overview + 현재 탭 부가데이터
  const refresh = () => {
    loadData();
    if (tab === "onboarding") loadOnb();
    if (tab === "referrers") loadReferrers();
    if (tab === "collect") loadTuning();
    if (tab === "funnel") loadFunnel();
  };
  const saveTuning = async () => {
    if (!tuning) return;
    const r = await fetch("/api/admin/collect-tuning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tuning) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) { setTuning(d.tuning); setToast("수집 강도 저장됨 (즉시 적용)"); } else setToast(d.error ?? "저장 실패");
  };

  const createReferrer = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/admin/referrers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: refName, loginId: refLoginId, password: refPw }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.ok) { setNewRef(d); setRefName(""); setRefLoginId(""); setRefPw(""); setToast(`추천인 생성: ${d.code}`); loadReferrers(); }
    else setToast(d.error ?? "생성 실패");
  };
  const changeRefPw = async (code: string) => {
    const pw = prompt("새 비밀번호를 입력하세요 (4자 이상)");
    if (!pw) return;
    const r = await fetch("/api/admin/referrers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, password: pw }) });
    const d = await r.json().catch(() => ({}));
    setToast(r.ok && d.ok ? `비밀번호 변경됨: ${code}` : (d.error ?? "변경 실패"));
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

  const setMemberMarkets = async (email: string, codes: string[]) => {
    const r = await fetch("/api/admin/markets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, markets: codes }),
    });
    const d = await r.json().catch(() => ({}));
    setToast(r.ok ? `${email} 시장 열람 권한 업데이트` : (d.error ?? "실패"));
    setTimeout(() => setToast(""), 2000);
    if (r.ok) loadData();
  };

  const replyInquiry = async (id: number, status: string, response: string) => {
    const r = await fetch("/api/admin/inquiry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, response }) });
    setToast(r.ok ? "답변 저장됨 (회원 마이페이지 노출)" : "저장 실패");
    setTimeout(() => setToast(""), 2500);
    if (r.ok) loadData();
  };

  const loadPromos = async () => {
    const r = await fetch("/api/admin/promo", { cache: "no-store" }).then((x) => x.json()).catch(() => null);
    if (r?.rows) setPromos(r.rows);
  };
  const createPromo = async () => {
    const r = await fetch("/api/admin/promo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: newPromo.code, max_uses: newPromo.max_uses }) });
    const d = await r.json().catch(() => ({}));
    setToast(r.ok && d.ok ? `프로모 코드 생성: ${d.code}` : (d.error ?? "실패"));
    setTimeout(() => setToast(""), 3000);
    if (r.ok) { setNewPromo({ code: "", max_uses: 0 }); loadPromos(); }
  };
  const togglePromo = async (code: string, active: boolean) => {
    await fetch("/api/admin/promo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, active }) });
    loadPromos();
  };
  const deletePromo = async (code: string) => {
    if (!confirm(`프로모 코드 ${code} 삭제?`)) return;
    await fetch("/api/admin/promo", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    loadPromos();
  };

  const saveConsultStatus = async (id: number, status: string) => {
    setConsult((rows) => rows.map((c) => (c.id === id ? { ...c, status } : c))); // 낙관적
    const r = await fetch("/api/admin/consult", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    setToast(r.ok ? "상담 상태 저장됨" : "저장 실패");
    setTimeout(() => setToast(""), 2000);
    if (!r.ok) loadData();
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm(`이 결제를 취소(환불)합니다.\n${orderId}\n계속할까요?`)) return;
    const stopSubscription = confirm("정기결제 건이면 구독도 함께 해지할까요?\n확인 = 구독 해지 + pro 회수 / 취소 = 이번 결제만 환불");
    setCancelling(orderId);
    const call = (forceLocal: boolean) => fetch("/api/admin/payment-cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, stopSubscription, forceLocal }) }).then((x) => x.json().catch(() => ({})));
    let d = await call(false);
    // 나이스페이가 거래를 못 찾는 경우(테스트/환경 불일치 등) → 기록만 취소 제안
    if (!d.ok && (d.canForceLocal || d.noTid)) {
      if (confirm(`나이스페이 취소가 안 됩니다:\n${d.error}\n\n실환불이 필요 없는 건(테스트/환경 불일치/이미 처리됨)이면 우리 DB 기록만 '취소'로 정리할 수 있습니다.\n기록만 취소할까요?`)) {
        d = await call(true);
      }
    }
    setCancelling(null);
    setToast(d.ok ? `취소 완료${d.forced ? "(기록만)" : ""}${d.subStopped ? " · 구독 해지" : ""}` : (d.error ?? "취소 실패"));
    setTimeout(() => setToast(""), 4000);
    loadData();
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
  useEffect(() => { if (authed) { loadTracking(); loadBlocks(); loadUtm(); } }, [authed]);

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

  // 자동 실행: 페이지가 열려 있는 동안 autoMin분마다 수집 실행 (외부 스케줄러 없이)
  useEffect(() => {
    try {
      if (localStorage.getItem("admin.autoRun") === "1") setAutoRun(true);
      const m = Number(localStorage.getItem("admin.autoMin")); if (m >= 3) setAutoMin(m);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (!authed || !autoRun) return;
    const id = setInterval(() => { runCollect(false); }, Math.max(3, autoMin) * 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, autoRun, autoMin]);

  // 지정 브랜드 심층 크롤링 (+필터)
  const [deepBrand, setDeepBrand] = useState("");
  const [deepHandle, setDeepHandle] = useState("");
  const [deepHashtags, setDeepHashtags] = useState("");
  const [deepScope, setDeepScope] = useState<"both" | "video" | "shop">("both");
  const [deepYears, setDeepYears] = useState(2);
  const [deepLimit, setDeepLimit] = useState(1500);
  const [deepCountries, setDeepCountries] = useState<string[]>([]);
  const [deepBusy, setDeepBusy] = useState(false);
  const runDeepCrawl = async () => {
    if (!deepBrand.trim()) { setToast("브랜드명을 입력하세요"); return; }
    setDeepBusy(true);
    const r = await fetch("/api/admin/deep-crawl", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: deepBrand.trim(), handle: deepHandle.trim() || undefined,
        hashtags: deepHashtags.trim() || undefined, scope: deepScope,
        years: deepYears, limit: deepLimit,
        countries: deepCountries.length ? deepCountries : undefined,
        regions: deepCountries.length ? deepCountries : undefined,
      }),
    }).then((x) => x.json()).catch(() => null);
    setDeepBusy(false);
    if (r?.ok) {
      setToast(`심층 수집 시작 — ${r.brand}: 영상 ${r.videoKicked}·샵 ${r.shopKicked} run${r.errors?.length ? ` · 경고 ${r.errors.length}` : ""}`);
      setDeepBrand(""); setDeepHandle(""); setDeepHashtags("");
    } else setToast(r?.error ?? "심층 수집 실패");
  };

  const runCollect = async (retryFailed = false) => {
    setCollecting(true);
    const t = new Date().toLocaleTimeString("ko-KR");
    try {
      const r = await fetch("/api/admin/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retryFailed }),
      });
      const text = await r.text();
      let d: Record<string, unknown> = {};
      try { d = JSON.parse(text); } catch { /* non-json */ }
      setCollecting(false);
      setLastCollect({ at: new Date().toLocaleString("ko-KR"), ok: r.ok, ...d });
      setDebugLog((L) => [`[${t}] ${retryFailed ? "재시도+" : ""}실행 → HTTP ${r.status}: ${text.slice(0, 500)}`, ...L].slice(0, 20));
      if (!r.ok) setToast(`수집 실패 (HTTP ${r.status})`);
      else if (d.scraper === false) setToast("스크래퍼 키(SCRAPER_API_KEY) 미설정");
      else if (d.mode === "skipped") setToast(`보류: ${d.reason ?? "설정 확인"}`);
      else setToast(`적재 ${d.ingested ?? 0}건 · 신규 ${d.kickedNew ?? 0}·갱신 ${d.kickedRefresh ?? 0} 시작`);
      setTimeout(() => setToast(""), 5000);
      loadData();
    } catch (e) {
      setCollecting(false);
      setDebugLog((L) => [`[${t}] 요청 오류: ${String(e).slice(0, 300)}`, ...L].slice(0, 20));
      setToast("요청 오류 (네트워크/권한)");
      setTimeout(() => setToast(""), 5000);
    }
  };

  const seedMarket = async (country: string, flag: string, label: string) => {
    setCollecting(true);
    const tnow = new Date().toLocaleTimeString("ko-KR");
    try {
      const r = await fetch("/api/admin/seed-market", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country }),
      });
      const text = await r.text();
      let d: Record<string, unknown> = {};
      try { d = JSON.parse(text); } catch { /* non-json */ }
      setCollecting(false);
      setDebugLog((L) => [`[${tnow}] ${label} 데이터 반영 → HTTP ${r.status}: ${text.slice(0, 400)}`, ...L].slice(0, 20));
      setToast(r.ok ? `${flag} ${label} ${d.inserted ?? 0}건 · 브랜드 ${d.brands ?? 0} · 인플루언서 ${d.creators ?? 0} 반영` : `실패: ${d.error ?? `HTTP ${r.status}`}`);
      setTimeout(() => setToast(""), 6000);
      loadData();
    } catch (e) {
      setCollecting(false);
      setDebugLog((L) => [`[${tnow}] ${label} 반영 오류: ${String(e).slice(0, 200)}`, ...L].slice(0, 20));
      setToast("요청 오류");
      setTimeout(() => setToast(""), 4000);
    }
  };

  const runShopCollect = async () => {
    setCollecting(true);
    const tnow = new Date().toLocaleTimeString("ko-KR");
    try {
      const r = await fetch("/api/admin/collect-shop", { method: "POST" });
      const text = await r.text();
      setCollecting(false);
      setDebugLog((L) => [`[${tnow}] 샵수집 → HTTP ${r.status}: ${text.slice(0, 400)}`, ...L].slice(0, 20));
      setToast(`샵 수집 실행 (HTTP ${r.status})`);
      setTimeout(() => setToast(""), 4000);
      loadData(); loadCollectLog();
    } catch (e) {
      setCollecting(false);
      setDebugLog((L) => [`[${tnow}] 샵수집 오류: ${String(e).slice(0, 200)}`, ...L].slice(0, 20));
    }
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
    { id: "consult", label: "1:1 상담신청", icon: <Inbox size={13} /> },
    { id: "funnel", label: "상담 입력 퍼널", icon: <SlidersHorizontal size={13} /> },
    { id: "promo", label: "프로모 코드", icon: <Gift size={13} /> },
    { id: "onboarding", label: "틱톡샵 온보딩", icon: <ShoppingBag size={13} /> },
    { id: "referrers", label: "추천인", icon: <Gift size={13} /> },
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
        <div className="flex items-center gap-2">
          <a href="/admin/outreach" className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]"><Users size={13} /> 아웃리치 보드</a>
          <button onClick={logout} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]"><LogOut size={13} /> 로그아웃</button>
        </div>
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
        <button onClick={refresh} className="ml-auto shrink-0 rounded-md border border-[var(--border)] px-3 py-1.5 text-[11px] text-[var(--muted)]">새로고침</button>
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

          <Table head={["이메일", "이름", "브랜드", "플랜", "결제액", "최근결제", "Pro 상태", "Pro 출처", "시장 열람", "가입일", "비번", "상세"]}>
            {members.map((m) => {
              const cur = new Set((m.markets ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean));
              return (
              <tr key={m.id} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2 font-semibold">{m.email}</td>
                <td className="p-2">{m.name}</td>
                <td className="p-2">{m.brand ?? "—"}</td>
                <td className="p-2"><span className="kt-badge-brand">{m.plan}</span></td>
                <td className="p-2 text-right">{won(m.paid_total)}</td>
                <td className="p-2 text-[var(--muted)]">{dt(m.last_paid)}</td>
                <td className="p-2">{proState(m.pro_until)}</td>
                <td className="p-2 text-[10px]">{proSource(m)}</td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1" title="동남아 시장 열람 승인 (US는 모두 기본)">
                    {GRANT_MARKETS.map((co) => {
                      const on = cur.has(co.id);
                      return (
                        <button
                          key={co.id}
                          onClick={() => {
                            const next = new Set(cur);
                            if (on) next.delete(co.id); else next.add(co.id);
                            setMemberMarkets(m.email, Array.from(next));
                          }}
                          title={co.nameKo}
                          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold transition-colors ${on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"}`}
                        >
                          {co.flag}{co.id}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="p-2 text-[var(--muted)]">{dt(m.created_at)}</td>
                <td className="p-2"><button onClick={() => resetPw(m.email)} className="text-[10px] font-semibold text-[var(--accent)] hover:underline">초기화</button></td>
                <td className="p-2">
                  <button onClick={() => openMemberDetail(m.id)} disabled={memberLoading === m.id}
                    className="rounded-md border border-[var(--accent)] px-2 py-1 text-[10px] font-bold text-[var(--accent)] hover:bg-[var(--accent-light)] disabled:opacity-50">
                    {memberLoading === m.id ? "…" : "상세"}
                  </button>
                </td>
              </tr>
              );
            })}
            {!members.length && <EmptyRow cols={12} text="가입 회원 없음" />}
          </Table>
        </>
      )}

      {tab === "payments" && (
        <Table head={["주문번호", "회원ID", "플랜", "금액", "상태", "결제됨", "시각", "취소"]}>
          {orders.map((o) => (
            <tr key={o.order_id} className="border-b border-[var(--border)] last:border-0">
              <td className="p-2 font-mono text-[10px]">{o.order_id}</td>
              <td className="p-2 text-[10px]">{o.user_id.slice(0, 12)}</td>
              <td className="p-2">{o.plan}</td>
              <td className="p-2 text-right">{won(o.amount)}</td>
              <td className="p-2"><span className={o.status === "paid" ? "text-emerald-600" : o.status === "cancelled" ? "text-slate-400" : o.status === "failed" ? "text-rose-600" : "text-[var(--muted)]"}>{o.status}</span></td>
              <td className="p-2">{o.paid ? "✓" : "—"}</td>
              <td className="p-2 text-[var(--muted)]">{dt(o.created_at)}</td>
              <td className="p-2">
                {o.paid && o.status !== "cancelled" ? (
                  <button onClick={() => cancelOrder(o.order_id)} disabled={cancelling === o.order_id}
                    className="rounded-md border border-rose-300 px-2 py-1 text-[10px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                    {cancelling === o.order_id ? "취소 중…" : "결제취소"}
                  </button>
                ) : o.status === "cancelled" ? <span className="text-[10px] text-slate-400">취소됨</span> : <span className="text-[10px] text-slate-300">—</span>}
              </td>
            </tr>
          ))}
          {!orders.length && <EmptyRow cols={8} text="결제 내역 없음" />}
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

      {tab === "consult" && (
        <Table head={["회사", "담당자", "이메일", "연락처", "카테고리", "해외경험", "브랜드", "문의내용", "상태", "신청일"]}>
          {consult.map((c) => (
            <tr key={c.id} className="border-b border-[var(--border)] last:border-0 align-top">
              <td className="p-2 font-semibold">{c.company}</td>
              <td className="p-2">{c.manager_name}</td>
              <td className="p-2"><a href={`mailto:${c.email}`} className="text-[var(--accent)] hover:underline">{c.email}</a></td>
              <td className="p-2">{c.contact}</td>
              <td className="p-2">{c.category ?? "—"}</td>
              <td className="p-2 text-[10px]">{c.overseas ?? "—"}</td>
              <td className="p-2 text-[10px]">{c.brand_url ? <a href={c.brand_url} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">링크</a> : "—"}</td>
              <td className="p-2 max-w-[240px] text-[10px] text-[var(--muted)]">{c.message || "—"}</td>
              <td className="p-2">
                <select value={c.status} onChange={(e) => saveConsultStatus(c.id, e.target.value)}
                  className={`rounded-md border px-1.5 py-1 text-[10px] font-semibold ${c.status === "done" ? "border-emerald-300 text-emerald-700" : c.status === "contacted" ? "border-sky-300 text-sky-700" : "border-slate-300 text-slate-500"}`}>
                  <option value="new">신규</option>
                  <option value="contacted">연락함</option>
                  <option value="done">완료</option>
                </select>
              </td>
              <td className="p-2 text-[var(--muted)]">{dt(c.created_at)}</td>
            </tr>
          ))}
          {!consult.length && <EmptyRow cols={10} text="상담 신청 없음" />}
        </Table>
      )}

      {tab === "funnel" && (
        <div className="space-y-4">
          <p className="text-[12px] text-[var(--muted)]">상담 폼에서 방문자가 <b>어느 필드까지 입력하고 이탈하는지</b> 추적합니다(비식별 · 최근 90일). 완료 건의 상세는 “1:1 상담신청” 탭에 있습니다.</p>

          {!funnel ? (
            <div className="rounded-xl border border-[var(--border)] p-6 text-center text-[12px] text-[var(--muted)]">불러오는 중… (데이터가 없으면 아직 방문/입력 기록이 없는 것입니다)</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { l: "입력 시작 세션", v: funnel.totals.sessions },
                  { l: "제출 완료", v: funnel.totals.completed },
                  { l: "중도 이탈", v: funnel.totals.abandoned },
                  { l: "완료율", v: `${funnel.totals.completionRate}%` },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl border border-[var(--border)] p-3">
                    <div className="text-[10px] text-[var(--muted)]">{s.l}</div>
                    <div className="mt-0.5 text-[18px] font-black">{s.v}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-[var(--border)] p-4">
                <div className="mb-2 text-[13px] font-black">필드별 도달률</div>
                <div className="space-y-1.5">
                  {funnel.funnel.map((f) => (
                    <div key={f.key} className="flex items-center gap-2">
                      <div className="w-28 shrink-0 text-[11px] text-[var(--muted)]">{f.label}</div>
                      <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
                        <div className="flex h-full items-center rounded bg-[var(--accent)] px-1.5 text-[9px] font-bold text-white" style={{ width: `${Math.max(f.pct, 3)}%` }}>{f.pct >= 8 ? `${f.pct}%` : ""}</div>
                      </div>
                      <div className="w-24 shrink-0 text-right text-[11px] font-semibold">{f.reached}명 · {f.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              {funnel.dropoff.length > 0 && (
                <div className="rounded-xl border border-[var(--border)] p-4">
                  <div className="mb-2 text-[13px] font-black">이탈 지점 <span className="text-[11px] font-normal text-[var(--muted)]">· 마지막으로 입력한 필드</span></div>
                  <div className="flex flex-wrap gap-1.5">
                    {funnel.dropoff.map((d) => (
                      <span key={d.field ?? "none"} className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600">{d.label} 에서 {d.count}명 이탈</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 유입 소스별(UTM) — 광고 캠페인별 도달·완료율 */}
              {funnel.sources && funnel.sources.length > 0 && (
                <div className="rounded-xl border border-[var(--border)] p-4">
                  <div className="mb-2 text-[13px] font-black">유입 소스별 <span className="text-[11px] font-normal text-[var(--muted)]">· UTM source·medium·campaign 기준 (광고별 완료율)</span></div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-[11px]">
                      <thead><tr className="border-b border-[var(--border)] text-left text-[10px] uppercase text-[var(--muted)]">{["소스", "매체", "캠페인", "세션", "입력시작", "완료", "완료율"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
                      <tbody>
                        {funnel.sources.map((s, i) => (
                          <tr key={i} className="border-b border-[var(--border)] last:border-0">
                            <td className="p-2 font-semibold">{s.source}</td>
                            <td className="p-2 text-[var(--muted)]">{s.medium || "—"}</td>
                            <td className="p-2 text-[var(--muted)]">{s.campaign || "—"}</td>
                            <td className="p-2">{s.sessions}</td>
                            <td className="p-2">{s.started}</td>
                            <td className="p-2 font-bold text-emerald-600">{s.completed}</td>
                            <td className="p-2"><span className={`rounded px-1.5 py-0.5 font-bold ${s.completionRate >= 20 ? "bg-emerald-50 text-emerald-700" : s.completionRate > 0 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-600"}`}>{s.completionRate}%</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[10px] text-[var(--muted)]">완료율 0%인데 세션이 많은 소스 = 광고 클릭은 오지만 입력 안 함(랜딩·폼 점검 필요).</p>
                </div>
              )}

              <Table head={["세션", "유입(소스/캠페인)", "필드수", "마지막 입력", "카테고리", "동의", "완료", "기기", "시각(KST)"]}>
                {funnel.recent.map((r) => (
                  <tr key={r.sid} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-2 font-mono text-[10px] text-[var(--muted)]">{r.sid}</td>
                    <td className="p-2 text-[10px]"><b>{r.source}</b>{r.campaign ? <span className="text-[var(--muted)]"> · {r.campaign}</span> : ""}</td>
                    <td className="p-2">{r.fieldCount}</td>
                    <td className="p-2">{r.lastField}</td>
                    <td className="p-2 text-[10px]">{r.category}</td>
                    <td className="p-2">{r.agreed ? "✓" : "—"}</td>
                    <td className="p-2">{r.completed ? <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">완료</span> : <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">이탈</span>}</td>
                    <td className="p-2 text-[10px]">{r.mobile ? "📱 모바일" : "💻 PC"}</td>
                    <td className="p-2 text-[var(--muted)]">{dt(r.updatedAt)}</td>
                  </tr>
                ))}
                {!funnel.recent.length && <EmptyRow cols={9} text="입력 기록 없음" />}
              </Table>
            </>
          )}
        </div>
      )}

      {tab === "promo" && (
        <>
          <div className="mb-3 flex flex-wrap items-end gap-2 kt-card p-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold"><Gift size={13} className="text-[var(--accent)]" /> 프로모 코드 생성</span>
            <label className="block"><span className="block text-[10px] font-semibold text-[var(--muted)]">코드(비우면 자동)</span>
              <input value={newPromo.code} onChange={(e) => setNewPromo((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="예: WELCOME1" className="rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]" /></label>
            <label className="block"><span className="block text-[10px] font-semibold text-[var(--muted)]">사용 한도(0=무제한)</span>
              <input type="number" min={0} value={newPromo.max_uses} onChange={(e) => setNewPromo((p) => ({ ...p, max_uses: Number(e.target.value) }))} className="w-28 rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]" /></label>
            <button onClick={createPromo} className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]">코드 생성</button>
            <span className="text-[10px] text-[var(--muted)]">틱톡샵 온보딩 결제 시 입력하는 프로모션 코드입니다.</span>
          </div>
          <Table head={["코드", "사용/한도", "상태", "생성일", "관리"]}>
            {promos.map((p) => (
              <tr key={p.code} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2 font-mono font-bold">{p.code}</td>
                <td className="p-2">{p.used_count} / {p.max_uses === 0 ? "∞" : p.max_uses}</td>
                <td className="p-2"><span className={p.active ? "text-emerald-600" : "text-slate-400"}>{p.active ? "활성" : "비활성"}</span></td>
                <td className="p-2 text-[var(--muted)]">{dt(p.created_at)}</td>
                <td className="p-2">
                  <button onClick={() => togglePromo(p.code, !p.active)} className="mr-2 text-[10px] font-semibold text-[var(--accent)] hover:underline">{p.active ? "비활성화" : "활성화"}</button>
                  <button onClick={() => deletePromo(p.code)} className="text-[10px] font-semibold text-rose-500 hover:underline">삭제</button>
                </td>
              </tr>
            ))}
            {!promos.length && <EmptyRow cols={5} text="프로모 코드 없음" />}
          </Table>
        </>
      )}

      {tab === "onboarding" && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 kt-card p-3 text-[11px]">
            <span className="flex items-center gap-1.5 font-bold"><ShoppingBag size={13} className="text-[var(--accent)]" /> 틱톡샵 온보딩 신청</span>
            <span className="text-[var(--muted)]">총 {onbApps.length}건</span>
            <span className="text-emerald-600">결제완료 {onbApps.filter((a) => a.status === "paid").length}건</span>
            <span className="text-amber-600">진행중 {onbApps.filter((a) => a.status !== "paid").length}건</span>
          </div>
          <Table head={["상태", "트랙", "등급", "브랜드", "담당자", "연락처", "진출국가", "약정", "월청구", "추천인", "신청시각", "자료"]}>
            {onbApps.map((a) => {
              const hasDocs = !!a.payload?.details;
              return (
              <tr key={a.id} className="border-b border-[var(--border)] last:border-0 align-top">
                <td className="p-2">
                  <span className={a.status === "paid" || a.status === "details_submitted" ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700" : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700"}>
                    {a.status === "details_submitted" ? "신청완료" : a.status === "paid" ? "결제완료" : a.phase ?? "접수"}
                  </span>
                </td>
                <td className="p-2">{a.track ? <span className="kt-badge-brand">{TRACK_LABEL[a.track] ?? a.track}</span> : "—"}</td>
                <td className="p-2 font-bold">{a.grade ?? "—"}</td>
                <td className="p-2 font-semibold">{a.brand ?? "—"}</td>
                <td className="p-2">{a.name ?? "—"}</td>
                <td className="p-2 text-[10px]">{a.contact ?? "—"}</td>
                <td className="p-2 text-[10px]">{a.countries ?? "—"}</td>
                <td className="p-2 text-[10px]">{a.term === "6month" ? "6개월" : a.term === "monthly" ? "월" : "—"}</td>
                <td className="p-2 text-[10px] font-semibold">{a.amount ? won(a.amount) : "—"}</td>
                <td className="p-2 text-[10px]">{a.referral_code ? <span className="kt-badge-brand">{a.referral_code}</span> : "—"}</td>
                <td className="p-2 text-[var(--muted)]">{dt(new Date(Number(a.created_ms)).toISOString())}</td>
                <td className="p-2">
                  <button onClick={() => setOnbDetail(a)} className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-light)]">
                    {hasDocs ? "상세보기" : "현황"}
                  </button>
                </td>
              </tr>
            );})}
            {!onbApps.length && <EmptyRow cols={12} text="온보딩 신청 없음" />}
          </Table>
        </>
      )}

      {tab === "referrers" && (
        <>
          <form onSubmit={createReferrer} className="mb-3 flex flex-wrap items-end gap-2 kt-card p-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold"><Gift size={13} className="text-[var(--accent)]" /> 추천인 생성</span>
            <label className="flex flex-col gap-0.5"><span className="text-[9px] text-[var(--muted)]">이름</span>
              <input value={refName} onChange={(e) => setRefName(e.target.value)} placeholder="추천인 이름" className="rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px]" /></label>
            <label className="flex flex-col gap-0.5"><span className="text-[9px] text-[var(--muted)]">아이디</span>
              <input value={refLoginId} onChange={(e) => setRefLoginId(e.target.value)} placeholder="로그인 아이디" className="rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px]" /></label>
            <label className="flex flex-col gap-0.5"><span className="text-[9px] text-[var(--muted)]">비밀번호</span>
              <input value={refPw} onChange={(e) => setRefPw(e.target.value)} placeholder="비밀번호(4자+)" className="rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px]" /></label>
            <button className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px]">생성</button>
            <span className="text-[10px] text-[var(--muted)]">추천 코드는 자동 발급됩니다.</span>
          </form>
          {newRef && (
            <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-[12px]">
              <div className="font-bold text-emerald-700">발급 완료 — 추천인에게 아래 정보를 전달하세요</div>
              <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                <div>이름: <b>{newRef.name}</b></div>
                <div>추천 코드: <b>{newRef.code}</b></div>
                <div>로그인 ID: <b>{newRef.loginId}</b></div>
                <div className="sm:col-span-2">로그인 페이지: <b>glovek.space/partner</b> · 추천 링크: <b>glovek.space/signup?ref={newRef.code}</b></div>
              </div>
              <button onClick={() => setNewRef(null)} className="mt-2 text-[10px] font-semibold text-emerald-700 hover:underline">닫기</button>
            </div>
          )}
          <div className="mb-2 rounded-md bg-slate-50 px-3 py-2 text-[10px] text-[var(--muted)]">수수료 정책: 결제 전환 10명 → 결제금액의 10% · 20명 → 20% · 30명 이상 → 30%</div>
          <Table head={["추천 코드", "로그인 ID", "이름", "가입자", "결제자", "발생 매출", "수수료율", "지급 수수료", "비번", "생성일"]}>
            {referrers.map((r) => (
              <tr key={r.code} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2 font-bold">{r.code}</td>
                <td className="p-2">{r.login_id}</td>
                <td className="p-2">{r.name ?? "—"}</td>
                <td className="p-2">{Number(r.signups)}명</td>
                <td className="p-2 font-semibold">{Number(r.paid_users)}명</td>
                <td className="p-2">{won(Number(r.revenue))}</td>
                <td className="p-2 font-bold text-[var(--accent)]">{Math.round(Number(r.rate) * 100)}%</td>
                <td className="p-2 font-bold text-emerald-600">{won(Number(r.commission))}</td>
                <td className="p-2"><button onClick={() => changeRefPw(r.code)} className="text-[10px] font-semibold text-[var(--accent)] hover:underline">변경</button></td>
                <td className="p-2 text-[var(--muted)]">{dt(new Date(Number(r.created_ms)).toISOString())}</td>
              </tr>
            ))}
            {!referrers.length && <EmptyRow cols={10} text="생성된 추천인 없음" />}
          </Table>
        </>
      )}

      {tab === "collect" && (
        <>
          {/* 수집 일시정지 — 비용 급증 시 즉시 모든 자동 수집(영상·샵 크론) 차단 */}
          <div className={`mb-3 flex flex-wrap items-center gap-3 rounded-xl border p-3 ${collectPaused ? "border-rose-300 bg-rose-50" : "border-[var(--border)]"}`}>
            <span className="flex items-center gap-1.5 text-[12px] font-black">{collectPaused ? "⏸ 수집 정지됨" : "▶ 수집 실행 중"}</span>
            <span className="text-[10px] text-[var(--muted)]">자동 크론(영상·샵)을 즉시 켜고/끕니다 · 재배포 불필요</span>
            {collectPaused
              ? <button onClick={() => togglePause(false)} className="kt-btn kt-btn-outline ml-auto px-3 py-1.5 text-[11px]">▶ 수집 재개</button>
              : <button onClick={() => togglePause(true)} className="ml-auto rounded-lg bg-rose-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-rose-700">⏸ 전체 수집 정지 (비용 차단)</button>}
          </div>
          {/* 지정 브랜드 심층 크롤링 — 큐 대기 없이 즉시, 필터 지정 */}
          <div className="mb-3 kt-card p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold"><Database size={13} className="text-[var(--accent)]" /> 지정 브랜드 심층 크롤링
              <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-[9px] font-bold text-[var(--accent)]">즉시 · 깊게 · 필터</span></div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="block text-[10px] font-semibold text-[var(--muted)]">브랜드명 *</span>
                <input value={deepBrand} onChange={(e) => setDeepBrand(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runDeepCrawl()}
                  placeholder="예: Anua" className="mt-0.5 w-40 rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]" />
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-[var(--muted)]">틱톡 핸들(선택)</span>
                <input value={deepHandle} onChange={(e) => setDeepHandle(e.target.value)}
                  placeholder="@handle" className="mt-0.5 w-32 rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]" />
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-[var(--muted)]">해시태그(선택, 쉼표)</span>
                <input value={deepHashtags} onChange={(e) => setDeepHashtags(e.target.value)}
                  placeholder="anua, anuareview" className="mt-0.5 w-40 rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]" />
              </label>
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="block text-[10px] font-semibold text-[var(--muted)]">수집 범위</span>
                <select value={deepScope} onChange={(e) => setDeepScope(e.target.value as "both" | "video" | "shop")}
                  className="mt-0.5 rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]">
                  <option value="both">영상 + 샵</option>
                  <option value="video">영상(크리에이터 콘텐츠)만</option>
                  <option value="shop">샵(상품)만</option>
                </select>
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-[var(--muted)]">기간(년)</span>
                <input type="number" min={0.5} step={0.5} value={deepYears} onChange={(e) => setDeepYears(Number(e.target.value))}
                  className="mt-0.5 w-20 rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]" />
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-[var(--muted)]">깊이(영상수)</span>
                <input type="number" min={100} step={100} value={deepLimit} onChange={(e) => setDeepLimit(Number(e.target.value))}
                  className="mt-0.5 w-24 rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]" />
              </label>
              <div className="block">
                <span className="block text-[10px] font-semibold text-[var(--muted)]">국가(비우면 기본 설정)</span>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {GRANT_MARKETS.concat([{ id: "US", nameKo: "미국", flag: "🇺🇸" } as never]).map((co) => {
                    const on = deepCountries.includes(co.id);
                    return (
                      <button key={co.id} type="button" onClick={() => setDeepCountries((cur) => on ? cur.filter((x) => x !== co.id) : [...cur, co.id])}
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] text-[var(--muted)]"}`}>
                        {co.flag}{co.id}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button onClick={runDeepCrawl} disabled={deepBusy} className="kt-btn kt-btn-primary ml-auto px-4 py-2 text-[11px] disabled:opacity-50">
                {deepBusy ? "시작 중…" : "심층 수집 시작"}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-[var(--muted)]">※ 지정 브랜드만 큐 대기 없이 즉시 킥. <b>영상(크리에이터 콘텐츠)만</b> 선택 시 샵은 건너뜁니다. 국가 미선택 시 아래 수집지역/SHOP_COUNTRIES 설정을 따릅니다. 결과는 몇 분 내 자동 회수·적재. Apify 사용량 유의.</p>
          </div>

          {/* 수집 강도(얕고 넓게) — DB 저장, 즉시 적용 */}
          {tuning && (
            <div className="mb-3 kt-card p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold"><SlidersHorizontal size={13} className="text-[var(--accent)]" /> 수집 강도</span>
                <button onClick={() => setTuning({ initialLimit: 150, refreshLimit: 60, maxPending: 8, maxRefresh: 25, maxPoll: 6 })} className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-semibold text-[var(--accent)]">얕고 넓게 프리셋</button>
                <button onClick={() => setTuning({ initialLimit: 1000, refreshLimit: 300, maxPending: 6, maxRefresh: 12, maxPoll: 10 })} className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-semibold text-[var(--accent)]">디테일(깊게) 프리셋</button>
                <button onClick={() => setTuning({ initialLimit: 500, refreshLimit: 100, maxPending: 4, maxRefresh: 6, maxPoll: 2 })} className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">기본값</button>
                <button onClick={saveTuning} className="kt-btn kt-btn-primary ml-auto px-3 py-1.5 text-[11px]">저장 (즉시 적용)</button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {([
                  ["initialLimit", "신규 깊이", "브랜드당 1차 수집 영상수"],
                  ["refreshLimit", "갱신 깊이", "브랜드당 증분 영상수"],
                  ["maxPending", "신규 시작/회", "한 번에 신규 브랜드"],
                  ["maxRefresh", "갱신 시작/회(≤30)", "한 번에 갱신 브랜드"],
                  ["maxPoll", "적재/회(≤12)", "한 번에 회수할 run"],
                ] as const).map(([key, label, hint]) => (
                  <label key={key} className="block">
                    <span className="block text-[10px] font-semibold text-[var(--muted)]">{label}</span>
                    <input type="number" min={1} value={tuning[key]}
                      onChange={(e) => setTuning((t) => t ? { ...t, [key]: Number(e.target.value) } : t)}
                      className="mt-0.5 w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]" />
                    <span className="mt-0.5 block text-[9px] text-[var(--muted)]">{hint}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-[var(--muted)]">※ 403개 전체를 빠르게 채우려면 ‘얕고 넓게’로 시작 → Apify 사용량 보며 조정. 적재/회는 함수 60초 제한 때문에 12 이하 권장.</p>
            </div>
          )}
          {/* 샵(제품) 수집 설정 — env 대신 여기서 즉시 조정(재배포 불필요). 국가 순차·개수·처리량. */}
          {shopTuning && (
            <div className="mb-3 kt-card p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold"><ShoppingBag size={13} className="text-[var(--accent)]" /> 샵(제품) 수집 설정</span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">env 불필요 · 즉시 적용</span>
                <button onClick={saveShopTuning} className="kt-btn kt-btn-primary ml-auto px-3 py-1.5 text-[11px]">저장 (즉시 적용)</button>
              </div>
              {/* 국가 순차: 원하는 나라만 켜기(US만 → US·TH → US·TH·VN). 즉시 저장. */}
              <div className="mb-2">
                <span className="mb-1 block text-[10px] font-semibold text-[var(--muted)]">수집 국가 <span className="font-normal">· 미국만 켜면 미국부터, 태국 추가하면 태국까지 (순차 권장)</span></span>
                <div className="flex flex-wrap gap-1.5">
                  {shopAllowed.map((cc) => {
                    const on = shopCountries.includes(cc);
                    const isUS = cc === "US";
                    return (
                      <button key={cc} type="button" disabled={isUS && on}
                        onClick={() => saveShopCountries(on ? shopCountries.filter((x) => x !== cc) : [...shopCountries, cc])}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"} ${isUS && on ? "cursor-default opacity-90" : ""}`}>
                        {cc}{isUS ? " · 기본" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {([
                  ["maxItems", "브랜드당 개수", "예: 200"],
                  ["maxBrands", "브랜드 시작/회", "사이클당 킥 (예: 40)"],
                  ["maxRunning", "동시 처리 상한", "Apify 동시성 이하 (예: 60)"],
                  ["maxPoll", "적재/회(≤25)", "한 번에 회수할 run"],
                  ["retryDays", "재수집 대기(일)", "완료 후 재크롤 간격"],
                ] as const).map(([key, label, hint]) => (
                  <label key={key} className="block">
                    <span className="block text-[10px] font-semibold text-[var(--muted)]">{label}</span>
                    <input type="number" min={1} value={shopTuning[key]}
                      onChange={(e) => setShopTuning((t) => t ? { ...t, [key]: Number(e.target.value) } : t)}
                      className="mt-0.5 w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]" />
                    <span className="mt-0.5 block text-[9px] text-[var(--muted)]">{hint}</span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-amber-600">⚠️ 국가·개수를 늘리면 Apify 비용↑(브랜드당 개수 × 브랜드수 × 국가수). 미국·200개부터 시작 권장. 국가는 하나씩 추가하면 그 나라부터 순차 수집됩니다.</p>
            </div>
          )}
          {/* 샵 정밀 테스트 — 브랜드 1개 즉시(동기) 크롤 → actor 원본 + 매핑(이미지/커미션/판매) 확인 */}
          <div className="mb-3 kt-card p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold">🔬 샵 정밀 테스트 <span className="font-normal text-[var(--muted)]">· 1개 브랜드 즉시 크롤 → 이미지·커미션·판매 확인</span></span>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="block text-[10px] font-semibold text-[var(--muted)]">브랜드명</span>
                <input value={shopTestBrand} onChange={(e) => setShopTestBrand(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runShopTest(false)}
                  placeholder="예: Laka" className="mt-0.5 w-40 rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]" />
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold text-[var(--muted)]">국가</span>
                <select value={shopTestCountry} onChange={(e) => setShopTestCountry(e.target.value)} className="mt-0.5 rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]">
                  {shopAllowed.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
                </select>
              </label>
              <button onClick={() => runShopTest(false)} disabled={shopTestBusy} className="kt-btn kt-btn-outline px-3 py-2 text-[11px] disabled:opacity-50">{shopTestBusy ? "크롤 중…" : "🔍 테스트 조회(적재 안 함)"}</button>
              <button onClick={() => runShopTest(true)} disabled={shopTestBusy} className="kt-btn kt-btn-primary px-3 py-2 text-[11px] disabled:opacity-50">💾 테스트 + DB 적재</button>
            </div>
            {shopTestResult && (
              <div className="mt-2 rounded-lg border border-[var(--border)] bg-slate-50 p-2.5 text-[11px]">
                {shopTestResult.ok ? (
                  <>
                    <div className="flex flex-wrap gap-3 font-bold">
                      <span>결과 {String((shopTestResult as { count?: number }).count ?? 0)}건</span>
                      <span className={`${(shopTestResult as { diagnostics?: { imageOk?: string } }).diagnostics?.imageOk?.startsWith("0/") ? "text-rose-600" : "text-emerald-600"}`}>이미지 {(shopTestResult as { diagnostics?: { imageOk?: string } }).diagnostics?.imageOk}</span>
                      <span>판매 {(shopTestResult as { diagnostics?: { soldOk?: string } }).diagnostics?.soldOk}</span>
                      <span>커미션 {(shopTestResult as { diagnostics?: { commissionOk?: string } }).diagnostics?.commissionOk}</span>
                      {typeof (shopTestResult as { ingested?: number }).ingested === "number" && (shopTestResult as { ingested?: number }).ingested! > 0 && <span className="text-[var(--accent)]">DB 적재 {(shopTestResult as { ingested?: number }).ingested}건</span>}
                    </div>
                    <div className="mt-1 text-[var(--accent)]">→ {(shopTestResult as { diagnostics?: { verdict?: string } }).diagnostics?.verdict}</div>
                    <div className="mt-1.5 text-[10px] text-[var(--muted)]">actor: {String((shopTestResult as { actor?: string }).actor ?? "")}</div>
                    <details className="mt-1.5"><summary className="cursor-pointer text-[10px] font-semibold text-[var(--muted)]">매핑 결과 5건 (id·title·price·sold·commission·image)</summary>
                      <pre className="mt-1 max-h-48 overflow-auto rounded bg-white p-2 text-[10px] leading-tight">{JSON.stringify((shopTestResult as { mappedSample?: unknown }).mappedSample, null, 1)}</pre>
                    </details>
                    <details className="mt-1"><summary className="cursor-pointer text-[10px] font-semibold text-[var(--muted)]">actor 원본 필드명 + 1건 원본</summary>
                      <div className="mt-1 text-[10px]">필드: {((shopTestResult as { rawKeys?: string[] }).rawKeys ?? []).join(", ")}</div>
                      <pre className="mt-1 max-h-48 overflow-auto rounded bg-white p-2 text-[10px] leading-tight">{JSON.stringify((shopTestResult as { rawFirst?: unknown }).rawFirst, null, 1)}</pre>
                    </details>
                  </>
                ) : (
                  <span className="text-rose-600">❌ {String((shopTestResult as { error?: string }).error ?? "실패")}</span>
                )}
              </div>
            )}
          </div>
          {/* 크리에이터 이메일 크롤(배치) — 기존 크리에이터 프로필 재수집으로 bio·이메일 채움 */}
          <div className="mb-3 kt-card p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold"><UserSquare2 size={13} className="text-[var(--accent)]" /> 크리에이터 이메일 크롤 <span className="font-normal text-[var(--muted)]">· 프로필 재수집 → bio·이메일 추출</span></span>
              {enrich && !enrich.configured && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">SCRAPER 미설정</span>}
              <button onClick={runEnrich} disabled={enrichBusy || (enrich?.remaining ?? 0) === 0} className="kt-btn kt-btn-primary ml-auto px-3 py-1.5 text-[11px] disabled:opacity-50">
                {enrichBusy ? "크롤 중…" : `배치 크롤 (20건)`}
              </button>
            </div>
            {enrich && (
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span>총 {enrich.total.toLocaleString()}</span>
                <span>보강완료 <b>{enrich.enriched.toLocaleString()}</b></span>
                <span className="text-emerald-600">이메일 <b>{enrich.withEmail.toLocaleString()}</b></span>
                <span className="text-[var(--muted)]">남은 {enrich.remaining.toLocaleString()}</span>
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${enrich.total ? Math.round((enrich.enriched / enrich.total) * 100) : 0}%` }} /></div>
              </div>
            )}
            {enrichMsg && <p className="mt-1.5 text-[11px] font-semibold text-emerald-700">{enrichMsg}</p>}
            <p className="mt-1.5 text-[10px] text-[var(--muted)]">한 번에 다 하지 않고 <b>20건씩 배치</b>로 프로필을 재크롤 → bio에서 공개 이메일 추출·저장. 조회수 높은 순. ⚠️ Apify 사용(비용·한도 적용).</p>
          </div>

          {/* 수집·적재 결과 로그 — 제품/이미지 적재 현황(국가별) + 최근 실행 이력 */}
          <div className="mb-3 kt-card p-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold"><Database size={13} className="text-[var(--accent)]" /> 수집·적재 결과 로그</span>
              <button onClick={loadCollectLog} className="rounded-md border border-[var(--border)] px-2 py-1 text-[10px] font-semibold text-[var(--accent)]">↻ 새로고침</button>
              {collectLog && (
                <span className="ml-auto text-[11px] font-bold">
                  총 제품 {collectLog.summary.totalProducts.toLocaleString()} · <span className={collectLog.summary.imagePct === 0 ? "text-rose-600" : "text-emerald-600"}>이미지 {collectLog.summary.totalImage.toLocaleString()}건 ({collectLog.summary.imagePct}%)</span>
                </span>
              )}
            </div>
            {!collectLog ? (
              <p className="py-2 text-[11px] text-[var(--muted)]">불러오는 중… (없으면 ↻ 새로고침)</p>
            ) : (
              <div className="space-y-2">
                {/* 국가별 적재 현황 */}
                <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 text-[10px] text-[var(--muted)]"><tr><th className="p-2">국가</th><th className="p-2 text-right">제품</th><th className="p-2 text-right">이미지</th><th className="p-2 text-right">커미션</th><th className="p-2 text-right">최근 적재</th></tr></thead>
                    <tbody>
                      {collectLog.byCountry.map((c) => (
                        <tr key={c.country} className="border-t border-slate-100">
                          <td className="p-2 font-bold">{c.country}</td>
                          <td className="p-2 text-right">{Number(c.products).toLocaleString()}</td>
                          <td className={`p-2 text-right font-semibold ${Number(c.with_image) === 0 ? "text-rose-500" : "text-emerald-600"}`}>{Number(c.with_image).toLocaleString()}</td>
                          <td className="p-2 text-right">{Number(c.with_commission).toLocaleString()}</td>
                          <td className="p-2 text-right text-[var(--muted)]">{c.last_collected ? dt(c.last_collected) : "—"}</td>
                        </tr>
                      ))}
                      {collectLog.byCountry.length === 0 && <tr><td colSpan={5} className="p-3 text-center text-[var(--muted)]">적재된 제품이 없습니다.</td></tr>}
                    </tbody>
                  </table>
                </div>
                {/* 샵 잡 상태 */}
                <div className="flex flex-wrap gap-2 text-[10px]">
                  <span className="font-semibold text-[var(--muted)]">샵 잡:</span>
                  {Object.entries(collectLog.shopJobs).length === 0 ? <span className="text-[var(--muted)]">없음</span> :
                    Object.entries(collectLog.shopJobs).map(([s, n]) => (
                      <span key={s} className={`rounded-full px-2 py-0.5 font-semibold ${s === "done" ? "bg-emerald-100 text-emerald-700" : s === "failed" ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"}`}>{s} {n}</span>
                    ))}
                </div>
                {/* 최근 실행 이력 */}
                <details open>
                  <summary className="cursor-pointer text-[10px] font-semibold text-[var(--muted)]">최근 실행 이력 ({collectLog.runs.length})</summary>
                  <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-[var(--border)]">
                    <table className="w-full text-left text-[10px]">
                      <thead className="sticky top-0 bg-slate-50 text-[9px] text-[var(--muted)]"><tr><th className="p-1.5">시각</th><th className="p-1.5">종류</th><th className="p-1.5">대상</th><th className="p-1.5">상태</th><th className="p-1.5 text-right">건수</th><th className="p-1.5">에러</th></tr></thead>
                      <tbody>
                        {collectLog.runs.map((r) => (
                          <tr key={r.id} className="border-t border-slate-100">
                            <td className="p-1.5 whitespace-nowrap text-[var(--muted)]">{dt(r.created_at)}</td>
                            <td className="p-1.5 whitespace-nowrap font-semibold">{r.kind}</td>
                            <td className="p-1.5 max-w-[140px] truncate">{r.target ?? "—"}</td>
                            <td className={`p-1.5 whitespace-nowrap font-semibold ${r.status === "ok" || r.status === "started" || r.status === "done" ? "text-emerald-600" : r.status === "error" ? "text-rose-500" : "text-amber-600"}`}>{r.status}</td>
                            <td className="p-1.5 text-right">{r.collected || ""}</td>
                            <td className="p-1.5 max-w-[200px] truncate text-rose-500" title={r.error ?? ""}>{r.error ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            )}
          </div>
          {/* 수집 지역 — 동남아 4개국 크롤링 켜기(지역 프록시 타게팅). US는 항상 포함. */}
          {regions && (
            <div className="mb-3 kt-card p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-bold">🌏 수집 지역 (크롤링 대상 시장)</span>
                <span className="text-[10px] text-[var(--muted)]">선택한 지역마다 프록시로 타게팅해 브랜드를 크롤 → 국가별 태깅</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {regionOpts.map((co) => {
                  const on = regions.includes(co.id);
                  const isUS = co.id === "US";
                  return (
                    <button
                      key={co.id}
                      disabled={isUS}
                      onClick={() => {
                        if (isUS) return; // US는 항상 포함
                        saveRegions(on ? regions.filter((r) => r !== co.id) : [...regions, co.id]);
                      }}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        on ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
                      } ${isUS ? "cursor-default opacity-90" : ""}`}
                    >
                      {co.flag} {co.nameKo}{isUS ? " · 기본" : ""}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-amber-600">⚠️ 지역을 추가하면 브랜드당 <b>지역 수만큼</b> Apify run이 실행됩니다(비용↑). 동남아부터 소규모로 켜고 사용량을 보며 확장하세요.</p>
            </div>
          )}
          <div className="mb-3 flex flex-wrap items-center gap-2 kt-card p-3">
            <span className="flex items-center gap-1.5 text-[11px] font-bold"><Database size={13} className="text-[var(--accent)]" /> 신규 브랜드 발굴 요청</span>
            <form onSubmit={addBrand} className="flex items-center gap-2">
              <input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="브랜드명" className="rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px]" />
              <button className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]">요청 추가</button>
            </form>
            <button onClick={() => seedMarket("TH", "🇹🇭", "태국")} disabled={collecting} className="kt-btn kt-btn-outline ml-auto px-3 py-1.5 text-[11px] disabled:opacity-50">
              🇹🇭 태국 반영
            </button>
            <button onClick={() => seedMarket("VN", "🇻🇳", "베트남")} disabled={collecting} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px] disabled:opacity-50">
              🇻🇳 베트남 반영
            </button>
            <button onClick={runShopCollect} disabled={collecting} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px] disabled:opacity-50">
              🛍 틱톡샵 상품 수집
            </button>
            <button onClick={() => runCollect(true)} disabled={collecting} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px] disabled:opacity-50">
              실패 재시도
            </button>
            <button onClick={() => runCollect(false)} disabled={collecting} className="kt-btn kt-btn-primary px-3 py-1.5 text-[11px] disabled:opacity-60">
              {collecting ? <><Loader2 size={13} className="animate-spin" /> 수집 중… (최대 1분)</> : <><Play size={13} /> 지금 수집 실행</>}
            </button>
            <span className="text-[10px] text-[var(--muted)]">수집 영상 {collectedCount.toLocaleString()}건 · 인플루언서 {creatorsCount.toLocaleString()}명</span>
            {/* 자동 실행 토글 — 이 페이지가 열려 있는 동안 주기적으로 자동 수집 */}
            <div className="flex w-full items-center gap-2 border-t border-[var(--border)] pt-2 text-[11px]">
              <button
                onClick={() => { const v = !autoRun; setAutoRun(v); try { localStorage.setItem("admin.autoRun", v ? "1" : "0"); } catch {} }}
                className={`rounded-md px-3 py-1.5 font-bold ${autoRun ? "bg-emerald-500 text-white" : "border border-[var(--border)] text-[var(--muted)]"}`}
              >
                {autoRun ? "■ 자동 실행 중지" : "▶ 자동 실행 켜기"}
              </button>
              <select
                value={autoMin}
                onChange={(e) => { const m = Number(e.target.value); setAutoMin(m); try { localStorage.setItem("admin.autoMin", String(m)); } catch {} }}
                className="rounded-md border border-[var(--border)] px-2 py-1.5 text-[11px]"
              >
                {[5, 10, 15, 30].map((m) => <option key={m} value={m}>{m}분마다</option>)}
              </select>
              <span className="text-[10px] text-[var(--muted)]">
                {autoRun ? `이 페이지가 열려 있는 동안 ${autoMin}분마다 자동 수집합니다 (탭을 닫으면 멈춤).` : "켜두면 창을 열어둔 채로 자동 수집됩니다 (외부 스케줄러 불필요)."}
              </span>
            </div>
          </div>

          {/* 마지막 실행 결과 (상시 표기) */}
          {lastCollect && (
            <div className={`mb-3 rounded-md border p-3 text-[12px] ${lastCollect.ok && lastCollect.mode !== "skipped" ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
              <div className="font-bold">
                마지막 실행 결과 <span className="font-normal text-[var(--muted)]">· {lastCollect.at}</span>
              </div>
              {!lastCollect.ok ? (
                <div className="mt-1 text-rose-600">실행 실패</div>
              ) : lastCollect.scraper === false ? (
                <div className="mt-1 text-amber-700">SCRAPER_API_KEY 미설정 → 수집 시작 안 됨</div>
              ) : lastCollect.mode === "skipped" ? (
                <div className="mt-1 text-amber-700">보류: {lastCollect.reason ?? "설정 확인 필요"}</div>
              ) : (
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
                  <span>✅ 적재 <b>{(lastCollect.ingested ?? 0).toLocaleString()}건</b></span>
                  <span>완료 run <b>{lastCollect.polledDone ?? 0}</b></span>
                  <span>신규 시작 <b>{lastCollect.kickedNew ?? 0}</b></span>
                  <span>갱신 시작 <b>{lastCollect.kickedRefresh ?? 0}</b></span>
                </div>
              )}
              <div className="mt-1.5 text-[10px] text-[var(--muted)]">
                ※ run을 시작하면 Apify가 수 분간 수집합니다. <b>몇 분 뒤 다시 “지금 수집 실행”</b>을 누르면 끝난 run의 결과(적재 건수)가 올라갑니다.
              </div>
            </div>
          )}

          {/* 디버그 로그: 클릭 시 서버 원본 응답을 쌓아둠 (캡처용) */}
          {debugLog.length > 0 && (
            <div className="mb-3 rounded-md border border-[var(--border)] bg-slate-900 p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-200">실행 응답 로그 (캡처용)</span>
                <button onClick={() => setDebugLog([])} className="text-[10px] text-slate-400 hover:text-white">지우기</button>
              </div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all text-[10px] leading-relaxed text-emerald-300">{debugLog.join("\n")}</pre>
            </div>
          )}
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
          <p className="mt-3 text-[10px] text-[var(--muted)]">※ 비동기 수집(B안): cron이 Apify run을 시작하고, 완료 시 webhook(/api/ingest/apify)으로 결과가 적재됩니다. SCRAPER_API_KEY·INGEST_SECRET 설정 필요.</p>

          {/* 브랜드별 수집 헬스보드 */}
          <h2 className="mb-2 mt-6 text-[13px] font-bold">브랜드별 수집 현황 (상위 {brandHealth.length})</h2>
          <Table head={["브랜드", "수집 영상", "인플루언서", "누적 조회", "마지막 수집", "추적/주기"]}>
            {brandHealth.map((b) => (
              <tr key={b.brand_name} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2 font-semibold">{b.brand_name}</td>
                <td className="p-2 text-right">{b.videos.toLocaleString()}</td>
                <td className="p-2 text-right">{b.influencers}</td>
                <td className="p-2 text-right">{Number(b.total_views).toLocaleString()}</td>
                <td className="p-2 text-[var(--muted)]">{dt(b.last_collected_at)}</td>
                <td className="p-2 text-[10px]">{b.tracked ? `추적 · ${b.interval_hours ?? "—"}h` : "미추적"}</td>
              </tr>
            ))}
            {!brandHealth.length && <EmptyRow cols={6} text="수집된 브랜드 없음" />}
          </Table>

          {/* A안: 틱톡샵 상품 집계 (실 커미션율·추정 GMV) */}
          <h2 className="mb-2 mt-6 text-[13px] font-bold">틱톡샵 상품 집계 ({shopStats.length}) <span className="text-[10px] font-normal text-[var(--muted)]">실 커미션율 · 가격×판매수 GMV</span></h2>
          <Table head={["브랜드", "상품 수", "평균 커미션", "누적 판매수", "추정 GMV", "갱신"]}>
            {shopStats.map((s) => (
              <tr key={s.brand_name} className="border-b border-[var(--border)] last:border-0">
                <td className="p-2 font-semibold">{s.brand_name}</td>
                <td className="p-2 text-right">{s.products}</td>
                <td className="p-2 text-right text-[var(--accent)]">{s.avg_commission != null ? `${Number(s.avg_commission)}%` : "—"}</td>
                <td className="p-2 text-right">{Number(s.total_sold).toLocaleString()}</td>
                <td className="p-2 text-right font-semibold">${Math.round(Number(s.est_gmv)).toLocaleString()}</td>
                <td className="p-2 text-[var(--muted)]">{dt(s.updated_at)}</td>
              </tr>
            ))}
            {!shopStats.length && <EmptyRow cols={6} text="틱톡샵 상품 미수집 (SHOP_ACTOR 설정 후 '틱톡샵 상품 수집')" />}
          </Table>

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

      {onbDetail && <OnbDetailModal a={onbDetail} onClose={() => setOnbDetail(null)} />}
      {memberDetail && <MemberDetailModal d={memberDetail} onClose={() => setMemberDetail(null)} onSaved={() => { setToast("회원 정보 저장됨"); loadData(); }} />}
    </PageShell>
  );
}

// 회원 상세 모달 — 프로필 편집(이름/브랜드/직무/플랜/관리자 메모) + 구독·결제·온보딩·문의 전체 이력.
function MemberDetailModal({ d, onClose, onSaved }: { d: MemberDetail; onClose: () => void; onSaved: () => void }) {
  const u = d.user;
  const [f, setF] = useState({ name: u.name ?? "", brand: u.brand ?? "", role: u.role ?? "", plan: u.plan, adminNote: u.admin_note ?? "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const r = await fetch("/api/admin/member", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, ...f }) });
    setSaving(false);
    if (r.ok) { onSaved(); onClose(); }
  };
  const proUntil = Number(u.pro_until) || 0;
  const onbP = d.onboarding?.payload?.details;
  const products = onbP?.products ?? [];
  const inp = "w-full rounded-md border border-[var(--border)] px-2 py-1.5 text-[12px]";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4" onClick={onClose}>
      <div className="my-6 w-full max-w-3xl rounded-xl bg-white p-5 text-[var(--fg)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[15px] font-black">
            회원 상세 <span className="text-[12px] font-semibold text-[var(--muted)]">{u.email}</span>
            <span className="kt-badge-brand">{u.plan}</span>
            {proUntil > Date.now() && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">Pro ~{dt(proUntil)}</span>}
          </h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)]"><X size={18} /></button>
        </div>

        <div className="space-y-4 text-[12px]">
          {/* 프로필 편집 */}
          <Section title="프로필 (수정 가능)">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block"><span className="mb-0.5 block text-[10px] text-[var(--muted)]">이름</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} /></label>
              <label className="block"><span className="mb-0.5 block text-[10px] text-[var(--muted)]">브랜드</span><input value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} className={inp} /></label>
              <label className="block"><span className="mb-0.5 block text-[10px] text-[var(--muted)]">직무</span><input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className={inp} /></label>
              <label className="block"><span className="mb-0.5 block text-[10px] text-[var(--muted)]">플랜</span>
                <select value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value })} className={inp}>
                  {["basic", "pro", "enterprise"].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-1 block"><span className="mb-0.5 block text-[10px] text-[var(--muted)]">관리자 메모 (사용자 미노출)</span>
              <textarea value={f.adminNote} onChange={(e) => setF({ ...f, adminNote: e.target.value })} rows={2} className={`${inp} resize-none`} placeholder="영업/CS 메모" />
            </label>
            <div className="mt-1 grid gap-1 text-[10px] text-[var(--muted)] sm:grid-cols-3">
              <span>가입일: {dt(u.created_at)}</span>
              <span>추천인: {u.referred_by ?? "—"}</span>
              <span>시장열람: {u.markets || "US(기본)"}</span>
            </div>
            <button onClick={save} disabled={saving} className="kt-btn kt-btn-primary mt-2 px-4 py-1.5 text-[11px] disabled:opacity-50">{saving ? "저장 중…" : "프로필 저장"}</button>
          </Section>

          {/* 연락처·사업자 정보 — 온보딩 제출값 우선, 없으면 상담 신청값 폴백 */}
          {(() => {
            const phone = onbP?.contact || d.onboarding?.contact || d.consults[0]?.contact || "";
            const manager = onbP?.managerName || d.onboarding?.name || d.consults[0]?.manager_name || "";
            const settle = onbP?.settlement;
            return (
              <Section title="연락처·사업자 정보">
                <KV k="연락처" v={phone ? phone : "—"} />
                <KV k="담당자" v={manager || "—"} />
                <KV k="대표자" v={onbP?.repName || "—"} />
                <KV k="이메일(제출)" v={onbP?.email || d.onboarding?.email || u.email} />
                <KV k="브랜드(국/영)" v={`${onbP?.brandKo || d.onboarding?.brand || u.brand || "—"}${onbP?.brandEn ? ` / ${onbP.brandEn}` : ""}`} />
                <KV k="사업자등록번호" v={onbP?.bizNo || "—"} />
                <KV k="정산 계좌" v={settle?.acct ? `${settle.bank ?? ""} ${settle.acct} (${settle.holder ?? "—"})` : "—"} />
                {!onbP && !d.onboarding && d.consults.length === 0 && (
                  <p className="text-[10px] text-[var(--muted)]">※ 온보딩·상담 제출 이력이 없어 연락처 정보가 없습니다.</p>
                )}
              </Section>
            );
          })()}

          {/* 구독 */}
          <Section title="구독">
            {d.subscription ? (
              <KV k={`Pro (${d.subscription.status})`} v={`${won(d.subscription.amount)} · 다음결제 ${dt(Number(d.subscription.next_charge_at))} · 실패 ${d.subscription.failures}회`} />
            ) : <KV k="Pro" v="구독 없음" />}
            {d.mallSubscription ? (
              <KV k={`몰 입점 ${d.mallSubscription.track} (${d.mallSubscription.status})`} v={`${won(d.mallSubscription.amount)} · 다음결제 ${dt(Number(d.mallSubscription.next_charge_at))} · 실패 ${d.mallSubscription.failures}회`} />
            ) : <KV k="몰 입점" v="구독 없음" />}
          </Section>

          {/* 결제 내역 */}
          <Section title={`결제 내역 (${d.orders.length})`}>
            {d.orders.length === 0 ? <p className="text-[var(--muted)]">—</p> : (
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {d.orders.map((o) => (
                  <div key={o.order_id} className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="text-[var(--muted)]">{dt(o.created_at)}</span>
                    <span>{o.goods_name ?? o.plan}</span>
                    <span className="font-semibold">{won(o.charge_amount ?? o.amount)}</span>
                    <span className={o.status === "paid" ? "text-emerald-600" : o.status === "failed" ? "text-rose-600" : "text-slate-400"}>{o.status}</span>
                    <span className="rounded bg-slate-100 px-1 text-[9px]">{o.kind}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 온보딩 */}
          <Section title="틱톡샵 온보딩">
            {d.onboarding ? (
              <>
                <KV k="상태" v={`${d.onboarding.status} · ${d.onboarding.phase ?? "—"}`} />
                <KV k="트랙/등급" v={`${d.onboarding.track ?? "—"} / ${d.onboarding.grade ?? "—"}`} />
                <KV k="국가/약정/금액" v={`${d.onboarding.countries || "—"} / ${d.onboarding.term ?? "—"} / ${d.onboarding.amount ? won(d.onboarding.amount) : "—"}`} />
                <KV k="제출 제품" v={`${products.length}개`} />
                {d.files.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[var(--muted)]">파일({d.files.length}):</span>
                    {d.files.map((fl) => (
                      <a key={fl.id} href={`/api/onboarding/file/${fl.id}`} target="_blank" rel="noreferrer" className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent)] hover:underline">
                        {fl.kind === "biz_reg" ? "사업자등록증" : fl.kind === "product_cert" ? `인증서${fl.product_index != null ? `#${fl.product_index + 1}` : ""}` : `사진${fl.product_index != null ? `#${fl.product_index + 1}` : ""}`} ↓
                      </a>
                    ))}
                  </div>
                )}
              </>
            ) : <p className="text-[var(--muted)]">온보딩 신청 없음</p>}
          </Section>

          {/* 문의·상담 이력 */}
          <Section title={`문의·상담 이력 (문의 ${d.inquiries.length} · 상담 ${d.consults.length})`}>
            {d.inquiries.length === 0 && d.consults.length === 0 ? <p className="text-[var(--muted)]">—</p> : (
              <div className="max-h-40 space-y-1 overflow-y-auto text-[11px]">
                {d.consults.map((c) => (
                  <div key={`c${c.id}`} className="flex flex-wrap gap-2">
                    <span className="text-[var(--muted)]">{dt(c.created_at)}</span>
                    <span className="rounded bg-[var(--accent-light)] px-1 text-[9px] font-bold text-[var(--accent)]">상담</span>
                    <span>{c.company}{c.category ? ` · ${c.category}` : ""}</span>
                    <span className="text-[var(--muted)]">{(c.message ?? "").slice(0, 60)}</span>
                  </div>
                ))}
                {d.inquiries.map((q) => (
                  <div key={`i${q.id}`} className="flex flex-wrap gap-2">
                    <span className="text-[var(--muted)]">{dt(q.created_at)}</span>
                    <span className="rounded bg-slate-100 px-1 text-[9px] font-bold">{q.kind}</span>
                    <span className="text-[var(--muted)]">{String((q.payload as Record<string, unknown>)?.message ?? "").slice(0, 60)}</span>
                    {q.response && <span className="text-emerald-600">답변됨</span>}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function OnbDetailModal({ a, onClose }: { a: OnbApp; onClose: () => void }) {
  const p = a.payload ?? {};
  const det = p.details;
  const cs = (a.countries ?? "").split(",").filter(Boolean);
  const won2 = (n: string | number | undefined) => (n ? "₩" + Number(n).toLocaleString() : "—");
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4" onClick={onClose}>
      <div className="my-6 w-full max-w-2xl rounded-xl bg-white p-5 text-[var(--fg)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[15px] font-black">
            틱톡샵 입점 신청 상세
            <span className="kt-badge-brand">{TRACK_LABEL[a.track ?? ""] ?? a.track ?? "—"}</span>
            {a.grade && <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white">예비 {a.grade}등급</span>}
          </h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)]"><X size={18} /></button>
        </div>

        <div className="space-y-4 text-[12px]">
          {/* 결제·신청 요약 */}
          <Section title="신청·결제">
            <KV k="상태" v={a.status === "details_submitted" ? "신청완료" : a.status === "paid" ? "결제완료(정보입력 대기)" : a.status} />
            <KV k="진출 국가" v={cs.map((c) => ONB_COUNTRY_MAP[c]?.nameKo ?? c).join(", ") || "—"} />
            <KV k="약정" v={a.term === "6month" ? "6개월 약정" : a.term === "monthly" ? "월 구독" : "—"} />
            <KV k="결제액" v={a.amount ? won(a.amount) : "—"} />
            <KV k="추천인 코드" v={a.referral_code ?? "—"} />
            <KV k="주문번호" v={a.order_id ?? "—"} />
          </Section>

          {/* 자가체크 */}
          <Section title={`자가체크 (Y ${p.yes ?? 0}/5)`}>
            {SELF_CHECK_QUESTIONS.map((q) => (
              <div key={q.id} className="flex items-start gap-2">
                <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${p.checks?.[q.id] ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{p.checks?.[q.id] ? "Y" : "N"}</span>
                <span className="text-[11px] leading-snug text-[var(--muted)]">{q.label}</span>
              </div>
            ))}
          </Section>

          {/* 인증 현황 */}
          <Section title="국가별 인증 현황">
            {cs.flatMap((c) => (ONB_COUNTRY_MAP[c]?.certs ?? []).map((cert) => (
              <KV key={cert.id} k={`${ONB_COUNTRY_MAP[c].flag} ${ONB_COUNTRY_MAP[c].nameKo} · ${cert.label}`} v={p.certs?.[cert.id] ?? "—"} />
            )))}
            <KV k={`🌐 ${COMMON_CERT.label}`} v={p.certs?.[COMMON_CERT.id] ?? "—"} />
            {!cs.length && <p className="text-[var(--muted)]">—</p>}
          </Section>

          {det ? (
            <>
              {/* 브랜드 정보 */}
              <Section title="브랜드 기본 정보">
                <KV k="브랜드명(국문)" v={det.brandKo ?? "—"} />
                <KV k="브랜드명(영문)" v={det.brandEn ?? "—"} />
                <KV k="사업자등록번호" v={det.bizNo ?? "—"} />
                <KV k="대표자명" v={det.repName ?? "—"} />
                <KV k="담당자명" v={det.managerName ?? "—"} />
                <KV k="연락처" v={det.contact ?? "—"} />
                <KV k="이메일" v={det.email ?? "—"} />
                <KV k="미팅 선호" v={`${det.meetingType ?? "—"}${det.meetingSlots?.length ? ` · ${det.meetingSlots.join(", ")}` : ""}`} />
                <div className="flex gap-2">
                  <span className="shrink-0 text-[var(--muted)]">사업자등록증</span>
                  <span className="ml-auto text-right font-semibold">
                    {det.bizRegFile ? <a href={`/api/onboarding/file/${det.bizRegFile.id}`} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">{det.bizRegFile.filename} ↓</a> : "—"}
                  </span>
                </div>
              </Section>

              {/* 제품 */}
              <Section title={`등록 제품 (${det.products?.length ?? 0})`}>
                {(det.products ?? []).map((pr, i) => (
                  <div key={i} className="rounded-lg border border-[var(--border)] p-2.5">
                    <div className="text-[12px] font-bold">{i + 1}. {pr.nameKo || pr.nameEn || "(제품명 미입력)"} {pr.nameEn && pr.nameKo ? <span className="text-[10px] font-normal text-[var(--muted)]">/ {pr.nameEn}</span> : null}</div>
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-[var(--muted)]">
                      <span>카테고리: {pr.cat ?? "—"}</span>
                      <span>소비자가: {won2(pr.price)}</span>
                      <span>원가: {won2(pr.cost)}</span>
                      <span>포장 후 무게: {pr.packWeight ? `${pr.packWeight}g` : "—"}</span>
                      {(pr.w || pr.h || pr.d) && <span>사이즈: {pr.w || "?"}×{pr.h || "?"}×{pr.d || "?"}mm</span>}
                    </div>
                    {pr.desc && <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">{pr.desc}</p>}
                    {pr.cert && <p className="mt-1 text-[10px]">인증서류: <a href={`/api/onboarding/file/${pr.cert.id}`} target="_blank" rel="noreferrer" className="font-semibold text-[var(--accent)] hover:underline">{pr.cert.filename} ↓</a></p>}
                    {/* 라벨/실물 사진 */}
                    {(pr.photos?.length ?? 0) > 0 && (
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="text-[var(--muted)]">라벨/실물 사진({pr.photos!.length}):</span>
                        {pr.photos!.map((ph) => (
                          <a key={ph.id} href={`/api/onboarding/file/${ph.id}`} target="_blank" rel="noreferrer" className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-[var(--accent)] hover:underline">{ph.filename} ↓</a>
                        ))}
                      </p>
                    )}
                    {/* 라벨 필수 표시 체크 */}
                    {pr.label && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {[["productName", "Product Name"], ["netQuantity", "Net Quantity"], ["directions", "Directions"], ["ingredients", "Ingredients"], ["contact", "Contact"]].map(([k, lbl]) => (
                          <span key={k} className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${pr.label?.[k as keyof typeof pr.label] ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{pr.label?.[k as keyof typeof pr.label] ? "✓" : "·"} {lbl}</span>
                        ))}
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${pr.realPhoto ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{pr.realPhoto ? "✓" : "·"} 실물사진</span>
                      </div>
                    )}
                    {/* 연락처 정보(텍스트) */}
                    {(pr.contact?.address || pr.contact?.phone || pr.contact?.website) && (
                      <div className="mt-1 grid gap-0.5 text-[10px] text-[var(--muted)]">
                        {pr.contact?.address && <span>주소: <b className="text-[var(--fg)]">{pr.contact.address}</b></span>}
                        {pr.contact?.phone && <span>전화: <b className="text-[var(--fg)]">{pr.contact.phone}</b></span>}
                        {pr.contact?.website && <span>웹사이트: <b className="text-[var(--fg)]">{pr.contact.website}</b></span>}
                      </div>
                    )}
                  </div>
                ))}
                {!det.products?.length && <p className="text-[var(--muted)]">—</p>}
              </Section>

              {/* 정산 계좌 */}
              <Section title="정산 계좌">
                <KV k="은행" v={det.settlement?.bank ?? "—"} />
                <KV k="계좌번호" v={det.settlement?.acct ?? "—"} />
                <KV k="예금주" v={det.settlement?.holder ?? "—"} />
              </Section>

              {det.note && <Section title="요청사항"><p className="text-[11px] leading-relaxed text-[var(--muted)]">{det.note}</p></Section>}
            </>
          ) : (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">아직 상세 정보(브랜드·제품·정산)는 제출되지 않았습니다.</div>
          )}
          <p className="text-[10px] text-[var(--muted)]">※ 제품별 서류·사진은 사용자가 마이페이지에서 직접 등록·수정하며, 위 링크로 열람할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-3">
      <div className="mb-2 text-[12px] font-black text-[var(--accent)]">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function KV({ k, v }: { k: string; v: string }) {
  return <div className="flex gap-2"><span className="shrink-0 text-[var(--muted)]">{k}</span><span className="ml-auto text-right font-semibold">{v}</span></div>;
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

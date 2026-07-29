"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Crown, Ticket, Bookmark, LogOut, CreditCard, Building2, Mail, Briefcase, LogIn, Send, Loader2, ShoppingBag, Package, LayoutDashboard } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { useBookmarks } from "@/components/ktrend/BookmarkContext";
import OnboardingProductDocs, { type ProductDoc } from "@/components/ktrend/OnboardingProductDocs";
import OnboardingBasicInfo, { type BasicInfo } from "@/components/ktrend/OnboardingBasicInfo";

interface Sub { plan: string; amount: number; status: string; next_charge_at: number }
interface Proposal { id: number; handle: string | null; message: string | null; budget: string | null; status: string; response: string | null; created_at: string }
interface OnbFile { id: string; filename: string }
interface OnbProduct { nameKo?: string; nameEn?: string; cat?: string; price?: string; cert?: OnbFile | null; photos?: OnbFile[]; label?: Record<string, boolean>; contact?: { address?: string; phone?: string; website?: string }; realPhoto?: boolean }
interface OnbDetails { bizNo?: string; brandKo?: string; brandEn?: string; repName?: string; managerName?: string; contact?: string; email?: string; note?: string; repName2?: string; products?: OnbProduct[]; settlement?: { bank?: string; acct?: string; holder?: string }; bizRegFile?: OnbFile | null }
interface OnbApp { track: string | null; grade: string | null; countries: string | null; term: string | null; amount: number | null; phase: string | null; status: string; dino_linked: boolean; payload: { details?: OnbDetails } | null }
interface MallSub { track: string; amount: number; status: string; next_charge_at: number }
interface MallOrder { order_id: string; plan: string; charge_amount: number | null; amount: number; status: string; created_ms: number }
const TRACK_LABEL: Record<string, string> = { ready: "Start Track", live: "Live Focus Track", guarantee: "Guarantee Track", onboarding: "Onboarding Track" };
const COUNTRY_KO: Record<string, string> = { US: "미국", VN: "베트남", TH: "태국", MY: "말레이시아", SG: "싱가포르" };
const ONB_STATUS: Record<string, { label: string; cls: string }> = {
  self_checked: { label: "자가체크 완료", cls: "bg-slate-100 text-slate-500" },
  paid: { label: "결제완료 · 정보입력 필요", cls: "bg-amber-50 text-amber-700" },
  details_submitted: { label: "신청 완료", cls: "bg-emerald-50 text-emerald-700" },
};
const wonF = (n: number | null | undefined) => "₩" + Number(n || 0).toLocaleString();
const PROP_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "대기중", cls: "bg-slate-100 text-slate-500" },
  reviewing: { label: "검토중", cls: "bg-amber-50 text-amber-700" },
  accepted: { label: "수락됨", cls: "bg-emerald-50 text-emerald-700" },
  declined: { label: "반려됨", cls: "bg-rose-50 text-rose-600" },
  done: { label: "완료", cls: "bg-emerald-50 text-emerald-700" },
  withdrawn: { label: "철회됨", cls: "bg-slate-100 text-slate-400" },
};

type Section = "account" | "onb-basic" | "onb-products" | "proposals";

export default function MyPage() {
  const { user, plan, isPro, trialMsLeft, passRemaining, logout } = usePlan();
  const { brands, influencers } = useBookmarks();
  const router = useRouter();
  const [sub, setSub] = useState<Sub | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [onb, setOnb] = useState<{ application: OnbApp | null; mallSub: MallSub | null; orders: MallOrder[] } | null>(null);
  const [section, setSection] = useState<Section>("account");

  const loadProposals = () => {
    fetch("/api/proposals", { cache: "no-store" }).then((r) => r.json()).then((d) => setProposals(d.rows ?? [])).catch(() => setProposals([]));
  };
  const loadOnb = () => {
    fetch("/api/onboarding/status", { cache: "no-store" }).then((r) => r.json())
      .then((d) => setOnb(d?.ok ? { application: d.application, mallSub: d.mallSub, orders: d.orders ?? [] } : null))
      .catch(() => {});
  };

  useEffect(() => {
    if (user) {
      fetch("/api/payment/cancel", { cache: "no-store" }).then((r) => r.json()).then((d) => setSub(d.subscription)).catch(() => {});
      loadProposals();
      loadOnb();
    }
  }, [user]);

  // 결제 직후(온보딩) 진입 시 기본정보 영역으로 이동: /mypage?tab=basic
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "basic" || t === "onb-basic") setSection("onb-basic");
    else if (t === "products" || t === "onb-products") setSection("onb-products");
    else if (t === "proposals") setSection("proposals");
  }, []);

  const withdraw = async (id: number) => {
    if (!confirm("이 제안을 철회하시겠습니까?")) return;
    await fetch("/api/proposals", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadProposals();
  };
  if (!user) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <User className="mx-auto text-[var(--muted)]" />
          <h1 className="mt-3 text-[18px] font-black">마이페이지</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">로그인 후 이용할 수 있어요.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/login" className="kt-btn kt-btn-primary px-5 py-2 text-[12px]"><LogIn size={14} /> 로그인</Link>
            <Link href="/signup" className="kt-btn kt-btn-outline px-5 py-2 text-[12px]">회원가입</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const trialDays = Math.ceil(trialMsLeft / 86_400_000);
  const planLabel = plan === "enterprise" ? "Enterprise" : plan === "pro" ? "Pro" : isPro ? "Pro 체험" : "Basic";
  // 결제 판정: 신청행 존재만으로는 부족(무료 자가체크도 행 생성) — status=paid이거나 몰 구독/결제내역이 있어야 함.
  const paid = !!(onb && (onb.application?.status === "paid" || onb.mallSub || (onb.orders?.length ?? 0) > 0));
  const details = onb?.application?.payload?.details ?? {};
  const products = (details.products ?? []) as ProductDoc[];

  const NAV: { id: Section; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: "account", label: "계정·구독", icon: <User size={14} />, show: true },
    { id: "onb-basic", label: "입점 기본정보", icon: <Building2 size={14} />, show: paid },
    { id: "onb-products", label: "제품 서류·정보", icon: <Package size={14} />, show: paid },
    { id: "proposals", label: "인플루언서 제안", icon: <Send size={14} />, show: true },
  ];

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-4 flex items-center gap-2 text-[20px] font-black tracking-tight"><User size={18} className="text-[var(--accent)]" /> 마이페이지</h1>

        <div className="grid gap-4 md:grid-cols-[200px_1fr]">
          {/* ── 좌측 네비 ── */}
          <nav className="md:sticky md:top-4 md:self-start">
            <div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
              {NAV.filter((n) => n.show).map((n) => (
                <button key={n.id} onClick={() => setSection(n.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold md:w-full ${section === n.id ? "bg-[var(--accent)] text-white" : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}>
                  {n.icon} <span className="whitespace-nowrap">{n.label}</span>
                </button>
              ))}
            </div>
            {paid && (
              <p className="mt-2 hidden px-1 text-[10px] text-[var(--muted)] md:block"><LayoutDashboard size={11} className="mb-0.5 mr-0.5 inline" /> 입점 정보는 여기서 직접 관리할 수 있어요.</p>
            )}
          </nav>

          {/* ── 콘텐츠 ── */}
          <div className="min-w-0 space-y-4">
            {section === "account" && (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="kt-card p-5 sm:col-span-2">
                    <h2 className="mb-3 text-[13px] font-bold">프로필</h2>
                    <div className="space-y-2 text-[12px]">
                      <Row icon={<User size={13} />} label="이름" value={user.name} />
                      <Row icon={<Mail size={13} />} label="이메일" value={user.email} />
                      <Row icon={<Building2 size={13} />} label="브랜드" value={user.brand ?? "—"} />
                      <Row icon={<Briefcase size={13} />} label="직무" value={user.role ?? "—"} />
                    </div>
                    <button onClick={() => { logout(); router.push("/"); }} className="kt-btn kt-btn-outline mt-4 px-4 py-2 text-[12px]"><LogOut size={13} /> 로그아웃</button>
                  </div>
                  <div className="kt-card p-5">
                    <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-bold"><Crown size={14} className="text-[var(--accent)]" /> 구독</h2>
                    <div className="text-[22px] font-black kt-grad-text">{planLabel}</div>
                    {isPro ? (
                      <>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">{trialDays > 0 ? `Pro 이용 중 · 약 ${trialDays}일 남음` : "Pro 이용 중"}</p>
                        {sub && sub.status !== "canceled" && (
                          <p className="mt-1 text-[10px] text-[var(--muted)]">{sub.status === "trial" ? "무료 체험 중 · " : "정기결제 중 · "}다음 결제 {new Date(Number(sub.next_charge_at)).toLocaleDateString("ko-KR")} · ₩{Number(sub.amount).toLocaleString()}</p>
                        )}
                        {sub && sub.status === "canceled" && <p className="mt-1 text-[10px] text-rose-500">자동결제 해지됨 · 기간 종료까지 이용 가능</p>}
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-[11px] text-[var(--muted)]">무료 플랜 이용 중</p>
                        <Link href="/checkout" className="kt-btn kt-btn-primary mt-3 w-full py-2 text-[12px]"><CreditCard size={13} /> Pro 업그레이드</Link>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Stat icon={<Ticket size={16} />} label="오늘 남은 열람권" value={isPro ? "무제한" : `${passRemaining}건`} />
                  <Link href="/saved" className="kt-card flex items-center gap-3 p-4 hover:border-[var(--accent)]">
                    <Bookmark size={16} className="text-[var(--accent)]" />
                    <div><div className="text-[18px] font-black text-[var(--accent)]">{brands.length + influencers.length}</div><div className="text-[10px] text-[var(--muted)]">저장한 항목</div></div>
                  </Link>
                  <Stat icon={<Crown size={16} />} label="플랜" value={planLabel} />
                </div>

                <div className="kt-card p-5">
                  <h2 className="mb-3 text-[13px] font-bold">바로가기</h2>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/explorer" className="kt-btn kt-btn-outline px-4 py-2 text-[12px]">콘텐츠 레퍼런스</Link>
                    <Link href="/saved" className="kt-btn kt-btn-outline px-4 py-2 text-[12px]">저장한 항목</Link>
                    <Link href="/reports" className="kt-btn kt-btn-outline px-4 py-2 text-[12px]">브랜드</Link>
                    <Link href="/plans" className="kt-btn kt-btn-outline px-4 py-2 text-[12px]">요금제</Link>
                  </div>
                </div>
              </>
            )}

            {section === "onb-basic" && (
              paid ? <OnbBasicSection onb={onb!} initial={details} defaultEmail={user.email} onSaved={loadOnb} goProducts={() => setSection("onb-products")} /> : <PaidOnly />
            )}

            {section === "onb-products" && (
              paid ? <OnboardingProductDocs initial={products} onSaved={loadOnb} /> : <PaidOnly />
            )}

            {section === "proposals" && (
              <div className="kt-card p-5">
                <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-bold"><Send size={14} className="text-[var(--accent)]" /> 제안한 인플루언서 {proposals && <span className="text-[11px] font-semibold text-[var(--muted)]">({proposals.length})</span>}</h2>
                {proposals === null ? (
                  <div className="flex items-center gap-2 py-4 text-[11px] text-[var(--muted)]"><Loader2 size={13} className="animate-spin" /> 불러오는 중…</div>
                ) : proposals.length === 0 ? (
                  <p className="py-3 text-[12px] text-[var(--muted)]">아직 보낸 제안이 없어요. <Link href="/influencers" className="font-semibold text-[var(--accent)] hover:underline">인플루언서</Link>에서 협업을 제안해 보세요.</p>
                ) : (
                  <div className="space-y-2">
                    {proposals.map((p) => {
                      const st = PROP_STATUS[p.status] ?? PROP_STATUS.pending;
                      return (
                        <div key={p.id} className="rounded-lg border border-[var(--border)] p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[12px] font-bold">{p.handle ?? "인플루언서"}</span>
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${st.cls}`}>{st.label}</span>
                            <span className="ml-auto text-[10px] text-[var(--muted)]">{new Date(p.created_at).toLocaleDateString("ko-KR")}</span>
                            {p.status === "pending" && <button onClick={() => withdraw(p.id)} className="text-[10px] font-semibold text-rose-500 hover:underline">철회</button>}
                          </div>
                          {p.message && <p className="mt-1.5 text-[11px] text-[var(--muted)]">제안 내용: {p.message}</p>}
                          {p.budget && <p className="mt-0.5 text-[10px] text-[var(--muted)]">예산/단가: {p.budget}</p>}
                          {p.response && <div className="mt-2 rounded-md bg-[var(--accent-light)] px-3 py-2 text-[11px]"><span className="font-bold text-[var(--accent)]">담당자 답변</span><p className="mt-0.5 leading-relaxed text-[var(--fg)]">{p.response}</p></div>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// 입점 기본정보 섹션 — 요약 + 기본정보 폼 + 정기결제/결제내역
function OnbBasicSection({ onb, initial, defaultEmail, onSaved, goProducts }: {
  onb: { application: OnbApp | null; mallSub: MallSub | null; orders: MallOrder[] };
  initial: OnbDetails; defaultEmail?: string; onSaved: () => void; goProducts: () => void;
}) {
  const a = onb.application;
  const cs = (a?.countries ?? "").split(",").filter(Boolean);
  // 결제(paid)이면서 정보입력까지 끝난(phase=completed) 경우 '신청 완료'로 표시(상태값은 paid 유지가 정책).
  const st = a
    ? (a.status === "paid" && a.phase === "completed" ? ONB_STATUS.details_submitted : ONB_STATUS[a.status] ?? { label: a.status, cls: "bg-slate-100 text-slate-500" })
    : { label: "결제 확인됨", cls: "bg-amber-50 text-amber-700" };
  return (
    <>
      {/* 요약 */}
      <div className="kt-card p-5">
        <h2 className="mb-3 flex flex-wrap items-center gap-2 text-[13px] font-bold"><ShoppingBag size={14} className="text-[var(--accent)]" /> 틱톡샵 입점 <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span></h2>
        <div className="grid gap-2 text-[12px] sm:grid-cols-2">
          <Row icon={<Crown size={13} />} label="트랙" value={a?.track ? (TRACK_LABEL[a.track] ?? a.track) : (onb.mallSub?.track ? (TRACK_LABEL[onb.mallSub.track] ?? onb.mallSub.track) : "—")} />
          <Row icon={<Building2 size={13} />} label="진출 국가" value={cs.map((c) => COUNTRY_KO[c] ?? c).join(", ") || "—"} />
          <Row icon={<CreditCard size={13} />} label="약정" value={a?.term === "6month" ? "6개월 약정" : a?.term === "monthly" ? "월 구독" : "—"} />
          <Row icon={<CreditCard size={13} />} label="결제액" value={a?.amount ? wonF(a.amount) : (onb.mallSub?.amount ? wonF(onb.mallSub.amount) : "—")} />
        </div>
        <button onClick={goProducts} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-bold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"><Package size={13} /> 제품 서류·정보 입력하기 →</button>
      </div>

      {/* 기본정보 입력 */}
      <OnboardingBasicInfo initial={initial as BasicInfo} defaultEmail={defaultEmail} onSaved={onSaved} />

      {/* 정기결제 상태 */}
      {onb.mallSub && (
        <div className="kt-card flex flex-wrap items-center gap-2 p-4 text-[11px]">
          <span className="font-semibold">정기결제</span>
          {onb.mallSub.status === "canceled" ? <span className="text-rose-500">해지됨 · 기간 종료까지 유지</span> : (
            <span className="text-[var(--muted)]">다음 결제 {new Date(Number(onb.mallSub.next_charge_at)).toLocaleDateString("ko-KR")} · {wonF(onb.mallSub.amount)}</span>
          )}
          <span className="ml-auto text-[10px] text-[var(--muted)]">해지는 담당 매니저를 통해 안내드립니다.</span>
        </div>
      )}

      {/* 결제 내역 */}
      {onb.orders.length > 0 && (
        <div className="kt-card p-5">
          <div className="mb-1.5 text-[12px] font-bold">결제 내역</div>
          <div className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)]">
            {onb.orders.map((o) => (
              <div key={o.order_id} className="flex items-center justify-between px-3 py-2 text-[11px]">
                <span className="text-[var(--muted)]">{new Date(Number(o.created_ms)).toLocaleDateString("ko-KR")}</span>
                <span>{TRACK_LABEL[o.plan] ?? o.plan}</span>
                <span className="font-semibold">{wonF(o.charge_amount ?? o.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function PaidOnly() {
  return (
    <div className="kt-card p-8 text-center">
      <ShoppingBag className="mx-auto text-[var(--muted)]" />
      <p className="mt-2 text-[13px] font-bold">틱톡샵 입점 결제 후 이용할 수 있어요</p>
      <Link href="/consult1" className="kt-btn kt-btn-primary mt-3 px-4 py-2 text-[12px]">입점 상담·신청</Link>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 last:border-0">
      <span className="flex items-center gap-1.5 text-[var(--muted)]">{icon} {label}</span>
      <span className="ml-auto font-semibold">{value}</span>
    </div>
  );
}
function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="kt-card p-4">
      <div className="mb-1 flex items-center gap-1.5 text-[var(--muted)]">{icon}</div>
      <div className="text-[18px] font-black text-[var(--accent)]">{value}</div>
      <div className="text-[10px] text-[var(--muted)]">{label}</div>
    </div>
  );
}

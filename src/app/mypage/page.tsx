"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Crown, Ticket, Bookmark, LogOut, CreditCard, Building2, Mail, Briefcase, LogIn } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { useBookmarks } from "@/components/ktrend/BookmarkContext";

interface Sub { plan: string; amount: number; status: string; next_charge_at: number }

export default function MyPage() {
  const { user, plan, isPro, trialMsLeft, passRemaining, logout } = usePlan();
  const { brands, influencers } = useBookmarks();
  const router = useRouter();
  const [sub, setSub] = useState<Sub | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    if (user) fetch("/api/payment/cancel", { cache: "no-store" }).then((r) => r.json()).then((d) => setSub(d.subscription)).catch(() => {});
  }, [user]);

  const cancelSub = async () => {
    if (!confirm("정기결제를 해지하시겠습니까?\n남은 Pro 이용 기간은 그대로 유지됩니다.")) return;
    setCanceling(true);
    const r = await fetch("/api/payment/cancel", { method: "POST" });
    setCanceling(false);
    if (r.ok) setSub((s) => (s ? { ...s, status: "canceled" } : s));
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

  return (
    <PageShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 flex items-center gap-2 text-[20px] font-black tracking-tight"><User size={18} className="text-[var(--accent)]" /> 마이페이지</h1>

        <div className="grid gap-4 md:grid-cols-3">
          {/* 프로필 */}
          <div className="kt-card p-5 md:col-span-2">
            <h2 className="mb-3 text-[13px] font-bold">프로필</h2>
            <div className="space-y-2 text-[12px]">
              <Row icon={<User size={13} />} label="이름" value={user.name} />
              <Row icon={<Mail size={13} />} label="이메일" value={user.email} />
              <Row icon={<Building2 size={13} />} label="브랜드" value={user.brand ?? "—"} />
              <Row icon={<Briefcase size={13} />} label="직무" value={user.role ?? "—"} />
            </div>
            <button onClick={() => { logout(); router.push("/"); }} className="kt-btn kt-btn-outline mt-4 px-4 py-2 text-[12px]"><LogOut size={13} /> 로그아웃</button>
          </div>

          {/* 플랜/구독 */}
          <div className="kt-card p-5">
            <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-bold"><Crown size={14} className="text-[var(--accent)]" /> 구독</h2>
            <div className="text-[22px] font-black kt-grad-text">{planLabel}</div>
            {isPro ? (
              <>
                <p className="mt-1 text-[11px] text-[var(--muted)]">{trialDays > 0 ? `Pro 이용 중 · 약 ${trialDays}일 남음` : "Pro 이용 중"}</p>
                {sub && sub.status !== "canceled" && (
                  <>
                    <p className="mt-1 text-[10px] text-[var(--muted)]">
                      {sub.status === "trial" ? "무료 체험 중 · " : "정기결제 중 · "}
                      다음 결제 {new Date(sub.next_charge_at).toLocaleDateString("ko-KR")} · ₩{sub.amount.toLocaleString()}
                    </p>
                    <button onClick={cancelSub} disabled={canceling} className="mt-2 w-full rounded-md border border-[var(--border)] py-1.5 text-[11px] font-semibold text-[var(--muted)] hover:border-rose-300 hover:text-rose-600 disabled:opacity-50">
                      {canceling ? "해지 중…" : "정기결제 해지"}
                    </button>
                  </>
                )}
                {sub && sub.status === "canceled" && (
                  <p className="mt-1 text-[10px] text-rose-500">자동결제 해지됨 · 기간 종료까지 이용 가능</p>
                )}
              </>
            ) : (
              <>
                <p className="mt-1 text-[11px] text-[var(--muted)]">무료 플랜 이용 중</p>
                <Link href="/checkout" className="kt-btn kt-btn-primary mt-3 w-full py-2 text-[12px]"><CreditCard size={13} /> Pro 업그레이드</Link>
              </>
            )}
          </div>
        </div>

        {/* 사용 현황 */}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat icon={<Ticket size={16} />} label="오늘 남은 열람권" value={isPro ? "무제한" : `${passRemaining}건`} />
          <Link href="/saved" className="kt-card flex items-center gap-3 p-4 hover:border-[var(--accent)]">
            <Bookmark size={16} className="text-[var(--accent)]" />
            <div><div className="text-[18px] font-black text-[var(--accent)]">{brands.length + influencers.length}</div><div className="text-[10px] text-[var(--muted)]">저장한 항목</div></div>
          </Link>
          <Stat icon={<Crown size={16} />} label="플랜" value={planLabel} />
        </div>

        {/* 바로가기 */}
        <div className="mt-4 kt-card p-5">
          <h2 className="mb-3 text-[13px] font-bold">바로가기</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/explorer" className="kt-btn kt-btn-outline px-4 py-2 text-[12px]">콘텐츠 레퍼런스</Link>
            <Link href="/saved" className="kt-btn kt-btn-outline px-4 py-2 text-[12px]">저장한 항목</Link>
            <Link href="/reports" className="kt-btn kt-btn-outline px-4 py-2 text-[12px]">브랜드</Link>
            <Link href="/plans" className="kt-btn kt-btn-outline px-4 py-2 text-[12px]">요금제</Link>
          </div>
        </div>
      </div>
    </PageShell>
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

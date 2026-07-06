"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, LogOut, Bookmark, Menu, X, ShoppingBag } from "lucide-react";
import { usePlan } from "./PlanContext";
import OnlineCount from "./OnlineCount";
import type { PlanId } from "@/data/ktrend/meta";
import { ONBOARDING } from "@/data/ktrend/meta";

const NAV: { href: string; label: string; title?: string; desc?: string; sub?: { href: string; label: string; desc?: string }[] }[] = [
  { href: "/explorer", label: "콘텐츠 레퍼런스", title: "콘텐츠", desc: "성과있는 콘텐츠를 카테고리와 브랜드별로 찾아보세요" },
  { href: "/influencers", label: "인플루언서", title: "인플루언서", desc: "인플루언서별로 성과 케이스를 찾아보세요" },
  { href: "/reports", label: "브랜드", title: "브랜드", desc: "타 브랜드는 어떻게 성장했는지 찾아보세요" },
  { href: "/plans", label: "요금제", sub: [
    { href: "/plans", label: "Glovek 플랫폼 구독", desc: "콘텐츠·인플루언서·브랜드 분석 SaaS" },
    { href: "/plans/mall", label: "틱톡샵 멀티몰 입점", desc: "Live Focus · Onboarding 트랙" },
  ] },
  { href: "/tts/qna", label: "FAQ", title: "FAQ", desc: "틱톡샵 입점·서비스 자주 묻는 질문(QnA)" },
];

const PLAN_LABEL: Record<PlanId, string> = {
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};
const PLAN_COLOR: Record<PlanId, string> = {
  basic: "#64748b",
  pro: "#1A56DB",
  enterprise: "#7C3AED",
};

export default function SiteHeader() {
  const pathname = usePathname();
  const { user, plan, logout, isPro, passRemaining } = usePlan();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1480px] items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/glovek-logo.svg" alt="Glovek" className="h-6 w-auto" />
        </Link>

        {/* 데스크탑 네비 + 호버 가이드 레이어 */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  className={`block rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                    active
                      ? "bg-[var(--accent-light)] text-[var(--accent)]"
                      : "text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {item.label}
                </Link>
                {item.desc && (
                  <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 hidden w-60 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-white p-3 text-left shadow-xl group-hover:block">
                    <div className="text-[12px] font-bold text-[var(--fg)]">{item.title}</div>
                    <div className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">{item.desc}</div>
                  </div>
                )}
                {item.sub && (
                  <div className="absolute left-1/2 top-full z-50 hidden w-64 -translate-x-1/2 pt-2 group-hover:block">
                    <div className="rounded-lg border border-[var(--border)] bg-white p-2 text-left shadow-xl">
                      {item.sub.map((s) => (
                        <Link key={s.href + s.label} href={s.href} className="block rounded-md px-3 py-2 hover:bg-slate-50">
                          <div className="text-[12px] font-bold text-[var(--fg)]">{s.label}</div>
                          {s.desc && <div className="mt-0.5 text-[11px] text-[var(--muted)]">{s.desc}</div>}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* 틱톡샵 온보딩 트랙 (롤백 가능: ONBOARDING.enabled=false) */}
          {ONBOARDING.enabled && (
            <Link
              href={ONBOARDING.path}
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-opacity hover:opacity-90 sm:inline-flex ${
                pathname?.startsWith(ONBOARDING.path) ? "ring-2 ring-violet-300" : ""
              }`}
              style={{ background: "linear-gradient(90deg,#7C3AED,#1A56DB)" }}
            >
              <ShoppingBag size={13} /> {ONBOARDING.navLabel}
            </Link>
          )}
          {/* TEST1: 동시 접속자 (롤백 시 이 줄 제거) */}
          <OnlineCount />
          {user && !isPro && (
            <span className="hidden rounded-md bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700 sm:inline">
              오늘 열람권 {passRemaining}건 남음
            </span>
          )}
          {user ? (
            <>
              <Link href="/saved" title="저장됨" className="kt-btn kt-btn-outline px-2 py-1.5 text-[11px]">
                <Bookmark size={13} />
              </Link>
              <Link
                href="/mypage"
                className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                style={{ background: PLAN_COLOR[plan] }}
                title="마이페이지"
              >
                {PLAN_LABEL[plan]}
              </Link>
              <Link href="/mypage" className="hidden text-right leading-tight sm:block">
                <div className="text-[11px] font-bold hover:text-[var(--accent)]">{user.name}</div>
                <div className="text-[9px] text-[var(--muted)]">{user.company}</div>
              </Link>
              <button
                onClick={logout}
                title="로그아웃"
                className="hidden kt-btn kt-btn-outline px-2.5 py-1.5 text-[11px] sm:inline-flex"
              >
                <LogOut size={13} /> 로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden kt-btn kt-btn-outline px-3 py-1.5 text-[11px] sm:inline-flex">
                <LogIn size={13} /> 로그인
              </Link>
              <Link href="/signup" className="hidden kt-btn kt-btn-primary px-3 py-1.5 text-[11px] sm:inline-flex">
                회원가입
              </Link>
            </>
          )}

          {/* 모바일 메뉴 토글 */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="메뉴"
            aria-expanded={menuOpen}
            className="kt-btn kt-btn-outline px-2 py-1.5 md:hidden"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {menuOpen && (
        <div className="border-t border-[var(--border)] bg-white md:hidden">
          <nav className="mx-auto max-w-[1480px] px-3 py-2">
            {NAV.map((item) => {
              const active = pathname?.startsWith(item.href);
              // 서브메뉴(요금제)는 모바일에서 하위 항목을 펼쳐 노출
              if (item.sub) {
                return (
                  <div key={item.href} className="px-3 py-2">
                    <div className="text-[13px] font-bold text-[var(--fg)]">{item.label}</div>
                    <div className="mt-1 space-y-1">
                      {item.sub.map((s) => (
                        <Link key={s.href + s.label} href={s.href} onClick={() => setMenuOpen(false)}
                          className="block rounded-md border border-[var(--border)] px-3 py-2 hover:bg-slate-50">
                          <div className="text-[12px] font-semibold text-[var(--fg)]">{s.label}</div>
                          {s.desc && <div className="mt-0.5 text-[11px] text-[var(--muted)]">{s.desc}</div>}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block rounded-lg px-3 py-2.5 ${active ? "bg-[var(--accent-light)]" : "hover:bg-slate-50"}`}
                >
                  <div className={`text-[13px] font-bold ${active ? "text-[var(--accent)]" : "text-[var(--fg)]"}`}>
                    {item.label}
                  </div>
                  {item.desc && <div className="mt-0.5 text-[11px] text-[var(--muted)]">{item.desc}</div>}
                </Link>
              );
            })}

            {/* 틱톡샵 온보딩 (모바일) */}
            {ONBOARDING.enabled && (
              <Link
                href={ONBOARDING.path}
                onClick={() => setMenuOpen(false)}
                className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-white"
                style={{ background: "linear-gradient(90deg,#7C3AED,#1A56DB)" }}
              >
                <ShoppingBag size={15} />
                <span className="text-[13px] font-bold">{ONBOARDING.navLabel}</span>
              </Link>
            )}

            {/* 모바일 인증 버튼 */}
            <div className="mt-2 flex gap-2 border-t border-[var(--border)] pt-2">
              {user ? (
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="kt-btn kt-btn-outline flex-1 py-2 text-[12px]"
                >
                  <LogOut size={14} /> 로그아웃
                </button>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="kt-btn kt-btn-outline flex-1 py-2 text-[12px]">
                    <LogIn size={14} /> 로그인
                  </Link>
                  <Link href="/signup" onClick={() => setMenuOpen(false)} className="kt-btn kt-btn-primary flex-1 py-2 text-[12px]">
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

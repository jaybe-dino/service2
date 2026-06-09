"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";

const NAV = [
  { href: "/", label: "콘텐츠 탐색" },
  { href: "/influencers", label: "인플루언서 DB" },
  { href: "/reports", label: "브랜드 리포트" },
  { href: "/viral", label: "바이럴 감지" },
  { href: "/plans", label: "요금제" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">
            K-Trend<span className="text-rose-500"> Analytics</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-rose-50 text-rose-600"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/plans"
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            요금제
          </Link>
          <Link
            href="/plans"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            무료로 시작
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-slate-600 md:hidden"
          aria-label="메뉴"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(item.href) ? "bg-rose-50 text-rose-600" : "text-slate-700"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/plans"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-lg bg-slate-900 px-3 py-2.5 text-center text-sm font-semibold text-white"
            >
              무료로 시작
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

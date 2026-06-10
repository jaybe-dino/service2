"use client";

import { useState } from "react";
import { Megaphone, X, Zap } from "lucide-react";
import InquiryModal, { type InquiryKind } from "./InquiryModal";

// 전역 상단 얇은 배너 (테스트 — 추후 제거 가능). 틱톡샵 온보딩 패스트트랙 + 마케팅 상담.
export default function TopBanner() {
  const [open, setOpen] = useState<InquiryKind | null>(null);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <div className="relative z-[60] kt-grad-bg text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-9 py-1.5 text-center text-[11px] font-semibold leading-tight sm:text-[12px]">
        <span className="inline-flex items-center gap-1">
          <Zap size={13} className="shrink-0" />
          틱톡샵 온보딩 패스트트랙
        </span>
        <button
          onClick={() => setOpen("tiktokshop")}
          className="rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/30"
        >
          신청하기
        </button>
        <span className="hidden opacity-50 sm:inline">·</span>
        <span className="inline-flex items-center gap-1">
          <Megaphone size={13} className="shrink-0" />
          마케팅 상담
        </span>
        <button
          onClick={() => setOpen("marketing")}
          className="rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/30"
        >
          문의하기
        </button>
      </div>
      <button
        onClick={() => setHidden(true)}
        aria-label="배너 닫기"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-white/20"
      >
        <X size={14} />
      </button>
      {open && <InquiryModal kind={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

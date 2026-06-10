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
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-1.5 px-8 py-1 text-center text-[11px] font-semibold">
        <Zap size={12} className="shrink-0" />
        <button onClick={() => setOpen("tiktokshop")} className="underline-offset-2 hover:underline">
          틱톡샵 온보딩 패스트트랙
        </button>
        <span className="opacity-50">·</span>
        <Megaphone size={12} className="shrink-0" />
        <button onClick={() => setOpen("marketing")} className="underline-offset-2 hover:underline">
          마케팅 상담 신청
        </button>
        <button
          onClick={() => setHidden(true)}
          aria-label="배너 닫기"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-white/20"
        >
          <X size={13} />
        </button>
      </div>
      {open && <InquiryModal kind={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

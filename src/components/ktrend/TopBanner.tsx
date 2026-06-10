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
    <>
      <div className="relative z-[60] kt-grad-bg text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 px-9 py-1.5 text-center text-[11px] font-semibold leading-tight sm:text-[12px]">
          <button onClick={() => setOpen("tiktokshop")} className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
            <Zap size={13} className="shrink-0" />
            틱톡샵 온보딩 패스트트랙 신청
          </button>
          <span className="opacity-50">·</span>
          <button onClick={() => setOpen("marketing")} className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
            <Megaphone size={13} className="shrink-0" />
            마케팅 상담 문의
          </button>
        </div>
        <button
          onClick={() => setHidden(true)}
          aria-label="배너 닫기"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-white/20"
        >
          <X size={14} />
        </button>
      </div>
      {/* 모달은 배너의 text-white 컨텍스트 밖에서 렌더 (텍스트 흰색 상속 방지) */}
      {open && <InquiryModal kind={open} onClose={() => setOpen(null)} />}
    </>
  );
}

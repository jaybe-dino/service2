"use client";

import { useState } from "react";
import { MessageCircle, X, ShoppingBag, Megaphone, ExternalLink } from "lucide-react";
import InquiryModal, { type InquiryKind } from "./InquiryModal";

// PC/모바일 공통 우하단 플로팅 문의 버튼
export default function FloatingInquiry() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<InquiryKind | null>(null);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
        {open && (
          <div className="w-60 overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-2xl">
            <div className="border-b border-[var(--border)] bg-[var(--accent-light)] px-3 py-2 text-[12px] font-bold text-[var(--accent)]">
              무엇을 도와드릴까요?
            </div>
            <button
              onClick={() => { setKind("tiktokshop"); setOpen(false); }}
              className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
            >
              <ShoppingBag size={16} className="mt-0.5 text-emerald-600" />
              <span>
                <span className="block text-[12px] font-semibold">틱톡샵 온보딩 문의</span>
                <span className="block text-[10px] text-[var(--muted)]">샵 입점·운영 상담</span>
              </span>
            </button>
            <button
              onClick={() => { setKind("marketing"); setOpen(false); }}
              className="flex w-full items-start gap-2 border-t border-[var(--border)] px-3 py-2.5 text-left hover:bg-slate-50"
            >
              <Megaphone size={16} className="mt-0.5 text-[var(--accent)]" />
              <span>
                <span className="block text-[12px] font-semibold">마케팅 1:1 문의</span>
                <span className="block text-[10px] text-[var(--muted)]">인플루언서·콘텐츠 전략</span>
              </span>
            </button>
            <a
              href="https://tpartners.live"
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-1.5 border-t border-[var(--border)] px-3 py-2 text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--accent)]"
            >
              <ExternalLink size={12} /> tpartners.live 바로가기
            </a>
          </div>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="문의하기"
          className="flex h-13 w-13 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-xl transition-transform hover:scale-105 active:scale-95"
          style={{ height: 52, width: 52 }}
        >
          {open ? <X size={22} /> : <MessageCircle size={22} />}
        </button>
      </div>

      {kind && <InquiryModal kind={kind} onClose={() => setKind(null)} />}
    </>
  );
}

"use client";

import { useState } from "react";
import { MessageCircle, ShoppingBag, Briefcase } from "lucide-react";
import InquiryModal, { type InquiryKind } from "./InquiryModal";
import { tpartnersUrl } from "@/lib/tpartners";

export default function FooterCTAs() {
  const [kind, setKind] = useState<InquiryKind | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setKind("marketing")} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]">
        <MessageCircle size={13} /> 마케팅 1:1 문의
      </button>
      <a
        href={tpartnersUrl("tiktokshop_onboarding", "footer")}
        target="_blank"
        rel="noreferrer noopener"
        className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]"
      >
        <ShoppingBag size={13} /> 틱톡샵 온보딩 (tpartners.live)
      </a>
      <button onClick={() => setKind("sales")} className="kt-btn kt-btn-outline px-3 py-1.5 text-[11px]">
        <Briefcase size={13} /> 도입 문의
      </button>
      {kind && <InquiryModal kind={kind} onClose={() => setKind(null)} />}
    </div>
  );
}

"use client";

// E-book 열람 보호 래퍼 — 우클릭·복사·인쇄·저장 단축키 차단 + 드래그 선택 방지.
// (완전한 유출 방지는 불가능 — 화면 캡처까지는 못 막는 억제 장치임을 전제)
import { useEffect, type ReactNode } from "react";

export default function Protect({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && ["p", "s", "c", "u"].includes(k)) { e.preventDefault(); }
      if (e.key === "PrintScreen") e.preventDefault();
    };
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("keydown", onKey);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);
  return (
    <div className="select-none" style={{ WebkitUserSelect: "none", userSelect: "none" }}>
      {/* 인쇄 시 본문 숨김 + 안내 문구 */}
      <style>{`
        @media print {
          .gb-body { display: none !important; }
          .gb-noprint::after { content: "이 문서는 온라인 열람 전용입니다 — glovek.space/guidebook"; font-size: 14px; }
        }
      `}</style>
      <div className="gb-noprint" />
      <div className="gb-body">{children}</div>
    </div>
  );
}

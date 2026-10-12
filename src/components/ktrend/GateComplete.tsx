"use client";

import { useEffect } from "react";
import { trackPixel } from "@/components/ktrend/MetaPixel";

// 저장 성공 직후(?reg=1) CompleteRegistration 1회 발화 후 쿼리 제거 → 새로고침 중복 전환 방지.
// PageView는 전역 layout 픽셀이 이미 발화하므로 여기선 전환만. Lead는 발화하지 않음(중복 집계 방지).
export default function GateComplete({ fireReg, kind }: { fireReg: boolean; kind: string }) {
  useEffect(() => {
    if (!fireReg) return;
    trackPixel("CompleteRegistration", { content_name: `${kind}_gate` });
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.has("reg")) { u.searchParams.delete("reg"); window.history.replaceState({}, "", u.pathname + (u.search || "") + u.hash); }
    } catch { /* noop */ }
  }, [fireReg, kind]);
  return null;
}

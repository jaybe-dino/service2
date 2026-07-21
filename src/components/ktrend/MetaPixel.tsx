"use client";

// Meta(Facebook) Pixel — 베이스 코드는 app/layout.tsx <head>에 원본 그대로 삽입돼 있음.
// 이 컴포넌트는 SPA 라우트 변경 시 PageView 재전송 + 이벤트 헬퍼만 담당.
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1726953618432069";

// 이벤트 전송 헬퍼 — 어디서든 import 해서 사용. fbq 미로드 시 안전하게 무시.
export function trackPixel(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { fbq?: (...a: unknown[]) => void };
  if (typeof w.fbq === "function") w.fbq("track", event, params);
}

export default function MetaPixel() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    // 최초 로드는 <head> 스크립트가 이미 PageView 전송 → 중복 방지 위해 스킵.
    if (first.current) { first.current = false; return; }
    const w = window as unknown as { fbq?: (...a: unknown[]) => void };
    if (typeof w.fbq === "function") w.fbq("track", "PageView");
  }, [pathname]);

  return null;
}

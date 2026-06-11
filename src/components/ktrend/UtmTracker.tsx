"use client";

import { useEffect } from "react";
import { parseUtmFromSearch, hasUtm, storeFirstTouchUtm } from "@/lib/utm";

// 첫 진입 시 URL의 utm_* 파라미터를 캡처 → first-touch 저장 + 방문 이벤트 적재
export default function UtmTracker() {
  useEffect(() => {
    try {
      const u = parseUtmFromSearch(window.location.search);
      if (!hasUtm(u)) return;
      storeFirstTouchUtm(u);
      fetch("/api/utm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...u, path: window.location.pathname, referrer: document.referrer }),
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}

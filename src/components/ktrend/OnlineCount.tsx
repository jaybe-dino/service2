"use client";

import { useEffect, useRef, useState } from "react";

// ────────────────────────────────────────────────────────────────────────
// TEST1: 동시 접속자 표기 (롤백 가능). 시간대 곡선(80~800) + 실제 접속자 수.
// 롤백하려면 SiteHeader에서 <OnlineCount /> 한 줄만 제거하면 됩니다.
// ────────────────────────────────────────────────────────────────────────

// 시간대별 활성도 가중치 (0~1): 새벽/오전 낮음, 낮·저녁 피크
const W = [
  0.10, 0.07, 0.05, 0.05, 0.06, 0.10, // 0-5시
  0.18, 0.28, 0.38, 0.50, 0.58, 0.62, // 6-11시
  0.66, 0.62, 0.60, 0.62, 0.66, 0.70, // 12-17시
  0.78, 0.88, 0.95, 0.90, 0.72, 0.40, // 18-23시
];

function diurnalBase(d: Date): number {
  const h = d.getHours();
  const m = d.getMinutes();
  const w = W[h] + (W[(h + 1) % 24] - W[h]) * (m / 60); // 분 단위 보간
  return Math.round(80 + w * 720); // 80 ~ 800
}

export default function OnlineCount() {
  const [n, setN] = useState<number | null>(null);
  const realRef = useRef(0);
  const jitterRef = useRef(0);

  useEffect(() => {
    let alive = true;
    let sid = "";
    try {
      sid = sessionStorage.getItem("glovek.sid") || "";
      if (!sid) { sid = Math.random().toString(36).slice(2); sessionStorage.setItem("glovek.sid", sid); }
    } catch { sid = Math.random().toString(36).slice(2); }

    const heartbeat = async () => {
      try {
        const r = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sid }),
        });
        const d = await r.json();
        realRef.current = Number(d?.active) || 0;
      } catch { /* ignore */ }
    };

    const tick = () => {
      jitterRef.current += (Math.random() - 0.5) * 16; // 완만한 랜덤워크
      jitterRef.current = Math.max(-30, Math.min(30, jitterRef.current));
      const base = Math.max(80, Math.min(800, Math.round(diurnalBase(new Date()) + jitterRef.current)));
      if (alive) setN(base + realRef.current); // 시뮬 추세 + 실제 접속자
    };

    heartbeat();
    tick();
    const hb = setInterval(heartbeat, 25000);
    const t = setInterval(tick, 4000);
    return () => { alive = false; clearInterval(hb); clearInterval(t); };
  }, []);

  if (n === null) return null;

  return (
    <span
      title="현재 접속자"
      className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 sm:inline-flex"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      {n.toLocaleString()}명 접속중
    </span>
  );
}

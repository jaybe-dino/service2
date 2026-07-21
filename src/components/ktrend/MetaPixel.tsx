"use client";

// Meta(Facebook) Pixel — 전역 로드 + SPA 라우트 변경 시 PageView 재전송.
// 픽셀 ID는 NEXT_PUBLIC_META_PIXEL_ID로 오버라이드(기본값 아래).
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1726953618432069";

// 이벤트 전송 헬퍼 — 어디서든 import 해서 사용. fbq 미로드 시 안전하게 무시.
export function trackPixel(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { fbq?: (...a: unknown[]) => void };
  if (typeof w.fbq === "function") w.fbq("track", event, params);
}

export default function MetaPixel() {
  const pathname = usePathname();

  // 클라이언트 라우팅(App Router)은 새로고침이 없어 PageView가 안 뜀 → 경로 변경마다 재전송.
  useEffect(() => {
    const w = window as unknown as { fbq?: (...a: unknown[]) => void };
    if (typeof w.fbq === "function") w.fbq("track", "PageView");
  }, [pathname]);

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: "none" }} alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}

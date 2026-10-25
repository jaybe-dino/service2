import type { NextConfig } from "next";

// 동적 서버 앱 (Vercel 배포). API 라우트 + 서버 세션 인증 + Postgres 사용.
// basePath는 환경변수로 토글 — Vercel은 루트(/)에서 서빙되므로 기본 비움.
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

// start.glovek.space 호스트에서만 적용되는 랜딩 리라이트 조건.
// (glovek.space 루트/다른 호스트는 영향 없음 — host 매칭이 아닐 때 통과)
const START_HOST = [{ type: "host" as const, value: "start.glovek.space" }];

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  basePath: base || undefined,
  assetPrefix: base ? `${base}/` : undefined,
  // /guidebook 라우트가 런타임에 읽는 E-book 원문을 서버리스 번들에 포함
  outputFileTracingIncludes: { "/guidebook": ["./src/app/guidebook/ebook.html"] },
  // start.glovek.space → public/start/ 정적 랜딩을 그대로 서빙(React 레이아웃/PageShell 미적용).
  // 랜딩 HTML의 상대경로(styles.css·app.js·assets/*)도 함께 매핑. API/admin/_next 등은 그대로 앱이 처리.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", has: START_HOST, destination: "/start/index.html" },
        { source: "/styles.css", has: START_HOST, destination: "/start/styles.css" },
        { source: "/app.js", has: START_HOST, destination: "/start/app.js" },
        { source: "/assets/:path*", has: START_HOST, destination: "/start/assets/:path*" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;

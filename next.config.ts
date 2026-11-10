import type { NextConfig } from "next";

// 동적 서버 앱 (Vercel 배포). API 라우트 + 서버 세션 인증 + Postgres 사용.
// basePath는 환경변수로 토글 — Vercel은 루트(/)에서 서빙되므로 기본 비움.
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

// start.glovek.space 호스트에서만 적용되는 랜딩 리라이트 조건.
// (glovek.space 루트/다른 호스트는 영향 없음 — host 매칭이 아닐 때 통과)
const START_HOST = [{ type: "host" as const, value: "start.glovek.space" }];
// batch.glovek.space 호스트에서만 적용되는 복제 랜딩 리라이트 조건(start과 독립).
const BATCH_HOST = [{ type: "host" as const, value: "batch.glovek.space" }];
// batch2.glovek.space 호스트(배치 2기) — batch와 독립 정적 랜딩.
const BATCH2_HOST = [{ type: "host" as const, value: "batch2.glovek.space" }];
// sea.glovek.space 호스트(동남아 1개국 온보딩 무료 프로모션) — 독립 정적 랜딩.
const SEA_HOST = [{ type: "host" as const, value: "sea.glovek.space" }];
// growth.glovek.space 호스트(글로벌 성장 프로그램 1기 · 운영대행 수수료 + 바우처 지원) — 독립 정적 랜딩.
const GROWTH_HOST = [{ type: "host" as const, value: "growth.glovek.space" }];
// program.glovek.space 호스트(진출 프로그램 · start 동일 구성, 권역당 300만원 정가) — 독립 정적 랜딩.
const PROGRAM_HOST = [{ type: "host" as const, value: "program.glovek.space" }];

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
        // batch.glovek.space → public/batch/ (API/admin/_next는 그대로 앱이 처리)
        { source: "/", has: BATCH_HOST, destination: "/batch/index.html" },
        { source: "/styles.css", has: BATCH_HOST, destination: "/batch/styles.css" },
        { source: "/app.js", has: BATCH_HOST, destination: "/batch/app.js" },
        { source: "/assets/:path*", has: BATCH_HOST, destination: "/batch/assets/:path*" },
        // batch2.glovek.space → public/batch2/ (배치 2기)
        { source: "/", has: BATCH2_HOST, destination: "/batch2/index.html" },
        { source: "/styles.css", has: BATCH2_HOST, destination: "/batch2/styles.css" },
        { source: "/app.js", has: BATCH2_HOST, destination: "/batch2/app.js" },
        { source: "/assets/:path*", has: BATCH2_HOST, destination: "/batch2/assets/:path*" },
        // sea.glovek.space → public/sea/ (동남아 1개국 온보딩 무료 프로모션)
        { source: "/", has: SEA_HOST, destination: "/sea/index.html" },
        { source: "/styles.css", has: SEA_HOST, destination: "/sea/styles.css" },
        { source: "/app.js", has: SEA_HOST, destination: "/sea/app.js" },
        { source: "/assets/:path*", has: SEA_HOST, destination: "/sea/assets/:path*" },
        // growth.glovek.space → public/growth/ (글로벌 성장 프로그램 1기)
        { source: "/", has: GROWTH_HOST, destination: "/growth/index.html" },
        { source: "/styles.css", has: GROWTH_HOST, destination: "/growth/styles.css" },
        { source: "/app.js", has: GROWTH_HOST, destination: "/growth/app.js" },
        { source: "/assets/:path*", has: GROWTH_HOST, destination: "/growth/assets/:path*" },
        // program.glovek.space → public/program/ (진출 프로그램 · 300만원 정가)
        { source: "/", has: PROGRAM_HOST, destination: "/program/index.html" },
        { source: "/styles.css", has: PROGRAM_HOST, destination: "/program/styles.css" },
        { source: "/app.js", has: PROGRAM_HOST, destination: "/program/app.js" },
        { source: "/assets/:path*", has: PROGRAM_HOST, destination: "/program/assets/:path*" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;

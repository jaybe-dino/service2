import type { NextConfig } from "next";

// 동적 서버 앱 (Vercel 배포). API 라우트 + 서버 세션 인증 + Postgres 사용.
// basePath는 환경변수로 토글 — Vercel은 루트(/)에서 서빙되므로 기본 비움.
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  basePath: base || undefined,
  assetPrefix: base ? `${base}/` : undefined,
  // /guidebook 라우트가 런타임에 읽는 E-book 원문을 서버리스 번들에 포함
  outputFileTracingIncludes: { "/guidebook": ["./src/app/guidebook/ebook.html"] },
};

export default nextConfig;

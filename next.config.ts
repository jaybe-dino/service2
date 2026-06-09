import type { NextConfig } from "next";

// GitHub Pages 정적 배포용 설정.
// 프로젝트 페이지(https://<user>.github.io/service2)로 서빙되므로 basePath를 지정한다.
// NEXT_PUBLIC_BASE_PATH 환경변수로 토글(클라이언트의 fetch 경로와 단일 출처 공유).
const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: base || undefined,
  assetPrefix: base ? `${base}/` : undefined,
};

export default nextConfig;

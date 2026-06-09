import type { NextConfig } from "next";

// GitHub Pages 정적 배포용 설정.
// 프로젝트 페이지(https://<user>.github.io/service2)로 서빙되므로 basePath를 지정한다.
// 로컬 개발 시에는 basePath 없이 동작하도록 환경변수로 토글한다.
const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isPages ? "/service2" : undefined,
  assetPrefix: isPages ? "/service2/" : undefined,
};

export default nextConfig;

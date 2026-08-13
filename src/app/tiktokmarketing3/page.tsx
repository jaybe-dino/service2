import type { Metadata } from "next";
import Calculator from "./Calculator";

// 검색엔진 색인 차단(비공개 자료). robots.ts에도 disallow 추가됨.
export const metadata: Metadata = {
  title: "예산·성과 시뮬레이터",
  description: "브랜드사 대상 운영 예산/성과 계산기",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function TiktokMarketing3Page() {
  return <Calculator />;
}

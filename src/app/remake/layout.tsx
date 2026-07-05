import type { Metadata } from "next";

// 아직 사용자에게 미노출 — 검색 비색인, 직접 URL 접속으로만 테스트
export const metadata: Metadata = {
  title: "Glovek Remake Studio (프로토타입)",
  robots: { index: false, follow: false },
};

export default function RemakeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

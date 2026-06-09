import type { Metadata } from "next";
import "./globals.css";
import { PlanProvider } from "@/components/ktrend/PlanContext";

export const metadata: Metadata = {
  title: "K-Trend Analytics — 글로벌 틱톡 K-뷰티 콘텐츠 분석",
  description:
    "미국·동남아 6개국 틱톡 샵에서 바이럴되는 110+ K-뷰티 브랜드 콘텐츠를 브랜드·콘텐츠·인플루언서별로 조회·분석하는 B2B SaaS.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <PlanProvider>{children}</PlanProvider>
      </body>
    </html>
  );
}

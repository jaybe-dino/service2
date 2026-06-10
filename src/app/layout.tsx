import type { Metadata } from "next";
import "./globals.css";
import { PlanProvider } from "@/components/ktrend/PlanContext";
import { BookmarkProvider } from "@/components/ktrend/BookmarkContext";

export const metadata: Metadata = {
  title: "Glovek — 글로벌 틱톡 K-뷰티 콘텐츠 분석",
  description:
    "98개 K-뷰티 브랜드의 실제 틱톡 콘텐츠를 브랜드·콘텐츠·인플루언서별로 조회·분석하는 B2B SaaS.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <PlanProvider>
          <BookmarkProvider>{children}</BookmarkProvider>
        </PlanProvider>
      </body>
    </html>
  );
}

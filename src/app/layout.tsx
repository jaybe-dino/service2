import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "K-Trend Analytics — K-뷰티 틱톡 콘텐츠 탐색 & 성과 분석",
  description:
    "110개 이상의 K-뷰티 브랜드가 글로벌 틱톡에서 만들어내는 바이럴 콘텐츠와 어필리에이트 성과를 한 화면에서 탐색하세요. 콘텐츠 중심의 B2B 분석 SaaS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { PlanProvider } from "@/components/ktrend/PlanContext";
import { BookmarkProvider } from "@/components/ktrend/BookmarkContext";
import TopBanner from "@/components/ktrend/TopBanner";
import UtmTracker from "@/components/ktrend/UtmTracker";

const SITE_URL = "https://glovek.space";
const TITLE = "Glovek — 틱톡 K-뷰티 콘텐츠·인플루언서 분석 SaaS";
const DESC =
  "K-뷰티 브랜드의 실제 틱톡 콘텐츠를 브랜드·콘텐츠·인플루언서별로 조회·분석하는 B2B SaaS. 바이럴 콘텐츠 레퍼런스, 인플루언서, 브랜드 성장 리포트를 제공합니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Glovek",
  },
  description: DESC,
  applicationName: "Glovek",
  keywords: [
    "Glovek", "글로벅", "틱톡 K뷰티", "K-beauty TikTok", "틱톡샵 온보딩",
    "인플루언서 마케팅", "틱톡 콘텐츠 분석", "K뷰티 인플루언서", "TikTok Shop",
    "뷰티 브랜드 마케팅", "콘텐츠 레퍼런스", "어필리에이트 크리에이터",
  ],
  authors: [{ name: "DINOSTUDIO", url: "https://dinostudio.kr" }],
  creator: "DINOSTUDIO",
  publisher: "DINOSTUDIO",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "Glovek",
    title: TITLE,
    description: DESC,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  category: "business",
};

// AEO/SEO: 구조화 데이터 (Organization + WebSite + SoftwareApplication + FAQ)
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "DINOSTUDIO",
      url: "https://dinostudio.kr",
      email: "chief@dinostudio.kr",
      address: {
        "@type": "PostalAddress",
        streetAddress: "서초대로48길 101, 그룹메가타워 2F",
        addressLocality: "서초구",
        addressRegion: "서울특별시",
        addressCountry: "KR",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Glovek",
      description: DESC,
      publisher: { "@id": `${SITE_URL}/#org` },
      inLanguage: "ko-KR",
    },
    {
      "@type": "SoftwareApplication",
      name: "Glovek",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: [
        { "@type": "Offer", name: "Basic", price: "0", priceCurrency: "KRW" },
        { "@type": "Offer", name: "Pro", price: "89000", priceCurrency: "KRW" },
      ],
      description: DESC,
      publisher: { "@id": `${SITE_URL}/#org` },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Glovek는 어떤 서비스인가요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Glovek는 K-뷰티 브랜드의 실제 틱톡 콘텐츠를 브랜드·콘텐츠·인플루언서별로 분석하는 B2B SaaS입니다. 바이럴 콘텐츠 레퍼런스, 검증된 어필리에이트 인플루언서, 브랜드 성장 리포트를 제공합니다.",
          },
        },
        {
          "@type": "Question",
          name: "요금제는 어떻게 되나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "무료 Basic, 월 ₩89,000 Pro(결제 즉시 이용·매월 자동결제), 월 ₩159,000 Advance로 구성됩니다. Pro는 콘텐츠 열람과 인플루언서 DB, 브랜드 리포트를 제공합니다.",
          },
        },
        {
          "@type": "Question",
          name: "틱톡샵 온보딩도 지원하나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "네. 상단 '틱톡샵 입점' 탭에서 틱톡샵 멀티몰 온보딩 패스트트랙을 신청할 수 있습니다. 회원가입 후 최소 정보 입력과 결제를 거쳐 입점 절차가 진행됩니다.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>
        <PlanProvider>
          <BookmarkProvider>
            <UtmTracker />
            <TopBanner />
            {children}
          </BookmarkProvider>
        </PlanProvider>
      </body>
    </html>
  );
}

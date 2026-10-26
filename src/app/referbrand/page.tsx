import type { Metadata } from "next";
import SiteHeader from "@/components/ktrend/SiteHeader";
import SiteFooter from "@/components/ktrend/SiteFooter";
import ReferBrandGallery from "@/components/ktrend/ReferBrandGallery";

export const metadata: Metadata = {
  title: "국가별 TikTok Shop 실제 예시 — 디노스튜디오",
  description:
    "디노스튜디오가 함께한 브랜드의 국가별 TikTok Shop 상품·매장 페이지 실제 예시. 브랜드 검색·국가 필터로 실제 판매 화면으로 이동합니다. 실제 구매 화면 예시이며 매출 성과·입점 승인을 보장하지 않습니다.",
  alternates: { canonical: "/referbrand" },
};

export default function ReferBrandPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--fg)]">
      <SiteHeader />
      <div className="flex-1">
        <ReferBrandGallery />
      </div>
      <SiteFooter />
    </div>
  );
}

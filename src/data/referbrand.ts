// 국가별 TikTok Shop 실제 예시(/referbrand) 공개 데이터.
// 실제 구매 화면 예시이며 매출 성과·입점 승인을 보장하지 않습니다.
// ⚠️ 모바일 세로 캡처는 별도로 확보 중 — 전달 전까지 이미지 없이 "모바일 화면 확인 중"으로 표기하고
//    원본 링크를 먼저 제공합니다. 기존 PC 화면 이미지는 사용하지 않습니다. 내부 CRM/판매 추정값 없음.

export type ReferBrandCountry = "미국" | "태국";

export interface ReferBrandItem {
  id: string;
  name: string;
  country: ReferBrandCountry;
  productUrl: string | null; // 실제 상품 페이지(보존된 원본 링크)
  storeUrl: string | null; // 실제 매장 페이지(있는 경우)
  // mobile_pending: 링크 있음 · 모바일 세로 캡처 확인 중
  // address_pending: 판매 주소(URL) 확인 대기 — 가짜 링크를 만들지 않음
  status: "mobile_pending" | "address_pending";
  // 모바일 세로 캡처(확보되면 경로 입력). 지금은 전부 null.
  mobileImage: string | null;
}

export const REFERBRAND_ITEMS: ReferBrandItem[] = [
  { id: "roatti", name: "로아띠 ROATTI", country: "미국", productUrl: "https://shop.tiktok.com/us/pdp/1732702812517667590", storeUrl: "https://shop.tiktok.com/us/store/roatti/8658616013215470342", status: "mobile_pending", mobileImage: null },
  { id: "wellderma", name: "웰더마", country: "미국", productUrl: "https://shop.tiktok.com/us/pdp/1732614472064275073", storeUrl: null, status: "mobile_pending", mobileImage: null },
  { id: "fau", name: "파우 FAU", country: "미국", productUrl: "https://shop.tiktok.com/us/pdp/1732583802859066099", storeUrl: "https://shop.tiktok.com/us/store/fau-us/8657707449288921843", status: "mobile_pending", mobileImage: null },
  { id: "peeven", name: "피븐 PEEVEN", country: "미국", productUrl: "https://shop.tiktok.com/us/pdp/1732664696485941375", storeUrl: null, status: "mobile_pending", mobileImage: null },
  { id: "returnu", name: "리터뉴 RETURNU", country: "미국", productUrl: "https://shop.tiktok.com/us/pdp/1732519141878305447", storeUrl: null, status: "mobile_pending", mobileImage: null },
  { id: "abso", name: "앱소 Abso", country: "미국", productUrl: "https://shop.tiktok.com/us/pdp/1732620854923268851", storeUrl: null, status: "mobile_pending", mobileImage: null },
  { id: "goryo", name: "고려공작1392", country: "미국", productUrl: "https://shop.tiktok.com/us/pdp/1732456382416654397", storeUrl: null, status: "mobile_pending", mobileImage: null },
  { id: "exomera", name: "엑소메라 EXOMERA", country: "미국", productUrl: "https://shop.tiktok.com/us/pdp/1732552600038118073", storeUrl: null, status: "mobile_pending", mobileImage: null },
  { id: "verries", name: "VERRIES", country: "태국", productUrl: null, storeUrl: null, status: "address_pending", mobileImage: null },
];

export const REFERBRAND_COUNTRIES: ReferBrandCountry[] = ["미국", "태국"];

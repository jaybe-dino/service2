// 브랜드 공식 계정 판별 — 공식/플래그십/샵 계정 콘텐츠·계정은 리스팅에서 제외한다.
import { BRANDS } from "./brands";

const BRAND_TOKENS = Array.from(
  new Set(
    BRANDS.map((b) => b.name.toLowerCase().replace(/[^a-z0-9]/g, "")).filter((t) => t.length >= 4),
  ),
);

// 명백한 공식/샵 키워드
const OFFICIAL_KW = /official|tiktokshop|flagship|brandstore|globalstore/;
// 브랜드명 뒤에 붙는 공식 접미사
const SUFFIX_KW = /^(official|store|shop|global|korea|kr|us|uk|sg|th|vn|ph|my|jp|id)$|^(official|store|globalofficial|koreaofficial)/;

export function isOfficialHandle(handle: string): boolean {
  if (!handle) return false;
  const h = handle.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (OFFICIAL_KW.test(h)) return true;
  for (const t of BRAND_TOKENS) {
    if (h === t) return true; // 브랜드명 그 자체 = 공식
    if (h.startsWith(t)) {
      const rest = h.slice(t.length);
      if (rest === "" || SUFFIX_KW.test(rest)) return true;
    }
  }
  return false;
}

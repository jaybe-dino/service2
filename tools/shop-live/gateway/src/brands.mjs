// 허용 브랜드 목록: tools/shop-viewer/data.json 에서 "미국" + 검증된 상품 URL 형식만 추린다.
// 내비게이션은 이 목록의 brandId 로만 가능하며, 사용자가 URL 을 직접 넘길 수 있는 경로는 없다.
import { readFileSync } from "node:fs";

const ID_RE = /^[a-z0-9][a-z0-9-]{0,40}$/;
// shop.tiktok.com/us/pdp/<숫자 id> 형식만 허용 (쿼리/해시/사용자정보/포트 금지)
const PDP_RE = /^\/us\/pdp\/\d{10,25}$/;

export function isAllowedProductUrl(raw) {
  if (typeof raw !== "string") return false;
  let u;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  return (
    u.protocol === "https:" &&
    u.hostname === "shop.tiktok.com" &&
    u.port === "" &&
    u.username === "" &&
    u.password === "" &&
    u.search === "" &&
    u.hash === "" &&
    PDP_RE.test(u.pathname) &&
    u.href === raw
  );
}

// data 객체 → Map<id, {id, name, company, productUrl}>
export function buildAllowlist(data) {
  const items = data && Array.isArray(data.items) ? data.items : [];
  const out = new Map();
  for (const it of items) {
    if (!it || typeof it !== "object") continue;
    if (it.country !== "미국") continue; // 태국 등은 판매 URL 미확보 → 동작 대상 아님
    if (typeof it.id !== "string" || !ID_RE.test(it.id)) continue;
    if (!isAllowedProductUrl(it.productUrl)) continue;
    if (out.has(it.id)) continue;
    out.set(it.id, {
      id: it.id,
      name: String(it.name || it.id),
      company: it.company ? String(it.company) : null,
      productUrl: it.productUrl,
    });
  }
  return out;
}

export function loadAllowlist(path) {
  return buildAllowlist(JSON.parse(readFileSync(path, "utf8")));
}

// 공개 API 공용 — 토큰 인증 · CORS · 브랜드→카테고리 매핑.
import { NextResponse } from "next/server";
import { BRANDS, normKey } from "@/data/ktrend/brands";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};
export const jcors = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: CORS });

export const CATEGORIES = ["skincare", "makeup", "haircare"] as const;
// 브랜드명(정규화) → 카테고리
export const BRAND_CAT = new Map(BRANDS.map((b) => [normKey(b.name), b.category]));
export function categoryOf(brandName: string | null | undefined): string | null {
  if (!brandName) return null;
  return BRAND_CAT.get(normKey(brandName)) || null;
}
// 요청 카테고리 → 해당 카테고리 브랜드명 목록(소문자)
export function brandNamesForCategories(cats: string[]): string[] {
  const want = new Set(cats.filter((c) => (CATEGORIES as readonly string[]).includes(c)));
  return BRANDS.filter((b) => want.has(b.category)).map((b) => b.name.toLowerCase());
}

export function publicTokenConfigured(): boolean {
  return Boolean((process.env.PUBLIC_API_TOKEN || process.env.CREATORS_EXPORT_TOKEN || "").trim());
}
export function tokenOk(req: Request): boolean {
  const expected = (process.env.PUBLIC_API_TOKEN || process.env.CREATORS_EXPORT_TOKEN || "").trim();
  if (!expected) return false;
  const u = new URL(req.url);
  const q = (u.searchParams.get("token") || "").trim();
  const h = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return q === expected || h === expected;
}

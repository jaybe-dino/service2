import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 소개자료(서비스 소개서) 리다이렉트 — glovek.space/deck → 구글 슬라이드.
// URL은 env(NEXT_PUBLIC_GLOVEK_DECK_URL)로 교체 가능. 미설정 시 기본값.
const DECK_URL = process.env.NEXT_PUBLIC_GLOVEK_DECK_URL
  || "https://docs.google.com/presentation/d/1zUGsHZ9pIbupXZsGTdDx1okGRJX5Sdwg/edit?usp=sharing&ouid=109035759419679315158&rtpof=true&sd=true";

export function GET() {
  return NextResponse.redirect(DECK_URL, {
    status: 302,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}

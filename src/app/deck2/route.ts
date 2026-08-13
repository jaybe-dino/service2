import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// deck2 소개 자료(비공개) — 외부 호스팅(Google Drive) 리다이렉트.
// 대용량 번들은 repo에 넣지 않고 URL만 유지 → 레포 경량 유지.
const TARGET =
  process.env.NEXT_PUBLIC_DECK2_URL ||
  "https://drive.google.com/file/d/1Sf2PBJCkfvnsiBnI8FzW_CbaG4vT7DZa/view";

export function GET() {
  return NextResponse.redirect(TARGET, {
    status: 302,
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}

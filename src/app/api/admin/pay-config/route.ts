import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 진단용(관리자) — 배포된 앱이 실제로 쓰는 NicePay 설정을 확인. NicePay KEY 대시보드와 대조용.
// clientKey는 요청 Basic 인증에 포함되는 반공개 식별자라 노출(대조 목적). secretKey는 마스킹.
function mask(s: string): string {
  if (!s) return "(빈값)";
  if (s.length <= 10) return `${s[0]}…(len ${s.length})`;
  return `${s.slice(0, 6)}…${s.slice(-4)} (len ${s.length})`;
}

export async function GET() {
  if (!(await isAdminAuthed())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ck = process.env.NICEPAY_CLIENT_KEY || "";
  const sk = process.env.NICEPAY_SECRET_KEY || "";
  return NextResponse.json({
    apiBase: process.env.NICEPAY_API_BASE || "https://api.nicepay.co.kr",
    clientKey: ck,                 // 대시보드의 클라이언트 키와 '글자 그대로' 일치하는지 대조
    secretKeyMasked: mask(sk),     // 앞6…뒤4 + 길이
    secretKeyLen: sk.length,       // 32면 AES-256(A2) 후보
    encMode: process.env.NICEPAY_ENC_MODE || "(미설정 = AES-128)",
    configured: Boolean(ck && sk),
    note: "clientKey가 NicePay KEY 대시보드의 어느 쌍과 일치하는지 확인. 일치하는 게 없으면 Vercel 키가 잘못 들어간 것.",
  });
}

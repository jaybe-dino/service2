// 공개 X — 관리자 로그인 상태에서만 열람. 서버에서 세션 확인 후 문서 렌더.
import Link from "next/link";
import { isAdminAuthed } from "@/lib/admin-auth";
import DevDocsClient from "./DevDocsClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DevDocsPage() {
  const authed = await isAdminAuthed();
  if (!authed) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#faf9fc] p-6 text-slate-800">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#f2ecfe] text-[#7c3aed] text-[20px]">🔒</div>
          <h1 className="mt-3 text-[17px] font-black">개발 문서 · 관리자 전용</h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500">
            이 문서는 관리자 로그인 후에 열람할 수 있습니다. 관리자 콘솔에서 로그인한 뒤 다시 접속해 주세요.
          </p>
          <Link href="/admin" className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#7c3aed] px-5 py-2.5 text-[13px] font-bold text-white hover:opacity-95">
            관리자 로그인
          </Link>
          <p className="mt-3 text-[11px] text-slate-400">로그인 후 <span className="font-mono">/dev-docs</span> 재접속</p>
        </div>
      </div>
    );
  }
  return <DevDocsClient />;
}

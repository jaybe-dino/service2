"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Users, Inbox, Loader2 } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import { usePlan } from "@/components/ktrend/PlanContext";
import { apiAdminMembers, type AdminMember, type AdminInquiry } from "@/lib/client-api";
import { loadMembers } from "@/data/ktrend/accounts";
import { BRANDS } from "@/data/ktrend/brands";
import { INFLUENCERS } from "@/data/ktrend/influencers";
import { loadContent, fmtCompact } from "@/data/ktrend/content";

const KIND_LABEL: Record<string, string> = {
  marketing: "마케팅 1:1",
  tiktokshop: "틱톡샵 온보딩",
  proposal: "인플루언서 제안",
  sales: "도입 문의",
};

export default function AdminPage() {
  const { user, isAdmin, serverMode } = usePlan();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [contentCount, setContentCount] = useState(0);

  useEffect(() => {
    if (isAdmin) loadContent().then((all) => setContentCount(all.length));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    if (serverMode) {
      apiAdminMembers().then((r) => {
        if (!r.ok) setErr(r.error ?? "권한 오류");
        setMembers(r.members);
        setInquiries(r.inquiries);
        setLoading(false);
      });
    } else {
      const local = loadMembers().map((m) => ({
        id: m.id, email: m.email, name: m.name, brand: m.brand ?? null,
        role: m.role ?? null, plan: m.plan, pro_until: m.proUntil ?? 0,
        created_at: "(데모)",
      }));
      setMembers(local);
      setLoading(false);
    }
  }, [isAdmin, serverMode]);

  if (!user || !isAdmin) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldCheck className="mx-auto text-[var(--muted)]" />
          <h1 className="mt-3 text-[18px] font-black">회원관리 (관리자)</h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">관리자 계정으로 로그인해야 합니다.</p>
          <Link href="/login" className="kt-btn kt-btn-primary mt-4 px-5 py-2 text-[12px]">로그인</Link>
          <p className="mt-3 text-[10px] text-[var(--muted)]">데모 관리자: admin@ktrend.demo / ktrend2026</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="mb-1 flex items-center gap-2 text-[20px] font-black tracking-tight">
        <ShieldCheck size={18} className="text-[var(--accent)]" /> 회원관리 어드민
      </h1>
      <p className="mb-5 text-[12px] text-[var(--muted)]">
        {serverMode ? "Postgres 연동 — 실시간 가입자·문의" : "데모 모드 — 로컬 가입자만 표시 (DB 연결 시 전체)"}
      </p>
      {err && <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-600">{err}</p>}

      {/* 데이터 현황 (관리자 전용) */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { l: "추적 브랜드", v: `${BRANDS.length}` },
          { l: "분석 콘텐츠", v: contentCount ? fmtCompact(contentCount) : "…" },
          { l: "인플루언서", v: fmtCompact(INFLUENCERS.length) },
          { l: "가입 회원", v: `${members.length}` },
        ].map((s) => (
          <div key={s.l} className="kt-card p-4">
            <div className="text-[11px] text-[var(--muted)]">{s.l}</div>
            <div className="mt-1 text-[20px] font-black text-[var(--accent)]">{s.v}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-[var(--muted)]"><Loader2 className="animate-spin" size={16} /> 로딩…</div>
      ) : (
        <>
          <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-bold"><Users size={14} /> 가입 회원 ({members.length})</h2>
          <div className="mb-6 kt-card overflow-x-auto">
            <table className="w-full min-w-[720px] text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase text-[var(--muted)]">
                  <th className="p-3">이메일</th><th className="p-3">이름</th><th className="p-3">브랜드</th>
                  <th className="p-3">직무</th><th className="p-3">플랜</th><th className="p-3">체험</th><th className="p-3">가입일</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 font-semibold">{m.email}</td>
                    <td className="p-3">{m.name}</td>
                    <td className="p-3">{m.brand ?? "—"}</td>
                    <td className="p-3 text-[var(--muted)]">{m.role ?? "—"}</td>
                    <td className="p-3"><span className="kt-badge-brand">{m.plan}</span></td>
                    <td className="p-3 text-[var(--muted)]">{Number(m.pro_until) > Date.now() ? "Pro 체험중" : "—"}</td>
                    <td className="p-3 text-[var(--muted)]">{typeof m.created_at === "string" ? m.created_at.slice(0, 10) : ""}</td>
                  </tr>
                ))}
                {!members.length && <tr><td colSpan={7} className="p-6 text-center text-[var(--muted)]">가입 회원 없음</td></tr>}
              </tbody>
            </table>
          </div>

          <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-bold"><Inbox size={14} /> 문의 ({inquiries.length})</h2>
          <div className="kt-card overflow-x-auto">
            <table className="w-full min-w-[480px] text-[11px]">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase text-[var(--muted)]">
                  <th className="p-3">유형</th><th className="p-3">보낸 사람</th><th className="p-3">시각</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((q) => (
                  <tr key={q.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3"><span className="kt-badge-brand">{KIND_LABEL[q.kind] ?? q.kind}</span></td>
                    <td className="p-3">{q.user_email ?? "—"}</td>
                    <td className="p-3 text-[var(--muted)]">{q.created_at?.slice(0, 16).replace("T", " ")}</td>
                  </tr>
                ))}
                {!inquiries.length && <tr><td colSpan={3} className="p-6 text-center text-[var(--muted)]">문의 없음</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageShell>
  );
}

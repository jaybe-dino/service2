"use client";

// 공개 개발 문서 — /dev-docs. 개발 현황·가이드·외부 API + 매일 자정(KST) 자동 변경로그.
// 누구나 열람(무인증). 정적 현황은 src/data/dev-status.ts, 로그는 dev_changelog(크론 자동).
import { useEffect, useState } from "react";
import { DEV_STATUS, DEV_UPDATED_AT } from "@/data/dev-status";

interface Log { date: string; kind: string; sha: string | null; title: string; body: string; at: string }

export default function DevDocsClient() {
  const [logs, setLogs] = useState<Log[] | null>(null);
  useEffect(() => {
    fetch("/api/dev-log").then((r) => r.json()).then((d) => setLogs(Array.isArray(d.logs) ? d.logs : [])).catch(() => setLogs([]));
  }, []);

  return (
    <div style={{ background: "var(--bg)", color: "var(--fg)" }} className="min-h-screen">
      <style>{`
        :root{--bg:#faf9fc;--fg:#1a1622;--sub:#5c556a;--faint:#8a8398;--line:#e9e4f1;--card:#fff;--accent:#7c3aed;--accent-w:#f2ecfe;--mono:ui-monospace,"SF Mono",Menlo,monospace}
        @media(prefers-color-scheme:dark){:root{--bg:#0c0a12;--fg:#f2eff8;--sub:#a79fb8;--faint:#7c748c;--line:#282234;--card:#151121;--accent:#a585ff;--accent-w:#241c3b}}
      `}</style>
      <div className="mx-auto max-w-[880px] px-5 py-10">
        <header className="mb-8 border-b pb-6" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
            <span>Glovek</span><span style={{ color: "var(--faint)" }}>· Developer Docs</span>
          </div>
          <h1 className="mt-2 text-[26px] font-black tracking-tight">개발 현황 · 가이드 · 외부 API</h1>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: "var(--sub)" }}>
            Glovek(glovek.space) 개발 현황과 외부 연동(API) 문서입니다. 개발 로그는 <b>매일 자정(KST)</b> 배포 기준으로 자동 갱신됩니다.
          </p>
          <div className="mt-2 text-[11px]" style={{ color: "var(--faint)" }}>현황 문서 업데이트: {DEV_UPDATED_AT} · 자동 개발 로그 아래 참조</div>
        </header>

        {/* 개발 로그 (자동) */}
        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-black">📓 개발 로그 <span className="text-[11px] font-normal" style={{ color: "var(--faint)" }}>· 매일 자정 자동 · 최근 100건</span></h2>
          {logs === null ? (
            <p className="text-[12px]" style={{ color: "var(--faint)" }}>불러오는 중…</p>
          ) : logs.length === 0 ? (
            <p className="rounded-lg border border-dashed p-5 text-center text-[12px]" style={{ borderColor: "var(--line)", color: "var(--faint)" }}>
              아직 자동 기록된 로그가 없습니다. 첫 로그는 오늘 자정(KST) 크론 실행 시 생성됩니다.
            </p>
          ) : (
            <div className="relative pl-4" style={{ borderLeft: "2px solid var(--line)" }}>
              {logs.map((l, i) => (
                <div key={i} className="relative mb-4">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full" style={{ background: l.kind === "note" ? "var(--accent)" : "var(--faint)" }} />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px]" style={{ color: "var(--accent)" }}>{l.date}</span>
                    {l.kind === "note" && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "var(--accent-w)", color: "var(--accent)" }}>메모</span>}
                    {l.sha && <span className="font-mono text-[10px]" style={{ color: "var(--faint)" }}>{l.sha}</span>}
                  </div>
                  <div className="mt-0.5 text-[13px] font-semibold">{l.title}</div>
                  {l.body && <div className="mt-0.5 text-[12px] leading-relaxed" style={{ color: "var(--sub)" }}>{l.body}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 정적 현황 섹션 */}
        {DEV_STATUS.map((s) => (
          <section key={s.id} className="mb-9">
            <h2 className="mb-3 text-[15px] font-black">{s.title}</h2>
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)", background: "var(--card)" }}>
              {s.items.map((it, i) => (
                <div key={i} className="grid grid-cols-[130px_1fr] gap-3 border-b px-4 py-3 last:border-0" style={{ borderColor: "var(--line)" }}>
                  <div className="text-[12px] font-bold">{it.h}</div>
                  <div className="text-[12px] leading-relaxed" style={{ color: "var(--sub)" }}>{it.d}</div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <footer className="mt-12 border-t pt-6 text-[11px]" style={{ borderColor: "var(--line)", color: "var(--faint)" }}>
          <p>© Glovek · 개발 문서 (공개). 상세 스키마/핸드오버: 리포지토리 <span className="font-mono">HANDOVER.md</span> · <span className="font-mono">docs/integration/</span></p>
          <p className="mt-1">보안: 이 문서에는 시크릿 값·고객 개인정보가 포함되지 않습니다(환경변수는 이름만).</p>
        </footer>
      </div>
    </div>
  );
}

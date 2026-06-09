"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Lock, Sparkles, Target, Megaphone, Users, TrendingUp } from "lucide-react";
import { usePlan } from "./PlanContext";
import { BRAND_MAP } from "@/data/ktrend/brands";
import { CATEGORY_MAP } from "@/data/ktrend/meta";
import { loadContent, fmtCompact, type Content } from "@/data/ktrend/content";
import { analyzeContent, similarContent } from "@/data/ktrend/analysis";

export default function ContentAnalysisModal({
  content,
  onClose,
}: {
  content: Content;
  onClose: () => void;
}) {
  const { isPro } = usePlan();
  const brand = BRAND_MAP[content.brandId];
  const cat = CATEGORY_MAP[content.category];
  const a = analyzeContent(content);
  const [similar, setSimilar] = useState<Content[]>([]);

  useEffect(() => {
    loadContent().then((all) => setSimilar(similarContent(all, content)));
  }, [content]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto kt-thin-scroll rounded-xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="kt-badge-brand">{brand?.name}</span>
              <span className="text-[10px] text-[var(--muted)]">{cat?.icon} {cat?.nameKo}</span>
            </div>
            <h3 className="mt-1 flex items-center gap-1.5 text-[15px] font-bold">
              <Sparkles size={16} className="text-[var(--accent)]" /> 콘텐츠 후킹·소구점 분석
            </h3>
            <p className="text-[10px] text-[var(--muted)]">@{content.influencerId} · {content.date} · 조회 {fmtCompact(content.views)}</p>
          </div>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)]"><X size={18} /></button>
        </div>

        <div className="relative">
          <div className={isPro ? "" : "kt-locked"}>
            <Section icon={<Target size={14} />} title={`후킹 포인트 (${a.hookWindow})`}>
              <ul className="space-y-1">
                {a.hooks.map((h, i) => (
                  <li key={i} className="flex gap-1.5 text-[12px]"><span className="text-[var(--accent)]">›</span> {h}</li>
                ))}
              </ul>
            </Section>
            <Section icon={<Megaphone size={14} />} title="핵심 소구점 (USP)">
              <ul className="space-y-1">
                {a.usp.map((h, i) => (
                  <li key={i} className="flex gap-1.5 text-[12px]"><span className="text-[var(--accent)]">›</span> {h}</li>
                ))}
              </ul>
            </Section>
            <div className="grid grid-cols-2 gap-2">
              <Mini icon={<Users size={13} />} label="타깃 청중" value={a.audience} />
              <Mini icon={<TrendingUp size={13} />} label="전환 CTA" value={a.cta} />
            </div>
            <Section icon={<Sparkles size={14} />} title="실행 추천">
              <p className="text-[12px]">{a.recommend}</p>
            </Section>
          </div>

          {!isPro && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-white/55 backdrop-blur-[1px]">
              <span className="flex items-center gap-1.5 rounded-full bg-[var(--fg)]/85 px-3 py-1.5 text-[11px] font-bold text-white">
                <Lock size={12} /> 유료 기능 — Pro에서 전체 분석
              </span>
              <Link href="/plans" className="kt-btn kt-btn-primary px-4 py-1.5 text-[11px]">Pro 보기</Link>
            </div>
          )}
        </div>

        {/* 유사 콘텐츠 (유료) */}
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <h4 className="mb-2 text-[12px] font-bold">유사 고성과 콘텐츠</h4>
          {isPro ? (
            <div className="grid grid-cols-3 gap-2">
              {similar.map((s) => (
                <a
                  key={s.id}
                  href={s.tiktokUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="block overflow-hidden rounded-md border border-[var(--border)]"
                >
                  <div
                    className="flex aspect-[9/16] items-end p-1.5 text-[8px] font-bold text-white"
                    style={{ background: `linear-gradient(160deg, hsl(${s.hue} 60% 50%), hsl(${(s.hue + 40) % 360} 55% 38%))` }}
                  >
                    {fmtCompact(s.views)} · {s.engagementRate}%
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-[11px] text-[var(--muted)]">
              유사 콘텐츠 추천은 Pro/Add-on에서 제공됩니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center gap-1.5 text-[12px] font-bold text-[var(--accent)]">{icon} {title}</div>
      {children}
    </div>
  );
}
function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md bg-[var(--accent-light)]/60 p-2">
      <div className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold text-[var(--muted)]">{icon} {label}</div>
      <div className="text-[11px] font-semibold">{value}</div>
    </div>
  );
}

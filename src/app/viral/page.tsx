"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CalendarClock, Loader2, Zap } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";
import ContentCard from "@/components/ktrend/ContentCard";
import ViewPassBar from "@/components/ktrend/ViewPassBar";
import { BRAND_MAP } from "@/data/ktrend/brands";
import { CATEGORY_MAP } from "@/data/ktrend/meta";
import { loadContent, fmtCompact, sortContent, type Content } from "@/data/ktrend/content";

const levelStyle: Record<string, string> = {
  high: "border-rose-300 bg-rose-50 text-rose-700",
  mid: "border-amber-300 bg-amber-50 text-amber-700",
  low: "border-sky-300 bg-sky-50 text-sky-700",
};

export default function ViralPage() {
  const [content, setContent] = useState<Content[] | null>(null);
  useEffect(() => { loadContent().then(setContent); }, []);

  const topViral = useMemo(() => (content ? sortContent(content, "viral").slice(0, 12) : []), [content]);

  const signals = useMemo(
    () =>
      topViral.slice(0, 5).map((c, i) => {
        const brand = BRAND_MAP[c.brandId];
        const cat = CATEGORY_MAP[c.category];
        const surge = 120 + ((c.viralScore * 3) % 280);
        return {
          id: c.id,
          level: c.viralScore >= 90 ? "high" : i % 2 === 0 ? "mid" : "low",
          text: `${brand?.name} ${cat?.nameKo} 콘텐츠 @${c.influencerId} 조회수 ${surge}% 급증!`,
          sub: `누적 ${fmtCompact(c.views)} 조회 · 참여율 ${c.engagementRate}% · 추정 ROAS ${c.estRoasX}x`,
        };
      }),
    [topViral],
  );

  return (
    <PageShell>
      <div className="mb-4">
        <h1 className="text-[20px] font-black tracking-tight">실시간 바이럴 감지</h1>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          틱톡 내 급증 트래픽과 신규 바이럴 영상을 감지하여 즉시 대응 전략을 제안합니다.
        </p>
      </div>

      <ViewPassBar />

      <div className="mb-4 flex items-center gap-3 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-light)] px-4 py-3">
        <CalendarClock className="text-[var(--accent)]" size={18} />
        <p className="text-[12px]">
          <span className="font-bold">정기 업데이트:</span> 매주 <b>월요일·목요일 오전 9시</b> 주간 바이럴 통합 분석 알림을 발송합니다.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-2 flex items-center gap-1.5 text-[14px] font-bold">
            <Zap size={15} className="text-rose-500" /> 실시간 바이럴 시그널
          </h2>
          {!content ? (
            <div className="flex items-center justify-center gap-2 py-12 text-[var(--muted)]"><Loader2 className="animate-spin" size={16} /> 분석 중…</div>
          ) : (
            <div className="space-y-2">
              {signals.map((s) => (
                <div key={s.id} className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${levelStyle[s.level]}`}>
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[12px] font-bold">{s.text}</div>
                    <div className="text-[10px] opacity-80">{s.sub}</div>
                  </div>
                  <button className="kt-btn ml-auto bg-white/70 px-2.5 py-1 text-[10px] font-bold">대응 크리에이터 매칭</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="kt-card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-[14px] font-bold">
            <Bell size={15} className="text-[var(--accent)]" /> 이슈 감지 조건
          </h2>
          <div className="space-y-3 text-[11px]">
            <Condition label="조회수 상승률 임계값" value="200%" />
            <Condition label="댓글 반응 속도" value="시간당 50+" />
            <Condition label="바이럴 점수 기준" value="80 이상" />
            <Condition label="알림 채널" value="이메일 · 슬랙" />
          </div>
          <button className="kt-btn kt-btn-primary mt-4 w-full py-2 text-[11px]">감지 조건 저장</button>
        </div>
      </div>

      <h2 className="mb-2 mt-6 text-[14px] font-bold">급상승 콘텐츠 Top 12</h2>
      {!content ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[var(--muted)]"><Loader2 className="animate-spin" size={16} /> 로딩 중…</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {topViral.map((c) => (
            <ContentCard key={c.id} content={c} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function Condition({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 last:border-0">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-bold text-[var(--fg)]">{value}</span>
    </div>
  );
}

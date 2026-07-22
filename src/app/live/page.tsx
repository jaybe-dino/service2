"use client";

// 라이브 커머스·셀러타입 — 신규(롤백 가능). 메뉴 비노출, /live 직접 접근 전용.
// P3: 별도 라이브 스트림 수집 액터(LIVE_ACTOR) 연동 후 채워짐. 현재는 로드맵/체계 안내.
import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import { Radio, Info, Store, Package, Film } from "lucide-react";

export default function LivePage() {
  return (
    <PageShell>
      <div className="mx-auto max-w-4xl">
        <div className="mb-1 flex items-center gap-2">
          <Radio size={20} className="text-[var(--accent)]" />
          <h1 className="text-[22px] font-black tracking-tight">라이브 커머스</h1>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">준비 중</span>
        </div>
        <p className="mb-4 text-[12px] text-[var(--muted)]">TikTok Shop 라이브 방송·셀러타입(개별 셀러/공식/파트너) 분석 트랙.</p>

        <div className="rounded-2xl border border-dashed border-[var(--border)] p-6">
          <p className="text-[13px] font-bold">라이브·셀러타입 분석은 별도 수집 액터 연동 후 활성화됩니다.</p>
          <ul className="mt-3 grid gap-1.5 text-[12px] text-[var(--muted)]">
            <li>• 라이브 방송별 시청자·판매·객단가·최다 판매 제품</li>
            <li>• 셀러타입(개별 셀러 / 공식몰 / 파트너) 구분 랭킹</li>
            <li>• 브랜드별 라이브 빈도·매출 기여</li>
          </ul>
          <p className="mt-4 flex items-start gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-[var(--muted)]">
            <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
            연동 방법: 라이브 수집 액터 ID를 <code className="rounded bg-slate-100 px-1">LIVE_ACTOR</code> 환경변수로 지정하면 수집 파이프라인(collect-live)이 활성화됩니다. 현재는 제품/샵/영상 트랙이 우선 운영됩니다.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/products" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"><Package size={14} /> 제품 랭킹</Link>
          <Link href="/shops" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"><Store size={14} /> 샵 랭킹</Link>
          <Link href="/videos" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"><Film size={14} /> 바이럴 영상</Link>
        </div>
      </div>
    </PageShell>
  );
}

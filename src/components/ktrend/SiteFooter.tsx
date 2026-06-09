import Link from "next/link";
import { SERVICE } from "@/data/ktrend/meta";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--accent-light)]/40">
      <div className="mx-auto max-w-[1480px] px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-[15px] font-black">
              K-Trend<span className="text-[var(--accent)]"> Analytics</span>
            </div>
            <p className="mt-2 max-w-md text-[12px] leading-relaxed text-[var(--muted)]">
              {SERVICE.tagline}. 미국·태국·베트남·필리핀·말레이시아·싱가포르 6개국 틱톡 샵에서
              바이럴되는 K-뷰티 콘텐츠를 브랜드·콘텐츠·인플루언서별로 분석합니다.
            </p>
            <p className="mt-3 text-[11px] font-semibold text-[var(--accent)]">
              {SERVICE.updateNote}
            </p>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
              제품
            </div>
            <ul className="space-y-1.5 text-[12px]">
              <li><Link href="/explorer" className="hover:text-[var(--accent)]">콘텐츠 탐색기</Link></li>
              <li><Link href="/influencers" className="hover:text-[var(--accent)]">인플루언서 DB</Link></li>
              <li><Link href="/reports" className="hover:text-[var(--accent)]">브랜드 성장 리포트</Link></li>
              <li><Link href="/viral" className="hover:text-[var(--accent)]">실시간 바이럴 감지</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
              회사
            </div>
            <ul className="space-y-1.5 text-[12px]">
              <li><Link href="/plans" className="hover:text-[var(--accent)]">요금제</Link></li>
              <li><span className="text-[var(--muted)]">데이터: 틱톡 샵 오픈 DB + AI 예측 (V1)</span></li>
              <li><span className="text-[var(--muted)]">V2: 틱톡원 다이렉트 API 연동 예정</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-[var(--border)] pt-4 text-[10px] text-[var(--muted)]">
          © 2026 K-Trend Analytics. 본 화면의 지표는 데모용 샘플 데이터입니다. {SERVICE.version}
        </div>
      </div>
    </footer>
  );
}

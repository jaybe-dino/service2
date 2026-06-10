import Link from "next/link";
import { SERVICE } from "@/data/ktrend/meta";
import FooterCTAs from "./FooterCTAs";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--accent-light)]/40">
      <div className="mx-auto max-w-[1480px] px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-[16px] font-black kt-grad-text">Glovek</div>
            <p className="mt-2 max-w-md text-[12px] leading-relaxed text-[var(--muted)]">
              {SERVICE.tagline}. K-뷰티 브랜드의 실제 틱톡 콘텐츠를
              브랜드·콘텐츠·인플루언서별로 분석합니다.
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
              <li><Link href="/explorer" className="hover:text-[var(--accent)]">콘텐츠 레퍼런스</Link></li>
              <li><Link href="/influencers" className="hover:text-[var(--accent)]">인플루언서 DB</Link></li>
              <li><Link href="/reports" className="hover:text-[var(--accent)]">브랜드</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
              회사 · 정책
            </div>
            <ul className="space-y-1.5 text-[12px]">
              <li><Link href="/plans" className="hover:text-[var(--accent)]">요금제</Link></li>
              <li><Link href="/signup" className="hover:text-[var(--accent)]">회원가입</Link></li>
              <li><Link href="/terms" className="hover:text-[var(--accent)]">이용약관</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--accent)]">개인정보처리방침</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">문의</div>
          <FooterCTAs />
        </div>

        {/* 사업자 정보 (디노스튜디오) */}
        <div className="mt-8 border-t border-[var(--border)] pt-4 text-[10px] leading-relaxed text-[var(--muted)]">
          <p className="font-semibold text-[var(--fg)]">디노스튜디오 (DINOSTUDIO)</p>
          <p className="mt-1">
            대표 허정발 · 서울특별시 서초구 서초대로48길 101, 그룹메가타워 2F ·
            이메일 <a href="mailto:chief@dinostudio.kr" className="hover:text-[var(--accent)]">chief@dinostudio.kr</a> ·
            <a href="https://dinostudio.kr" target="_blank" rel="noreferrer noopener" className="ml-1 hover:text-[var(--accent)]">dinostudio.kr</a>
          </p>
          <p className="mt-2">
            <Link href="/terms" className="hover:text-[var(--accent)]">이용약관</Link>
            <span className="mx-1.5">·</span>
            <Link href="/privacy" className="font-semibold hover:text-[var(--accent)]">개인정보처리방침</Link>
          </p>
          <p className="mt-2">© 2026 DINOSTUDIO. Glovek. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

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
              <li><Link href="/explorer" className="hover:text-[var(--accent)]">콘텐츠 탐색기</Link></li>
              <li><Link href="/influencers" className="hover:text-[var(--accent)]">인플루언서 DB</Link></li>
              <li><Link href="/reports" className="hover:text-[var(--accent)]">브랜드</Link></li>
            </ul>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
              회사
            </div>
            <ul className="space-y-1.5 text-[12px]">
              <li><Link href="/plans" className="hover:text-[var(--accent)]">요금제</Link></li>
              <li><Link href="/signup" className="hover:text-[var(--accent)]">회원가입</Link></li>
              <li><Link href="/admin" className="hover:text-[var(--accent)]">회원관리(관리자)</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">문의</div>
          <FooterCTAs />
        </div>
        <div className="mt-8 border-t border-[var(--border)] pt-4 text-[10px] text-[var(--muted)]">
          © 2026 Glovek. 본 화면의 지표는 데모용 샘플 데이터입니다.
        </div>
      </div>
    </footer>
  );
}

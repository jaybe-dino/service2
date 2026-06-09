import Link from "next/link";
import { Sparkles } from "lucide-react";
import { TOTAL_BRANDS } from "@/data/ktrend/brands";
import { COUNTRIES } from "@/data/ktrend/meta";

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-bold text-slate-900">K-Trend Analytics</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {TOTAL_BRANDS}개 K-뷰티 브랜드의 글로벌 틱톡 콘텐츠를 한눈에 탐색하는
              콘텐츠 중심 분석 SaaS.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">제품</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link href="/" className="hover:text-slate-900">콘텐츠 탐색기</Link></li>
              <li><Link href="/influencers" className="hover:text-slate-900">인플루언서 DB</Link></li>
              <li><Link href="/reports" className="hover:text-slate-900">브랜드 성장 리포트</Link></li>
              <li><Link href="/viral" className="hover:text-slate-900">실시간 바이럴 감지</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">추적 국가</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              {COUNTRIES.map((c) => (
                <li key={c.code}>{c.flag} {c.nameKo} · 틱톡 샵 {c.shopLevel}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">회사</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link href="/plans" className="hover:text-slate-900">요금제</Link></li>
              <li><Link href="/viral" className="hover:text-slate-900">바이럴 감지</Link></li>
              <li><a href="mailto:hello@ktrend.io" className="hover:text-slate-900">문의하기</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row">
          <p>© 2026 K-Trend Analytics. 글로벌 K-뷰티 마케터를 위한 B2B SaaS.</p>
          <p>틱톡 샵 어필리에이트 지표는 추정치이며 실제 매출과 차이가 있을 수 있습니다.</p>
        </div>
      </div>
    </footer>
  );
}

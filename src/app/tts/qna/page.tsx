import Link from "next/link";
import PageShell from "@/components/ktrend/PageShell";
import QnaClient from "./QnaClient";
import { FAQ_API_URL, QNA_COMMON_NOTICE, QNA_CONSULT_HREF, guardStandaloneOnboarding, type FaqEntry } from "@/data/ktrend/qna";

// 관리자(admin.glovek.space) 승인 QnA를 런타임에 가져와 렌더 — 항상 최신 승인 답변 반영.
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Loaded { ok: boolean; entries: FaqEntry[]; updatedAt: string | null; error?: string }

async function loadFaq(): Promise<Loaded> {
  try {
    const res = await fetch(FAQ_API_URL, { next: { revalidate: 300 } });
    if (!res.ok) return { ok: false, entries: [], updatedAt: null, error: `HTTP ${res.status}` };
    const j = (await res.json()) as { ok?: boolean; entries?: FaqEntry[]; updatedAt?: string; error?: string };
    if (j.ok === false) return { ok: false, entries: [], updatedAt: null, error: j.error || "source error" };
    const entries = (Array.isArray(j.entries) ? j.entries.filter((e) => e && e.question && e.answer) : [])
      // 사업 조건 가드: '입점 준비·초기 세팅만 단독 제공' 취지 답변을 지정 문구로 대체(질문 유지)
      .map(guardStandaloneOnboarding);
    return { ok: true, entries, updatedAt: j.updatedAt ? j.updatedAt.slice(0, 10) : null };
  } catch (e) {
    return { ok: false, entries: [], updatedAt: null, error: String(e instanceof Error ? e.message : e).slice(0, 120) };
  }
}

export default async function TtsQnaPage() {
  const data = await loadFaq();
  const items = data.entries.map((e, i) => ({ ...e, id: i, cat: (e.category || "일반").trim() || "일반" }));

  // SEO/AEO: 구조화 데이터 — 실제 승인 문항 기준(없으면 미출력)
  const faqLd = items.length
    ? {
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })),
      }
    : null;

  // 로드 실패(소스 오류)와 빈 결과(승인 문항 0)를 구분
  if (!data.ok) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#1A56DB] p-7 text-white">
            <h1 className="text-[26px] font-black">TikTok Shop 입점·운영·마케팅 FAQ</h1>
          </div>
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-8 text-center">
            <p className="text-[14px] font-bold text-amber-800">FAQ를 불러오지 못했습니다.</p>
            <p className="mt-1 text-[12px] text-amber-700">일시적인 문제일 수 있습니다. 잠시 후 다시 시도해 주세요.</p>
            <Link href={QNA_CONSULT_HREF} className="mt-4 inline-flex rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[12px] font-bold text-white hover:bg-[var(--accent-deep)]">1:1 상담 신청</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  if (!items.length) {
    return (
      <PageShell>
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#1A56DB] p-7 text-white">
            <h1 className="text-[26px] font-black">TikTok Shop 입점·운영·마케팅 FAQ</h1>
          </div>
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-light)] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] font-semibold text-[var(--fg)]">{QNA_COMMON_NOTICE}</p>
            <Link href={QNA_CONSULT_HREF} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-bold text-white hover:bg-[var(--accent-deep)]">1:1 상담 신청</Link>
          </div>
          <div className="mt-6 rounded-xl border border-[var(--border)] bg-white px-5 py-12 text-center text-[13px] text-[var(--muted)]">등록된 FAQ가 아직 없습니다.</div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <QnaClient entries={items} updatedAt={data.updatedAt} />
    </PageShell>
  );
}

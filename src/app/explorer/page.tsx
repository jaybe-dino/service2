import PageShell from "@/components/ktrend/PageShell";
import Explorer from "@/components/ktrend/Explorer";
import ViewPassBar from "@/components/ktrend/ViewPassBar";

export default function ExplorerPage() {
  return (
    <PageShell>
      <div className="mb-4">
        <h1 className="text-[20px] font-black tracking-tight">틱톡 콘텐츠 탐색기</h1>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          K-뷰티 브랜드의 실제 틱톡 콘텐츠를 브랜드·콘텐츠·인플루언서별로 탐색하세요.
        </p>
      </div>
      <ViewPassBar />
      <Explorer />
    </PageShell>
  );
}

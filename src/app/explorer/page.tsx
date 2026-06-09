import PageShell from "@/components/ktrend/PageShell";
import Explorer from "@/components/ktrend/Explorer";

export default function ExplorerPage() {
  return (
    <PageShell>
      <div className="mb-4">
        <h1 className="text-[20px] font-black tracking-tight">틱톡 콘텐츠 탐색기</h1>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          미국·동남아 6개국 틱톡 샵에서 바이럴되는 K-뷰티 콘텐츠를 브랜드·콘텐츠·인플루언서별로 탐색하세요.
        </p>
      </div>
      <Explorer />
    </PageShell>
  );
}

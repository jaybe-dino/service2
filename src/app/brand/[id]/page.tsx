"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import PageShell from "@/components/ktrend/PageShell";

// 브랜드 상세는 /reports(브랜드)로 통합됨 — 해당 브랜드로 리다이렉트
export default function BrandRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/reports?brand=${id}`);
  }, [id, router]);
  return (
    <PageShell>
      <div className="py-24 text-center text-[var(--muted)]">
        <Loader2 className="mx-auto animate-spin" />
        <p className="mt-2 text-[12px]">브랜드 페이지로 이동 중…</p>
      </div>
    </PageShell>
  );
}

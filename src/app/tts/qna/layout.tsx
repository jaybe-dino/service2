import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TikTok Shop 입점·운영·마케팅 FAQ — GloveK",
  description: "틱톡샵 입점 준비(온보딩)·샵 운영·크리에이터 어필리에이트·콘텐츠 마케팅에 대해 자주 묻는 질문. 국가·제품·계약에 따라 범위가 달라집니다.",
  alternates: { canonical: "/tts/qna" },
};

export default function TtsQnaLayout({ children }: { children: React.ReactNode }) {
  return children;
}

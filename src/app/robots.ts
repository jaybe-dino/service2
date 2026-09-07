import type { MetadataRoute } from "next";

const SITE_URL = "https://glovek.space";

// AI 학습·수집 봇 차단 목록 (robots.txt 선언 — 신사적 봇 대상.
// 선언 무시 봇은 middleware.ts 의 User-Agent 강제 차단(403)이 2차 방어)
const AI_BOTS = [
  "GPTBot", "ChatGPT-User", "OAI-SearchBot",            // OpenAI
  "ClaudeBot", "Claude-Web", "Claude-User", "Claude-SearchBot", "anthropic-ai", // Anthropic
  "Google-Extended",                                     // Google AI 학습(검색은 유지)
  "Applebot-Extended",                                   // Apple AI
  "PerplexityBot", "Perplexity-User",                    // Perplexity
  "CCBot",                                               // Common Crawl
  "Bytespider",                                          // ByteDance
  "cohere-ai", "cohere-training-data-crawler",           // Cohere
  "meta-externalagent", "meta-externalfetcher", "FacebookBot", // Meta AI
  "Amazonbot", "AI2Bot", "Diffbot", "omgili", "omgilibot",
  "Timpibot", "YouBot", "DuckAssistBot", "MistralAI-User", "LinerBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // AI 봇 전면 차단
      ...AI_BOTS.map((bot) => ({ userAgent: bot, disallow: "/" })),
      // 일반 검색엔진(구글·빙 등)은 기존 정책 유지 — SEO 보존
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/checkout", "/mypage", "/tiktokmarketing", "/tiktoksit", "/tiktokmarketing3", "/tiktokshop", "/deck", "/deck2"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

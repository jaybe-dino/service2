import type { MetadataRoute } from "next";

const SITE_URL = "https://glovek.space";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
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

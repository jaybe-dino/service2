import type { MetadataRoute } from "next";

const SITE_URL = "https://glovek.space";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ["", "/explorer", "/influencers", "/reports", "/plans", "/signup", "/login", "/terms", "/privacy"];
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/explorer" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/explorer" || path === "/plans" ? 0.8 : 0.5,
  }));
}

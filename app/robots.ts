import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // API routes and shared comparisons are user/machine-facing, not
        // crawlable content.
        disallow: ["/api/", "/compare/"],
      },
    ],
    sitemap: "https://tasselcost.com/sitemap.xml",
  };
}

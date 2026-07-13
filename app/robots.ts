import type { MetadataRoute } from "next";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private/user-specific areas add no search value.
      disallow: [
        "/admin",
        "/api/",
        "/chats",
        "/wallet",
        "/orders",
        "/me",
        "/notifications",
        "/favorites",
        "/saved-searches",
        "/sell",
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}

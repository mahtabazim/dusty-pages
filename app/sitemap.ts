import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { listings } from "@/lib/db/schema";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const active = await db
    .select({ id: listings.id, updatedAt: listings.updatedAt })
    .from(listings)
    .where(eq(listings.status, "active"))
    .orderBy(desc(listings.createdAt))
    .limit(5000)
    .catch(() => []);

  return [
    { url: APP_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${APP_URL}/search`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${APP_URL}/signup`, changeFrequency: "monthly", priority: 0.5 },
    ...active.map((listing) => ({
      url: `${APP_URL}/listing/${listing.id}`,
      lastModified: listing.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}

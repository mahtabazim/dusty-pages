import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { savedSearches } from "@/lib/db/schema";
import { notify } from "@/lib/notify";

type NewListing = {
  id: string;
  sellerId: string;
  title: string;
  author: string | null;
  categorySlug: string;
  city: string | null;
  priceCoins: number;
};

/**
 * Notifies users whose saved searches match a freshly created listing.
 * Fire-and-forget from the sell flow.
 */
export async function matchSavedSearches(listing: NewListing) {
  const searches = await db
    .select()
    .from(savedSearches)
    .where(and(eq(savedSearches.notify, true), ne(savedSearches.userId, listing.sellerId)));

  const haystack = `${listing.title} ${listing.author ?? ""}`.toLowerCase();
  for (const search of searches) {
    const filters = (search.filters ?? {}) as Record<string, string>;
    if (search.query && !haystack.includes(search.query.toLowerCase())) continue;
    if (filters.category && filters.category !== listing.categorySlug) continue;
    if (
      filters.city &&
      !listing.city?.toLowerCase().includes(filters.city.toLowerCase())
    ) {
      continue;
    }
    if (filters.max && listing.priceCoins > Number(filters.max)) continue;
    if (filters.min && listing.priceCoins < Number(filters.min)) continue;

    await notify(search.userId, {
      type: "listing",
      title: `New match: "${listing.title}"`,
      body: `${listing.priceCoins} coins — matches your saved search${search.query ? ` "${search.query}"` : ""}.`,
      url: `/listing/${listing.id}`,
    });
    await db
      .update(savedSearches)
      .set({ lastNotifiedAt: new Date() })
      .where(eq(savedSearches.id, search.id));
  }
}

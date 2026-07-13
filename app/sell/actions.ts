"use server";

import { z } from "zod";
import { addDays } from "date-fns";
import { and, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  follows,
  listings,
  userBadges,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { grantBonus } from "@/lib/coins/ledger";
import { notifyMany } from "@/lib/notify";
import { matchSavedSearches } from "@/lib/alerts";

const listingSchema = z.object({
  title: z.string().min(2).max(200),
  author: z.string().max(120).optional(),
  isbn: z.string().max(17).optional(),
  publisher: z.string().max(120).optional(),
  publishedYear: z.coerce.number().int().min(1400).max(2100).optional(),
  edition: z.string().max(60).optional(),
  language: z.string().min(2).max(40),
  categorySlug: z.string().min(1),
  condition: z.enum(["new", "like_new", "good", "acceptable"]),
  description: z.string().max(2000).optional(),
  coverUrl: z.string().max(500).optional(),
  coverSource: z.enum(["api", "upload"]).default("api"),
  mrpInr: z.coerce.number().int().positive().max(100000).optional(),
  priceCoins: z.coerce.number().int().min(1).max(10000),
  city: z.string().max(80).optional(),
  area: z.string().max(120).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export type CreateListingState = { error?: string };

export async function createListing(
  _prev: CreateListingState,
  formData: FormData,
): Promise<CreateListingState> {
  const session = await requireUser();
  if (!session.user.emailVerified) {
    return { error: "Verify your email before listing a book." };
  }

  const raw = Object.fromEntries(
    [...formData.entries()].filter(([, v]) => v !== ""),
  );
  const parsed = listingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid listing" };
  }
  const input = parsed.data;

  const maxActive = await getConfig("max_active_listings");
  const [{ activeCount }] = await db
    .select({ activeCount: count() })
    .from(listings)
    .where(
      and(eq(listings.sellerId, session.user.id), eq(listings.status, "active")),
    );
  if (activeCount >= maxActive) {
    return { error: `You can have at most ${maxActive} active listings.` };
  }

  const [{ totalCount }] = await db
    .select({ totalCount: count() })
    .from(listings)
    .where(eq(listings.sellerId, session.user.id));
  const isFirstListing = totalCount === 0;

  const expiryDays = await getConfig("listing_expiry_days");
  let listing: { id: string };
  try {
    [listing] = await db
      .insert(listings)
      .values({
        sellerId: session.user.id,
        ...input,
        city: input.city ?? session.user.city ?? undefined,
        area: input.area ?? session.user.area ?? undefined,
        expiresAt: addDays(new Date(), expiryDays),
      })
      .returning({ id: listings.id });
  } catch (err) {
    console.error("[sell] listing insert failed:", err);
    return { error: "Could not save the listing. Please try again." };
  }

  if (isFirstListing) {
    const bonus = await getConfig("first_listing_bonus_coins");
    await grantBonus(
      session.user.id,
      "EARN_FIRST_LISTING",
      bonus,
      "First listing bonus",
    ).catch((err) => console.error("[sell] first-listing bonus failed:", err));
    await db
      .insert(userBadges)
      .values({ userId: session.user.id, badgeCode: "first_listing" })
      .onConflictDoNothing();
  }

  // Saved-search alerts (best effort).
  matchSavedSearches({
    id: listing.id,
    sellerId: session.user.id,
    title: input.title,
    author: input.author ?? null,
    categorySlug: input.categorySlug,
    city: input.city ?? session.user.city ?? null,
    priceCoins: input.priceCoins,
  }).catch((err) => console.error("[alerts] saved-search match failed:", err));

  // Tell followers about the new listing.
  const followerRows = await db
    .select({ followerId: follows.followerId })
    .from(follows)
    .where(eq(follows.followedId, session.user.id));
  await notifyMany(
    followerRows.map((f) => f.followerId),
    {
      type: "listing",
      title: `${session.user.name} listed "${input.title}"`,
      body: `${input.priceCoins} coins · ${input.condition.replace("_", " ")}`,
      url: `/listing/${listing.id}`,
    },
  );

  redirect(`/listing/${listing.id}`);
}

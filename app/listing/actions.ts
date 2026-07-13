"use server";

import { z } from "zod";
import { and, count, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  bookReviews,
  favorites,
  listings,
  reports,
  userBadges,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { createOrder, OrderError } from "@/lib/orders";
import { grantBonus, InsufficientCoinsError } from "@/lib/coins/ledger";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(listingId: string) {
  const session = await requireUser();
  const existing = await db
    .select()
    .from(favorites)
    .where(
      and(eq(favorites.userId, session.user.id), eq(favorites.listingId, listingId)),
    );
  if (existing.length > 0) {
    await db
      .delete(favorites)
      .where(
        and(eq(favorites.userId, session.user.id), eq(favorites.listingId, listingId)),
      );
  } else {
    await db
      .insert(favorites)
      .values({ userId: session.user.id, listingId })
      .onConflictDoNothing();
  }
  revalidatePath(`/listing/${listingId}`);
}

export async function buyListing(listingId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const [listing] = await db
    .select({ priceCoins: listings.priceCoins })
    .from(listings)
    .where(eq(listings.id, listingId));
  if (!listing) return { error: "Listing not found." };

  let orderId: string;
  try {
    const order = await createOrder({
      listingId,
      buyerId: session.user.id,
      priceCoins: listing.priceCoins,
    });
    orderId = order.id;
  } catch (err) {
    if (err instanceof InsufficientCoinsError) {
      return { error: "Not enough coins. Sell a book or earn daily bonuses!" };
    }
    if (err instanceof OrderError) return { error: err.message };
    throw err;
  }
  redirect(`/orders/${orderId}`);
}

export async function reportListing(
  listingId: string,
  reason: string,
  details?: string,
): Promise<{ error?: string }> {
  const session = await requireUser();
  await db.insert(reports).values({
    reporterId: session.user.id,
    targetType: "listing",
    targetId: listingId,
    reason,
    details,
  });
  // Auto-hide once distinct reports cross the configured threshold.
  const threshold = await getConfig("report_hide_threshold");
  const [{ reportTotal }] = await db
    .select({ reportTotal: count() })
    .from(reports)
    .where(and(eq(reports.targetType, "listing"), eq(reports.targetId, listingId)));
  await db
    .update(listings)
    .set({ reportCount: reportTotal })
    .where(eq(listings.id, listingId));
  if (reportTotal >= threshold) {
    await db
      .update(listings)
      .set({ status: "hidden" })
      .where(and(eq(listings.id, listingId), eq(listings.status, "active")));
  }
  revalidatePath(`/listing/${listingId}`);
  return {};
}

const editSchema = z.object({
  title: z.string().min(2).max(200),
  author: z.string().max(120).optional(),
  language: z.string().min(2).max(40),
  categorySlug: z.string().min(1),
  condition: z.enum(["new", "like_new", "good", "acceptable"]),
  description: z.string().max(2000).optional(),
  coverUrl: z.string().max(500).optional(),
  priceCoins: z.coerce.number().int().min(1).max(10000),
  city: z.string().max(80).optional(),
  area: z.string().max(120).optional(),
});

/** Seller edits a listing; a price drop notifies everyone who favorited it. */
export async function updateListing(
  listingId: string,
  input: z.infer<typeof editSchema>,
): Promise<{ error?: string }> {
  const session = await requireUser();
  const parsed = editSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid listing" };
  }

  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId));
  if (!listing || listing.sellerId !== session.user.id) {
    return { error: "Not your listing." };
  }
  if (listing.status === "reserved" || listing.status === "sold") {
    return { error: "This listing can't be edited right now." };
  }

  await db.update(listings).set(parsed.data).where(eq(listings.id, listingId));

  if (parsed.data.priceCoins < listing.priceCoins) {
    const fans = await db
      .select({ userId: favorites.userId })
      .from(favorites)
      .where(eq(favorites.listingId, listingId));
    const { notifyMany } = await import("@/lib/notify");
    await notifyMany(
      fans.map((f) => f.userId).filter((id) => id !== session.user.id),
      {
        type: "listing",
        title: `Price drop: "${parsed.data.title}"`,
        body: `Now ${parsed.data.priceCoins} coins (was ${listing.priceCoins}).`,
        url: `/listing/${listingId}`,
      },
    );
  }

  revalidatePath(`/listing/${listingId}`);
  redirect(`/listing/${listingId}`);
}

/** Community book review on a listing's book; earns capped bonus coins. */
export async function addBookReview(
  listingId: string,
  stars: number,
  body: string,
): Promise<{ error?: string; coins?: number }> {
  const session = await requireUser();
  if (stars < 1 || stars > 5) return { error: "Rating must be 1–5 stars." };
  if (body.trim().length < 20) {
    return { error: "Write at least 20 characters so the review helps others." };
  }

  const [listing] = await db
    .select({ id: listings.id, isbn: listings.isbn, title: listings.title })
    .from(listings)
    .where(eq(listings.id, listingId));
  if (!listing) return { error: "Listing not found." };

  const existing = await db
    .select({ id: bookReviews.id })
    .from(bookReviews)
    .where(
      and(eq(bookReviews.userId, session.user.id), eq(bookReviews.listingId, listingId)),
    );
  if (existing.length > 0) return { error: "You already reviewed this book." };

  await db.insert(bookReviews).values({
    userId: session.user.id,
    listingId,
    isbn: listing.isbn,
    bookTitle: listing.title,
    stars,
    body: body.trim().slice(0, 2000),
  });

  const bonus = await getConfig("book_review_coins");
  const coins = await grantBonus(
    session.user.id,
    "EARN_REVIEW",
    bonus,
    `Review: ${listing.title}`,
  ).catch(() => 0);

  const [{ reviewTotal }] = await db
    .select({ reviewTotal: count() })
    .from(bookReviews)
    .where(eq(bookReviews.userId, session.user.id));
  if (reviewTotal >= 10) {
    await db
      .insert(userBadges)
      .values({ userId: session.user.id, badgeCode: "bookworm" })
      .onConflictDoNothing();
  }

  revalidatePath(`/listing/${listingId}`);
  return { coins };
}

/** Seller listing management: deactivate, relist, mark sold outside the app. */
export async function updateListingStatus(
  listingId: string,
  action: "deactivate" | "relist" | "mark_sold",
): Promise<{ error?: string }> {
  const session = await requireUser();
  const [listing] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId));
  if (!listing || listing.sellerId !== session.user.id) {
    return { error: "Not your listing." };
  }
  if (listing.status === "reserved") {
    return { error: "This listing has an order in progress." };
  }

  if (action === "deactivate") {
    await db
      .update(listings)
      .set({ status: "deactivated" })
      .where(eq(listings.id, listingId));
  } else if (action === "mark_sold") {
    await db
      .update(listings)
      .set({ status: "sold", soldAt: new Date() })
      .where(eq(listings.id, listingId));
  } else {
    const expiryDays = await getConfig("listing_expiry_days");
    await db
      .update(listings)
      .set({
        status: "active",
        expiresAt: addDays(new Date(), expiryDays),
        createdAt: sql`now()`, // bump to top of fresh arrivals on relist
      })
      .where(eq(listings.id, listingId));
  }
  revalidatePath(`/listing/${listingId}`);
  return {};
}

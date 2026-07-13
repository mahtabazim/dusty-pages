import { NextResponse } from "next/server";
import { and, eq, isNull, lte } from "drizzle-orm";
import { addDays } from "date-fns";
import { db } from "@/lib/db";
import { listings, orders } from "@/lib/db/schema";
import { completeOrder } from "@/lib/orders";
import { notify } from "@/lib/notify";

/**
 * Periodic maintenance, meant to be hit by a scheduler (e.g. Vercel Cron or
 * an external ping every hour). Protected by CRON_SECRET when set.
 *
 * - Auto-releases escrow for orders past autoReleaseAt (buyer never confirmed).
 * - Expires listings past expiresAt and sends renewal reminders 7 days out.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const results = { released: 0, expired: 0, reminded: 0 };

  // 1. Escrow auto-release.
  const dueOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.status, "escrow_held"), lte(orders.autoReleaseAt, now)))
    .limit(100);
  for (const order of dueOrders) {
    try {
      await completeOrder({
        orderId: order.id,
        buyerId: order.buyerId,
        source: "auto_release",
      });
      await notify(order.buyerId, {
        type: "order",
        title: "Escrow auto-released",
        body: "You didn't confirm within the window, so the coins went to the seller.",
        url: `/orders/${order.id}`,
      });
      results.released++;
    } catch (err) {
      console.error(`[cron] auto-release failed for order ${order.id}:`, err);
    }
  }

  // 2. Expire listings.
  const expired = await db
    .update(listings)
    .set({ status: "expired" })
    .where(and(eq(listings.status, "active"), lte(listings.expiresAt, now)))
    .returning({ id: listings.id, sellerId: listings.sellerId, title: listings.title });
  results.expired = expired.length;
  for (const listing of expired) {
    await notify(listing.sellerId, {
      type: "listing",
      title: `"${listing.title}" expired`,
      body: "Relist it in one tap to keep it visible.",
      url: `/listing/${listing.id}`,
    });
  }

  // 3. Renewal reminders one week before expiry.
  const expiringSoon = await db
    .select({ id: listings.id, sellerId: listings.sellerId, title: listings.title })
    .from(listings)
    .where(
      and(
        eq(listings.status, "active"),
        lte(listings.expiresAt, addDays(now, 7)),
        isNull(listings.renewalReminderSentAt),
      ),
    )
    .limit(200);
  for (const listing of expiringSoon) {
    await notify(listing.sellerId, {
      type: "listing",
      title: `"${listing.title}" expires soon`,
      body: "It will be hidden in about a week — renew it from the listing page.",
      url: `/listing/${listing.id}`,
    });
    await db
      .update(listings)
      .set({ renewalReminderSentAt: now })
      .where(eq(listings.id, listing.id));
    results.reminded++;
  }

  return NextResponse.json(results);
}

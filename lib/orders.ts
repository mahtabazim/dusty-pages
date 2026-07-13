import { addDays } from "date-fns";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  listings,
  orders,
  referrals,
  user,
  userBadges,
} from "@/lib/db/schema";
import { getConfig } from "@/lib/config";
import {
  grantBonus,
  holdEscrow,
  refundEscrow,
  releaseEscrow,
  splitEscrow,
} from "@/lib/coins/ledger";
import { notify } from "@/lib/notify";

export class OrderError extends Error {}

/**
 * Buys a listing at the given price (list price or an accepted offer amount):
 * locks the buyer's coins in escrow and reserves the listing.
 */
export async function createOrder(opts: {
  listingId: string;
  buyerId: string;
  priceCoins: number;
}) {
  const autoReleaseDays = await getConfig("escrow_auto_release_days");

  const order = await db.transaction(async (tx) => {
    const [listing] = await tx
      .select()
      .from(listings)
      .where(eq(listings.id, opts.listingId))
      .for("update");
    if (!listing || listing.status !== "active") {
      throw new OrderError("This book is no longer available.");
    }
    if (listing.sellerId === opts.buyerId) {
      throw new OrderError("You cannot buy your own listing.");
    }

    const [created] = await tx
      .insert(orders)
      .values({
        listingId: listing.id,
        buyerId: opts.buyerId,
        sellerId: listing.sellerId,
        priceCoins: opts.priceCoins,
        autoReleaseAt: addDays(new Date(), autoReleaseDays),
      })
      .returning();

    await holdEscrow(tx, {
      buyerId: opts.buyerId,
      orderId: created.id,
      amount: opts.priceCoins,
    });
    await tx
      .update(listings)
      .set({ status: "reserved" })
      .where(eq(listings.id, listing.id));
    return created;
  });

  await notify(order.sellerId, {
    type: "order",
    title: "Your book was purchased!",
    body: `${order.priceCoins} coins are held in escrow. Arrange a meetup to hand it over.`,
    url: `/orders/${order.id}`,
  });
  return order;
}

/**
 * Completes the handover: verifies the QR token (or an explicit buyer
 * confirmation), releases escrow to the seller minus the configured
 * commission, marks the listing sold, and credits referral bonuses on a
 * first completed transaction.
 */
export async function completeOrder(opts: {
  orderId: string;
  buyerId: string;
  handoverToken?: string;
  source: "qr" | "confirm" | "auto_release" | "dispute";
}) {
  const commissionPercent = await getConfig("commission_percent");
  const disputeWindowDays = await getConfig("dispute_window_days");

  const order = await db.transaction(async (tx) => {
    const [ord] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, opts.orderId))
      .for("update");
    if (!ord) throw new OrderError("Order not found.");
    if (ord.status !== "escrow_held") {
      throw new OrderError("This order is not awaiting handover.");
    }
    if (opts.source !== "auto_release" && ord.buyerId !== opts.buyerId) {
      throw new OrderError("Only the buyer can confirm the handover.");
    }
    if (opts.source === "qr" && ord.handoverToken !== opts.handoverToken) {
      throw new OrderError("Invalid handover code.");
    }

    const commission = Math.floor((ord.priceCoins * commissionPercent) / 100);
    await releaseEscrow(tx, {
      buyerId: ord.buyerId,
      sellerId: ord.sellerId,
      orderId: ord.id,
      amount: ord.priceCoins,
      commission,
    });
    await tx
      .update(orders)
      .set({
        status: "completed",
        commissionCoins: commission,
        completedAt: new Date(),
        disputeWindowEndsAt: addDays(new Date(), disputeWindowDays),
      })
      .where(eq(orders.id, ord.id));
    await tx
      .update(listings)
      .set({ status: "sold", soldAt: new Date() })
      .where(eq(listings.id, ord.listingId));
    return ord;
  });

  await afterCompletion(order.buyerId, order.sellerId, order.priceCoins, order.id);
  return order;
}

/** Post-completion side effects: notifications, badges, referral credit. */
async function afterCompletion(
  buyerId: string,
  sellerId: string,
  priceCoins: number,
  orderId: string,
) {
  await notify(sellerId, {
    type: "coins",
    title: `Sale complete — ${priceCoins} coins received`,
    body: "The buyer confirmed the handover. Rate them!",
    url: `/orders/${orderId}`,
  });
  await notify(buyerId, {
    type: "order",
    title: "Purchase complete",
    body: "Enjoy the book — and rate the seller!",
    url: `/orders/${orderId}`,
  });

  // Badges: first sale / purchase and 10 sales.
  const sellerSales = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.sellerId, sellerId), eq(orders.status, "completed")));
  if (sellerSales.length >= 1) {
    await db
      .insert(userBadges)
      .values({ userId: sellerId, badgeCode: "first_sale" })
      .onConflictDoNothing();
  }
  if (sellerSales.length >= 10) {
    await db
      .insert(userBadges)
      .values({ userId: sellerId, badgeCode: "ten_books_sold" })
      .onConflictDoNothing();
  }
  await db
    .insert(userBadges)
    .values({ userId: buyerId, badgeCode: "first_purchase" })
    .onConflictDoNothing();

  // Verified-seller badge once enough sales are completed.
  const minSales = await getConfig("verified_seller_min_sales");
  if (sellerSales.length >= minSales) {
    await db
      .insert(userBadges)
      .values({ userId: sellerId, badgeCode: "trusted_seller" })
      .onConflictDoNothing();
  }

  // Referral bonus: credited when the referee completes a first transaction.
  for (const partyId of [buyerId, sellerId]) {
    const [ref] = await db
      .select()
      .from(referrals)
      .where(and(eq(referrals.refereeId, partyId), eq(referrals.status, "pending")));
    if (!ref) continue;
    const [referrerBonus, refereeBonus] = await Promise.all([
      getConfig("referral_bonus_referrer"),
      getConfig("referral_bonus_referee"),
    ]);
    await db
      .update(referrals)
      .set({ status: "credited", creditedAt: new Date() })
      .where(eq(referrals.id, ref.id));
    await grantBonus(ref.referrerId, "EARN_REFERRAL", referrerBonus, "Referral bonus");
    await grantBonus(ref.refereeId, "EARN_REFERRAL", refereeBonus, "Referral bonus");
    const [referee] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, ref.refereeId));
    await notify(ref.referrerId, {
      type: "coins",
      title: `Referral bonus: +${referrerBonus} coins`,
      body: `${referee?.name ?? "Your friend"} completed their first trade.`,
      url: "/wallet",
    });
  }
}

/** Cancels an in-escrow order; coins return to the buyer instantly. */
export async function cancelOrder(opts: {
  orderId: string;
  byUserId: string;
  isAdmin?: boolean;
}) {
  const order = await db.transaction(async (tx) => {
    const [ord] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, opts.orderId))
      .for("update");
    if (!ord) throw new OrderError("Order not found.");
    if (ord.status !== "escrow_held") {
      throw new OrderError("Only orders awaiting handover can be cancelled.");
    }
    if (!opts.isAdmin && ord.buyerId !== opts.byUserId && ord.sellerId !== opts.byUserId) {
      throw new OrderError("Not your order.");
    }

    await refundEscrow(tx, {
      buyerId: ord.buyerId,
      orderId: ord.id,
      amount: ord.priceCoins,
    });
    await tx
      .update(orders)
      .set({ status: "cancelled", cancelledAt: new Date(), cancelledBy: opts.byUserId })
      .where(eq(orders.id, ord.id));
    await tx
      .update(listings)
      .set({ status: "active" })
      .where(eq(listings.id, ord.listingId));
    return ord;
  });

  const other = order.buyerId === opts.byUserId ? order.sellerId : order.buyerId;
  await notify(other, {
    type: "order",
    title: "Order cancelled",
    body: "The coins were returned to the buyer and the listing is live again.",
    url: `/orders/${order.id}`,
  });
  return order;
}

/** Admin dispute resolution. sellerShare = coins granted to the seller. */
export async function resolveDispute(opts: {
  orderId: string;
  sellerShare: number;
}) {
  return db.transaction(async (tx) => {
    const [ord] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, opts.orderId))
      .for("update");
    if (!ord) throw new OrderError("Order not found.");
    if (ord.status !== "disputed") throw new OrderError("Order is not disputed.");

    await splitEscrow(tx, {
      buyerId: ord.buyerId,
      sellerId: ord.sellerId,
      orderId: ord.id,
      amount: ord.priceCoins,
      sellerShare: opts.sellerShare,
    });
    const fullRelease = opts.sellerShare === ord.priceCoins;
    await tx
      .update(orders)
      .set({
        status: fullRelease ? "completed" : "refunded",
        completedAt: fullRelease ? new Date() : null,
      })
      .where(eq(orders.id, ord.id));
    await tx
      .update(listings)
      .set({ status: fullRelease ? "sold" : "deactivated" })
      .where(eq(listings.id, ord.listingId));
    return ord;
  });
}

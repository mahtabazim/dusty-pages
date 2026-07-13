"use server";

import { and, count, eq, gte, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  blockedUsers,
  conversations,
  messages,
  offers,
} from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { conversationChannel, triggerEvent } from "@/lib/pusher";
import { notify } from "@/lib/notify";
import { createOrder, OrderError } from "@/lib/orders";
import { InsufficientCoinsError } from "@/lib/coins/ledger";

async function getConversationForUser(conversationId: string, userId: string) {
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId));
  if (!conv || (conv.buyerId !== userId && conv.sellerId !== userId)) {
    return null;
  }
  return conv;
}

async function isBlockedEitherWay(a: string, b: string) {
  const rows = await db
    .select()
    .from(blockedUsers)
    .where(
      or(
        and(eq(blockedUsers.blockerId, a), eq(blockedUsers.blockedId, b)),
        and(eq(blockedUsers.blockerId, b), eq(blockedUsers.blockedId, a)),
      ),
    );
  return rows.length > 0;
}

const sendSchema = z.object({
  conversationId: z.string().uuid(),
  type: z.enum(["text", "image", "location"]),
  body: z.string().max(2000).optional(),
  imageUrl: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export async function sendMessage(
  input: z.infer<typeof sendSchema>,
): Promise<{ error?: string; message?: typeof messages.$inferSelect }> {
  const session = await requireUser();
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid message." };
  const data = parsed.data;
  if (data.type === "text" && !data.body?.trim()) return { error: "Empty message." };

  const conv = await getConversationForUser(data.conversationId, session.user.id);
  if (!conv) return { error: "Conversation not found." };
  const other = conv.buyerId === session.user.id ? conv.sellerId : conv.buyerId;
  if (await isBlockedEitherWay(session.user.id, other)) {
    return { error: "Messaging is unavailable for this user." };
  }

  const [message] = await db
    .insert(messages)
    .values({
      conversationId: conv.id,
      senderId: session.user.id,
      type: data.type,
      body: data.body?.trim(),
      imageUrl: data.imageUrl,
      latitude: data.latitude,
      longitude: data.longitude,
    })
    .returning();
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conv.id));

  await triggerEvent(conversationChannel(conv.id), "message", { message, offer: null });
  await notify(other, {
    type: "message",
    title: `New message from ${session.user.name}`,
    body: data.type === "text" ? data.body?.slice(0, 80) : `Sent a ${data.type}`,
    url: `/chats/${conv.id}`,
  });
  return { message };
}

export async function makeOffer(
  conversationId: string,
  amountCoins: number,
): Promise<{ error?: string }> {
  const session = await requireUser();
  if (!Number.isInteger(amountCoins) || amountCoins < 1 || amountCoins > 10000) {
    return { error: "Invalid offer amount." };
  }
  const conv = await getConversationForUser(conversationId, session.user.id);
  if (!conv) return { error: "Conversation not found." };

  // Anti-spam: cap offers per day.
  const maxOffers = await getConfig("max_offers_per_day");
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ recentOffers }] = await db
    .select({ recentOffers: count() })
    .from(offers)
    .where(and(eq(offers.offererId, session.user.id), gte(offers.createdAt, dayAgo)));
  if (recentOffers >= maxOffers) {
    return { error: "You've reached today's offer limit." };
  }

  // Supersede my previous pending offer in this conversation.
  await db
    .update(offers)
    .set({ status: "withdrawn", respondedAt: new Date() })
    .where(
      and(
        eq(offers.conversationId, conversationId),
        eq(offers.offererId, session.user.id),
        eq(offers.status, "pending"),
      ),
    );

  const [offer] = await db
    .insert(offers)
    .values({
      listingId: conv.listingId,
      conversationId,
      offererId: session.user.id,
      amountCoins,
    })
    .returning();
  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      senderId: session.user.id,
      type: "offer",
      offerId: offer.id,
      body: String(amountCoins),
    })
    .returning();
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));

  const other = conv.buyerId === session.user.id ? conv.sellerId : conv.buyerId;
  await triggerEvent(conversationChannel(conversationId), "message", { message, offer });
  await notify(other, {
    type: "offer",
    title: `${session.user.name} offered ${amountCoins} coins`,
    url: `/chats/${conversationId}`,
  });
  return {};
}

export async function respondToOffer(
  offerId: string,
  response: "accepted" | "rejected",
): Promise<{ error?: string; orderId?: string }> {
  const session = await requireUser();
  const [offer] = await db.select().from(offers).where(eq(offers.id, offerId));
  if (!offer) return { error: "Offer not found." };
  const conv = await getConversationForUser(offer.conversationId, session.user.id);
  if (!conv) return { error: "Not your conversation." };
  if (offer.offererId === session.user.id) {
    return { error: "You can't respond to your own offer." };
  }
  if (offer.status !== "pending") return { error: "Offer is no longer open." };

  if (response === "rejected") {
    await db
      .update(offers)
      .set({ status: "rejected", respondedAt: new Date() })
      .where(eq(offers.id, offerId));
    await systemMessage(conv.id, session.user.id, "Offer declined.");
    return {};
  }

  // Accepting: only the seller accepts a buyer's offer; buyer accepting a
  // seller counter-offer also lands here — the order buyer is always the
  // conversation's buyer.
  await db
    .update(offers)
    .set({ status: "accepted", respondedAt: new Date() })
    .where(eq(offers.id, offerId));
  try {
    const order = await createOrder({
      listingId: conv.listingId,
      buyerId: conv.buyerId,
      priceCoins: offer.amountCoins,
    });
    await systemMessage(
      conv.id,
      session.user.id,
      `Offer of ${offer.amountCoins} coins accepted — coins moved to escrow. Arrange the meetup!`,
    );
    return { orderId: order.id };
  } catch (err) {
    // Roll the offer back so it can be retried after topping up.
    await db
      .update(offers)
      .set({ status: "pending", respondedAt: null })
      .where(eq(offers.id, offerId));
    if (err instanceof InsufficientCoinsError) {
      return { error: "The buyer doesn't have enough coins right now." };
    }
    if (err instanceof OrderError) return { error: err.message };
    throw err;
  }
}

async function systemMessage(conversationId: string, senderId: string, body: string) {
  const [message] = await db
    .insert(messages)
    .values({ conversationId, senderId, type: "system", body })
    .returning();
  await triggerEvent(conversationChannel(conversationId), "message", { message, offer: null });
}

export async function blockUser(userId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  if (userId === session.user.id) return { error: "You can't block yourself." };
  await db
    .insert(blockedUsers)
    .values({ blockerId: session.user.id, blockedId: userId })
    .onConflictDoNothing();
  return {};
}

export async function reportUser(
  userId: string,
  reason: string,
): Promise<{ error?: string }> {
  const session = await requireUser();
  const { reports } = await import("@/lib/db/schema");
  await db.insert(reports).values({
    reporterId: session.user.id,
    targetType: "user",
    targetId: userId,
    reason,
  });
  return {};
}

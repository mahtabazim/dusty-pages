"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { disputes, orders, ratings } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import {
  cancelOrder,
  completeOrder,
  OrderError,
} from "@/lib/orders";
import { notify } from "@/lib/notify";

export async function confirmHandover(
  orderId: string,
  handoverToken?: string,
): Promise<{ error?: string }> {
  const session = await requireUser();
  try {
    await completeOrder({
      orderId,
      buyerId: session.user.id,
      handoverToken,
      source: handoverToken ? "qr" : "confirm",
    });
  } catch (err) {
    if (err instanceof OrderError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/orders/${orderId}`);
  return {};
}

export async function cancelOrderAction(orderId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  try {
    await cancelOrder({ orderId, byUserId: session.user.id });
  } catch (err) {
    if (err instanceof OrderError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/orders/${orderId}`);
  return {};
}

const disputeSchema = z.object({
  reason: z.string().min(3).max(100),
  details: z.string().max(2000).optional(),
  evidenceUrls: z.array(z.string()).max(5).default([]),
});

export async function raiseDispute(
  orderId: string,
  input: z.infer<typeof disputeSchema>,
): Promise<{ error?: string }> {
  const session = await requireUser();
  const parsed = disputeSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid dispute details." };

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return { error: "Order not found." };
  if (order.buyerId !== session.user.id && order.sellerId !== session.user.id) {
    return { error: "Not your order." };
  }
  if (order.status !== "escrow_held") {
    return { error: "Disputes can only be raised while coins are in escrow." };
  }

  await db.transaction(async (tx) => {
    await tx.insert(disputes).values({
      orderId,
      raisedById: session.user.id,
      reason: parsed.data.reason,
      details: parsed.data.details,
      evidenceUrls: parsed.data.evidenceUrls,
    });
    await tx.update(orders).set({ status: "disputed" }).where(eq(orders.id, orderId));
  });

  const other =
    order.buyerId === session.user.id ? order.sellerId : order.buyerId;
  await notify(other, {
    type: "dispute",
    title: "A dispute was raised on your order",
    body: "An admin will review the evidence and resolve it.",
    url: `/orders/${orderId}`,
  });
  revalidatePath(`/orders/${orderId}`);
  return {};
}

export async function submitRating(
  orderId: string,
  stars: number,
  comment?: string,
): Promise<{ error?: string }> {
  const session = await requireUser();
  if (stars < 1 || stars > 5) return { error: "Rating must be 1–5 stars." };

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return { error: "Order not found." };
  if (order.status !== "completed") return { error: "Order not completed yet." };
  const isBuyer = order.buyerId === session.user.id;
  const isSeller = order.sellerId === session.user.id;
  if (!isBuyer && !isSeller) return { error: "Not your order." };

  const rateeId = isBuyer ? order.sellerId : order.buyerId;
  const existing = await db
    .select()
    .from(ratings)
    .where(and(eq(ratings.orderId, orderId), eq(ratings.raterId, session.user.id)));
  if (existing.length > 0) return { error: "You already rated this trade." };

  await db.insert(ratings).values({
    orderId,
    raterId: session.user.id,
    rateeId,
    stars,
    comment: comment?.slice(0, 1000),
  });
  await notify(rateeId, {
    type: "order",
    title: `You received a ${stars}-star rating`,
    url: `/orders/${orderId}`,
  });
  revalidatePath(`/orders/${orderId}`);
  return {};
}

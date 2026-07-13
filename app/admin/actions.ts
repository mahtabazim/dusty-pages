"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import {
  appConfig,
  auditLog,
  disputes,
  listings,
  orders,
  reports,
  user,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";
import { CONFIG_DEFAULTS, type ConfigKey } from "@/lib/config";
import { adminAdjust } from "@/lib/coins/ledger";
import { resolveDispute, OrderError } from "@/lib/orders";
import { notify } from "@/lib/notify";

async function audit(
  actorId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  data?: Record<string, unknown>,
) {
  await db.insert(auditLog).values({ actorId, action, targetType, targetId, data });
}

export async function updateConfig(
  key: ConfigKey,
  value: unknown,
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  if (!(key in CONFIG_DEFAULTS)) return { error: "Unknown config key." };
  const expected = typeof CONFIG_DEFAULTS[key];
  if (typeof value !== expected) return { error: `Value must be a ${expected}.` };
  if (typeof value === "number" && (value < 0 || !Number.isFinite(value))) {
    return { error: "Value must be a non-negative number." };
  }
  if (key === "commission_percent" && typeof value === "number" && value > 50) {
    return { error: "Commission cannot exceed 50%." };
  }

  await db
    .insert(appConfig)
    .values({ key, value, updatedById: session.user.id })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value, updatedById: session.user.id },
    });
  await audit(session.user.id, "config.update", "config", key, { value });
  revalidatePath("/admin/config");
  return {};
}

export async function setUserBanned(
  userId: string,
  banned: boolean,
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  if (userId === session.user.id) return { error: "You can't ban yourself." };
  await db.update(user).set({ banned }).where(eq(user.id, userId));
  await audit(session.user.id, banned ? "user.ban" : "user.unban", "user", userId);
  revalidatePath("/admin/users");
  return {};
}

export async function adjustUserCoins(
  userId: string,
  amount: number,
  note: string,
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  if (!Number.isInteger(amount) || amount === 0) return { error: "Invalid amount." };
  if (!note.trim()) return { error: "A note is required for adjustments." };
  try {
    await adminAdjust(userId, amount, note.trim());
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Adjustment failed" };
  }
  await audit(session.user.id, "coins.adjust", "user", userId, { amount, note });
  await notify(userId, {
    type: "coins",
    title: `${amount > 0 ? "+" : ""}${amount} coins adjustment`,
    body: note,
    url: "/wallet",
  });
  revalidatePath("/admin/users");
  return {};
}

export async function handleReport(
  reportId: string,
  decision: "dismiss" | "hide_listing" | "ban_user",
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
  if (!report) return { error: "Report not found." };

  if (decision === "hide_listing" && report.targetType === "listing") {
    await db
      .update(listings)
      .set({ status: "hidden" })
      .where(eq(listings.id, report.targetId));
  }
  if (decision === "ban_user") {
    const targetUserId =
      report.targetType === "user"
        ? report.targetId
        : report.targetType === "listing"
          ? (
              await db
                .select({ sellerId: listings.sellerId })
                .from(listings)
                .where(eq(listings.id, report.targetId))
            )[0]?.sellerId
          : null;
    if (targetUserId) {
      await db.update(user).set({ banned: true }).where(eq(user.id, targetUserId));
    }
  }
  await db
    .update(reports)
    .set({
      status: decision === "dismiss" ? "dismissed" : "actioned",
      reviewedById: session.user.id,
    })
    .where(eq(reports.id, reportId));
  await audit(session.user.id, `report.${decision}`, report.targetType, report.targetId);
  revalidatePath("/admin/reports");
  return {};
}

export async function resolveDisputeAction(
  disputeId: string,
  outcome: "release" | "refund" | "split",
  note: string,
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId));
  if (!dispute) return { error: "Dispute not found." };
  if (dispute.status !== "open") return { error: "Already resolved." };

  const [{ priceCoins, buyerId, sellerId }] = await db
    .select({
      priceCoins: orders.priceCoins,
      buyerId: orders.buyerId,
      sellerId: orders.sellerId,
    })
    .from(orders)
    .where(eq(orders.id, dispute.orderId));

  const sellerShare =
    outcome === "release"
      ? priceCoins
      : outcome === "refund"
        ? 0
        : Math.floor(priceCoins / 2);
  try {
    await resolveDispute({ orderId: dispute.orderId, sellerShare });
  } catch (err) {
    if (err instanceof OrderError) return { error: err.message };
    throw err;
  }

  await db
    .update(disputes)
    .set({
      status:
        outcome === "release"
          ? "resolved_release"
          : outcome === "refund"
            ? "resolved_refund"
            : "resolved_split",
      resolutionNote: note,
      resolvedById: session.user.id,
      resolvedAt: new Date(),
    })
    .where(eq(disputes.id, disputeId));
  await audit(session.user.id, `dispute.${outcome}`, "order", dispute.orderId, { note });

  for (const partyId of [buyerId, sellerId]) {
    await notify(partyId, {
      type: "dispute",
      title: "Your dispute was resolved",
      body: note || `Outcome: ${outcome}`,
      url: `/orders/${dispute.orderId}`,
    });
  }
  revalidatePath("/admin/disputes");
  return {};
}

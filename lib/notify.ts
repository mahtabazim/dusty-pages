import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { triggerEvent } from "@/lib/pusher";

export type NotificationInput = {
  type:
    | "message"
    | "offer"
    | "order"
    | "coins"
    | "listing"
    | "follow"
    | "dispute"
    | "system";
  title: string;
  body?: string;
  url?: string;
};

/** Creates an in-app notification and pushes it to the user in realtime. */
export async function notify(userId: string, input: NotificationInput) {
  try {
    await db.insert(notifications).values({ userId, ...input });
    await triggerEvent(`private-user-${userId}`, "notification", input);
  } catch (err) {
    console.error(`[notify] failed for ${userId}:`, err);
  }
}

export async function notifyMany(userIds: string[], input: NotificationInput) {
  if (userIds.length === 0) return;
  try {
    await db
      .insert(notifications)
      .values(userIds.map((userId) => ({ userId, ...input })));
    await Promise.all(
      userIds.map((userId) =>
        triggerEvent(`private-user-${userId}`, "notification", input),
      ),
    );
  } catch (err) {
    console.error("[notify] bulk insert failed:", err);
  }
}

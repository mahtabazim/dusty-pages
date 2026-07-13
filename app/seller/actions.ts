"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { follows } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { notify } from "@/lib/notify";

export async function toggleFollow(sellerId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  if (sellerId === session.user.id) return { error: "You can't follow yourself." };

  const existing = await db
    .select()
    .from(follows)
    .where(
      and(eq(follows.followerId, session.user.id), eq(follows.followedId, sellerId)),
    );
  if (existing.length > 0) {
    await db
      .delete(follows)
      .where(
        and(eq(follows.followerId, session.user.id), eq(follows.followedId, sellerId)),
      );
  } else {
    await db
      .insert(follows)
      .values({ followerId: session.user.id, followedId: sellerId })
      .onConflictDoNothing();
    await notify(sellerId, {
      type: "follow",
      title: `${session.user.name} started following you`,
      url: `/seller/${session.user.id}`,
    });
  }
  revalidatePath(`/seller/${sellerId}`);
  return {};
}

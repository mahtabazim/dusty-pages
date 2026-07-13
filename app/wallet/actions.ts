"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { differenceInCalendarDays } from "date-fns";
import { db } from "@/lib/db";
import { dailyEarnings, user } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { getConfig } from "@/lib/config";
import { grantBonus } from "@/lib/coins/ledger";

export async function claimDailyBonus(): Promise<{
  error?: string;
  granted?: number;
  streak?: number;
}> {
  const session = await requireUser();
  const userId = session.user.id;
  const today = new Date().toISOString().slice(0, 10);

  const [row] = await db
    .select()
    .from(dailyEarnings)
    .where(and(eq(dailyEarnings.userId, userId), eq(dailyEarnings.day, today)));
  if (row?.loginBonusClaimed) {
    return { error: "Already claimed today — come back tomorrow!" };
  }

  const amount = await getConfig("daily_login_coins");
  const granted = await grantBonus(
    userId,
    "EARN_DAILY_LOGIN",
    amount,
    "Daily login bonus",
  );
  await db
    .insert(dailyEarnings)
    .values({ userId, day: today, loginBonusClaimed: true })
    .onConflictDoUpdate({
      target: [dailyEarnings.userId, dailyEarnings.day],
      set: { loginBonusClaimed: true },
    });

  // Streak: consecutive-day claims tracked on the user row.
  const [me] = await db.select().from(user).where(eq(user.id, userId));
  const last = me.lastActiveDate ? new Date(me.lastActiveDate) : null;
  const gap = last ? differenceInCalendarDays(new Date(), last) : Infinity;
  const streak = gap === 1 ? (me.loginStreak ?? 0) + 1 : 1;
  await db
    .update(user)
    .set({ loginStreak: streak, lastActiveDate: today })
    .where(eq(user.id, userId));

  revalidatePath("/wallet");
  return { granted, streak };
}

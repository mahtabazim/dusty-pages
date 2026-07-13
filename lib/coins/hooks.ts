import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

/**
 * Post-signup housekeeping, called from the Better Auth user-create hook:
 * referral code generation, signup bonus, and referral tracking.
 * Failures here must never block account creation.
 */
export async function onUserCreated(userId: string) {
  // Deferred imports avoid a module cycle (auth -> hooks -> ledger -> db).
  const { db } = await import("@/lib/db");
  const { user, referrals } = await import("@/lib/db/schema");
  const { grantSignupBonus } = await import("./ledger");

  try {
    const code = `BB-${randomBytes(4).toString("hex").toUpperCase()}`;
    await db.update(user).set({ referralCode: code }).where(eq(user.id, userId));
  } catch (err) {
    console.error(`[coins] referral code failed for ${userId}:`, err);
  }

  try {
    await grantSignupBonus(userId);
  } catch (err) {
    console.error(`[coins] signup bonus failed for ${userId}:`, err);
  }

  try {
    // If the user signed up with someone's referral code, record it as
    // pending. It is credited when the referee completes a first purchase or
    // sale (see credit logic in the order flow), which limits farming.
    const [me] = await db.select().from(user).where(eq(user.id, userId));
    if (me?.referredBy) {
      const [referrer] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.referralCode, me.referredBy));
      if (referrer && referrer.id !== userId) {
        await db
          .insert(referrals)
          .values({ referrerId: referrer.id, refereeId: userId })
          .onConflictDoNothing();
      }
    }
  } catch (err) {
    console.error(`[coins] referral tracking failed for ${userId}:`, err);
  }
}

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appConfig } from "@/lib/db/schema";

/**
 * Admin-configurable values with their v1 defaults. The seed script writes
 * these into app_config; getConfig falls back to defaults if a key is missing.
 */
export const CONFIG_DEFAULTS = {
  signup_bonus_coins: 100,
  first_listing_bonus_coins: 20,
  daily_login_coins: 2,
  book_review_coins: 5,
  referral_bonus_referrer: 30,
  referral_bonus_referee: 30,
  daily_earn_cap_coins: 60, // bonuses only; sale proceeds are never capped
  escrow_auto_release_days: 7,
  dispute_window_days: 3,
  listing_expiry_days: 60,
  report_hide_threshold: 3,
  verified_seller_min_sales: 3,
  max_active_listings: 30,
  max_offers_per_day: 25,
  // --- Monetization switches (deferred; off by default) ---
  commission_percent: 0,
  coin_packs_enabled: false,
} as const;

export type ConfigKey = keyof typeof CONFIG_DEFAULTS;

export async function getConfig<K extends ConfigKey>(
  key: K,
): Promise<(typeof CONFIG_DEFAULTS)[K]> {
  const rows = await db
    .select({ value: appConfig.value })
    .from(appConfig)
    .where(eq(appConfig.key, key))
    .limit(1);
  if (rows.length === 0) return CONFIG_DEFAULTS[key];
  return rows[0].value as (typeof CONFIG_DEFAULTS)[K];
}

export async function getAllConfig(): Promise<Record<ConfigKey, unknown>> {
  const rows = await db.select().from(appConfig);
  const merged: Record<string, unknown> = { ...CONFIG_DEFAULTS };
  for (const row of rows) {
    if (row.key in CONFIG_DEFAULTS) merged[row.key] = row.value;
  }
  return merged as Record<ConfigKey, unknown>;
}

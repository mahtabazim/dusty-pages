import type { Metadata } from "next";
import { getAllConfig, type ConfigKey } from "@/lib/config";
import { ConfigRow } from "@/components/admin/config-editor";

export const metadata: Metadata = { title: "Admin · Config" };

const GROUPS: { title: string; keys: [ConfigKey, string][] }[] = [
  {
    title: "Coin earning",
    keys: [
      ["signup_bonus_coins", "Signup bonus"],
      ["first_listing_bonus_coins", "First listing bonus"],
      ["daily_login_coins", "Daily login coins"],
      ["book_review_coins", "Book review coins"],
      ["referral_bonus_referrer", "Referral bonus (referrer)"],
      ["referral_bonus_referee", "Referral bonus (referee)"],
      ["daily_earn_cap_coins", "Daily earn cap (bonuses)"],
    ],
  },
  {
    title: "Marketplace",
    keys: [
      ["escrow_auto_release_days", "Escrow auto-release (days)"],
      ["dispute_window_days", "Dispute window (days)"],
      ["listing_expiry_days", "Listing expiry (days)"],
      ["report_hide_threshold", "Auto-hide after N reports"],
      ["verified_seller_min_sales", "Verified seller: min sales"],
      ["max_active_listings", "Max active listings per user"],
      ["max_offers_per_day", "Max offers per user per day"],
    ],
  },
];

export default async function AdminConfigPage() {
  const config = await getAllConfig();
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Configuration</h1>
      {GROUPS.map((group) => (
        <section key={group.title}>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {group.title}
          </h2>
          <div className="divide-y rounded-xl border bg-card">
            {group.keys.map(([key, label]) => (
              <ConfigRow
                key={key}
                configKey={key}
                label={label}
                value={config[key] as number | boolean}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

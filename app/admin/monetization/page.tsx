import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { Coins, Info } from "lucide-react";
import { db } from "@/lib/db";
import { coinPacks } from "@/lib/db/schema";
import { getAllConfig } from "@/lib/config";
import { ConfigRow } from "@/components/admin/config-editor";
import { CoinPackForm } from "@/components/admin/coin-pack-form";

export const metadata: Metadata = { title: "Admin · Monetization" };

export default async function AdminMonetizationPage() {
  const config = await getAllConfig();
  const packs = await db.select().from(coinPacks).orderBy(asc(coinPacks.sortOrder));

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="flex items-center gap-2 text-xl font-semibold">
        <Coins className="size-5" /> Monetization
      </h1>
      <p className="flex items-start gap-2 rounded-lg bg-accent/60 px-3 py-2 text-sm">
        <Info className="mt-0.5 size-4 shrink-0" />
        These switches are OFF by default in v1. Commission applies to future
        sales only. Coin packs additionally need a payment gateway before they
        can be sold — enabling the flag alone only reveals the wallet UI slot.
      </p>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Switches</h2>
        <div className="divide-y rounded-xl border bg-card">
          <ConfigRow
            configKey="commission_percent"
            label="Commission % per sale"
            value={config.commission_percent as number}
          />
          <ConfigRow
            configKey="coin_packs_enabled"
            label="Coin pack sales enabled"
            value={config.coin_packs_enabled as boolean}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
          Coin packs ({packs.length})
        </h2>
        <div className="space-y-2">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{pack.name}</p>
                <p className="text-xs text-muted-foreground">
                  {pack.coins} coins · ₹{(pack.priceInrPaise / 100).toFixed(2)}
                </p>
              </div>
              <span
                className={
                  pack.active
                    ? "text-xs font-medium text-emerald-600"
                    : "text-xs text-muted-foreground"
                }
              >
                {pack.active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
          <CoinPackForm />
        </div>
      </section>
    </div>
  );
}

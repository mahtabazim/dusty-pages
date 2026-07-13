"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { auditLog, coinPacks } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/session";

const packSchema = z.object({
  name: z.string().min(2).max(60),
  coins: z.number().int().min(1).max(100000),
  priceInr: z.number().min(1).max(100000),
});

/** Creates a coin pack (inactive) for the deferred coin-pack monetization. */
export async function createCoinPack(
  input: z.infer<typeof packSchema>,
): Promise<{ error?: string }> {
  const session = await requireAdmin();
  const parsed = packSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid pack details." };

  const [pack] = await db
    .insert(coinPacks)
    .values({
      name: parsed.data.name,
      coins: parsed.data.coins,
      priceInrPaise: Math.round(parsed.data.priceInr * 100),
    })
    .returning({ id: coinPacks.id });
  await db.insert(auditLog).values({
    actorId: session.user.id,
    action: "coinpack.create",
    targetType: "coin_pack",
    targetId: pack.id,
    data: parsed.data,
  });
  return {};
}

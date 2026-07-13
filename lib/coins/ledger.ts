import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, type Tx } from "@/lib/db";
import {
  coinLedger,
  dailyEarnings,
  wallets,
  type ledgerAccount,
  type ledgerType,
} from "@/lib/db/schema";
import { getConfig } from "@/lib/config";

type LedgerAccount = (typeof ledgerAccount.enumValues)[number];
type LedgerType = (typeof ledgerType.enumValues)[number];

export type LedgerEntry = {
  userId: string | null; // null = system account (mint/burn counterparty)
  account: LedgerAccount;
  type: LedgerType;
  amount: number; // positive credit, negative debit
  orderId?: string;
  note?: string;
};

export class InsufficientCoinsError extends Error {
  constructor() {
    super("Insufficient coin balance");
    this.name = "InsufficientCoinsError";
  }
}

async function ensureWallet(tx: Tx, userId: string) {
  await tx.insert(wallets).values({ userId }).onConflictDoNothing();
}

/** Locks a user's wallet row for the duration of the transaction. */
async function lockWallet(tx: Tx, userId: string) {
  await ensureWallet(tx, userId);
  const [wallet] = await tx
    .select()
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .for("update");
  return wallet;
}

/**
 * Writes one business event as a balanced group of ledger entries and updates
 * the cached wallet balances. Callers must have already locked the wallets of
 * any user whose balance is being spent (via lockWallet) and validated funds.
 * Throws if the group does not sum to zero.
 */
async function postLedgerGroup(tx: Tx, entries: LedgerEntry[]) {
  const sum = entries.reduce((acc, entry) => acc + entry.amount, 0);
  if (sum !== 0) {
    throw new Error(`Unbalanced ledger group (sum=${sum})`);
  }
  if (entries.some((entry) => entry.amount === 0)) {
    throw new Error("Zero-amount ledger entry");
  }

  const txGroupId = randomUUID();
  await tx.insert(coinLedger).values(
    entries.map((entry) => ({
      txGroupId,
      userId: entry.userId,
      account: entry.account,
      type: entry.type,
      amount: entry.amount,
      orderId: entry.orderId,
      note: entry.note,
    })),
  );

  for (const entry of entries) {
    if (!entry.userId) continue; // system account has no wallet row
    await ensureWallet(tx, entry.userId);
    if (entry.account === "available") {
      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} + ${entry.amount}` })
        .where(eq(wallets.userId, entry.userId));
    } else if (entry.account === "escrow") {
      await tx
        .update(wallets)
        .set({ escrowHeld: sql`${wallets.escrowHeld} + ${entry.amount}` })
        .where(eq(wallets.userId, entry.userId));
    }
  }
  return txGroupId;
}

/* ------------------------------------------------------------------ */
/* Bonuses (minted coins)                                              */
/* ------------------------------------------------------------------ */

/**
 * Mints a bonus to a user, enforcing the daily earn cap. Returns the amount
 * actually granted (0 if capped out or amount configured to 0).
 */
export async function grantBonus(
  userId: string,
  type: Extract<
    LedgerType,
    | "EARN_SIGNUP"
    | "EARN_REFERRAL"
    | "EARN_FIRST_LISTING"
    | "EARN_DAILY_LOGIN"
    | "EARN_REVIEW"
  >,
  amount: number,
  note?: string,
): Promise<number> {
  if (amount <= 0) return 0;
  const cap = await getConfig("daily_earn_cap_coins");
  const today = new Date().toISOString().slice(0, 10);

  return db.transaction(async (tx) => {
    await tx
      .insert(dailyEarnings)
      .values({ userId, day: today })
      .onConflictDoNothing();
    const [earnRow] = await tx
      .select()
      .from(dailyEarnings)
      .where(and(eq(dailyEarnings.userId, userId), eq(dailyEarnings.day, today)))
      .for("update");

    // Signup bonus is exempt from the daily cap; everything else is clamped.
    const granted =
      type === "EARN_SIGNUP"
        ? amount
        : Math.min(amount, Math.max(0, cap - earnRow.coinsEarned));
    if (granted <= 0) return 0;

    await postLedgerGroup(tx, [
      { userId: null, account: "system", type, amount: -granted, note },
      { userId, account: "available", type, amount: granted, note },
    ]);
    await tx
      .update(dailyEarnings)
      .set({ coinsEarned: sql`${dailyEarnings.coinsEarned} + ${granted}` })
      .where(and(eq(dailyEarnings.userId, userId), eq(dailyEarnings.day, today)));
    return granted;
  });
}

/** Idempotent signup bonus, called from the Better Auth user-create hook. */
export async function grantSignupBonus(userId: string) {
  const existing = await db
    .select({ id: coinLedger.id })
    .from(coinLedger)
    .where(and(eq(coinLedger.userId, userId), eq(coinLedger.type, "EARN_SIGNUP")))
    .limit(1);
  if (existing.length > 0) return 0;
  const amount = await getConfig("signup_bonus_coins");
  return grantBonus(userId, "EARN_SIGNUP", amount, "Welcome to DustyPages!");
}

/* ------------------------------------------------------------------ */
/* Escrow lifecycle                                                    */
/* ------------------------------------------------------------------ */

/**
 * Moves the purchase price from the buyer's available balance into escrow.
 * Must be called inside the transaction that creates the order.
 */
export async function holdEscrow(
  tx: Tx,
  opts: { buyerId: string; orderId: string; amount: number },
) {
  const wallet = await lockWallet(tx, opts.buyerId);
  if (wallet.balance < opts.amount) throw new InsufficientCoinsError();
  await postLedgerGroup(tx, [
    {
      userId: opts.buyerId,
      account: "available",
      type: "ESCROW_HOLD",
      amount: -opts.amount,
      orderId: opts.orderId,
    },
    {
      userId: opts.buyerId,
      account: "escrow",
      type: "ESCROW_HOLD",
      amount: opts.amount,
      orderId: opts.orderId,
    },
  ]);
}

/**
 * Releases escrowed coins to the seller on a completed sale, deducting the
 * configured commission (0% in v1; COMMISSION entries appear only when a
 * future admin enables it).
 */
export async function releaseEscrow(
  tx: Tx,
  opts: {
    buyerId: string;
    sellerId: string;
    orderId: string;
    amount: number;
    commission: number;
  },
) {
  await lockWallet(tx, opts.buyerId);
  const sellerNet = opts.amount - opts.commission;
  const entries: LedgerEntry[] = [
    {
      userId: opts.buyerId,
      account: "escrow",
      type: "ESCROW_RELEASE",
      amount: -opts.amount,
      orderId: opts.orderId,
    },
    {
      userId: opts.sellerId,
      account: "available",
      type: "EARN_SALE",
      amount: sellerNet,
      orderId: opts.orderId,
    },
  ];
  if (opts.commission > 0) {
    entries.push({
      userId: null,
      account: "system",
      type: "COMMISSION",
      amount: opts.commission,
      orderId: opts.orderId,
      note: "Marketplace commission",
    });
  }
  await postLedgerGroup(tx, entries);
}

/** Returns escrowed coins to the buyer (cancellation or dispute refund). */
export async function refundEscrow(
  tx: Tx,
  opts: { buyerId: string; orderId: string; amount: number },
) {
  await lockWallet(tx, opts.buyerId);
  await postLedgerGroup(tx, [
    {
      userId: opts.buyerId,
      account: "escrow",
      type: "ESCROW_REFUND",
      amount: -opts.amount,
      orderId: opts.orderId,
    },
    {
      userId: opts.buyerId,
      account: "available",
      type: "ESCROW_REFUND",
      amount: opts.amount,
      orderId: opts.orderId,
    },
  ]);
}

/** Dispute split: part of escrow to the seller, the rest back to the buyer. */
export async function splitEscrow(
  tx: Tx,
  opts: {
    buyerId: string;
    sellerId: string;
    orderId: string;
    amount: number;
    sellerShare: number;
  },
) {
  if (opts.sellerShare < 0 || opts.sellerShare > opts.amount) {
    throw new Error("sellerShare out of range");
  }
  await lockWallet(tx, opts.buyerId);
  const buyerShare = opts.amount - opts.sellerShare;
  const entries: LedgerEntry[] = [
    {
      userId: opts.buyerId,
      account: "escrow",
      type: "ESCROW_RELEASE",
      amount: -opts.amount,
      orderId: opts.orderId,
      note: "Dispute split",
    },
  ];
  if (opts.sellerShare > 0) {
    entries.push({
      userId: opts.sellerId,
      account: "available",
      type: "EARN_SALE",
      amount: opts.sellerShare,
      orderId: opts.orderId,
      note: "Dispute split",
    });
  }
  if (buyerShare > 0) {
    entries.push({
      userId: opts.buyerId,
      account: "available",
      type: "ESCROW_REFUND",
      amount: buyerShare,
      orderId: opts.orderId,
      note: "Dispute split",
    });
  }
  await postLedgerGroup(tx, entries);
}

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

/** Manual admin adjustment (positive grants, negative deducts). */
export async function adminAdjust(userId: string, amount: number, note: string) {
  return db.transaction(async (tx) => {
    const wallet = await lockWallet(tx, userId);
    if (amount < 0 && wallet.balance + amount < 0) {
      throw new InsufficientCoinsError();
    }
    await postLedgerGroup(tx, [
      { userId: null, account: "system", type: "ADMIN_ADJUST", amount: -amount, note },
      { userId, account: "available", type: "ADMIN_ADJUST", amount, note },
    ]);
  });
}

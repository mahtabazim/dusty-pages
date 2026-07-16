import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  Flame,
  Lock,
} from "lucide-react";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { coinLedger, wallets } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/top-bar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ClaimDailyBonus } from "@/components/wallet/claim-daily-bonus";
import { ReferralCard } from "@/components/wallet/referral-card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Wallet" };

const TYPE_LABELS: Record<string, string> = {
  EARN_SIGNUP: "Signup bonus",
  EARN_SALE: "Book sold",
  EARN_REFERRAL: "Referral bonus",
  EARN_FIRST_LISTING: "First listing bonus",
  EARN_DAILY_LOGIN: "Daily bonus",
  EARN_REVIEW: "Review bonus",
  SPEND_PURCHASE: "Book purchased",
  ESCROW_HOLD: "Held in escrow",
  ESCROW_RELEASE: "Escrow released",
  ESCROW_REFUND: "Escrow refunded",
  ADMIN_ADJUST: "Adjustment",
  PURCHASE_PACK: "Coin pack",
  COMMISSION: "Commission",
};

export default async function WalletPage() {
  const session = await requireUser();

  const [[wallet], history] = await Promise.all([
    db.select().from(wallets).where(eq(wallets.userId, session.user.id)),
    db
      .select()
      .from(coinLedger)
      .where(eq(coinLedger.userId, session.user.id))
      .orderBy(desc(coinLedger.createdAt))
      .limit(100),
  ]);

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl gap-8 px-4 py-4 md:grid md:grid-cols-[320px_1fr] md:items-start lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="space-y-1 py-5 text-center">
              <p className="text-sm opacity-80">Your balance</p>
              <p className="flex items-center justify-center gap-2 text-4xl font-bold">
                <Coins className="size-8" />
                {wallet?.balance ?? 0}
              </p>
              {(wallet?.escrowHeld ?? 0) > 0 && (
                <p className="flex items-center justify-center gap-1 text-sm opacity-80">
                  <Lock className="size-3.5" />
                  {wallet!.escrowHeld} coins in escrow
                </p>
              )}
            </CardContent>
          </Card>

          <ClaimDailyBonus streak={session.user.loginStreak ?? 0} />
          <ReferralCard code={session.user.referralCode ?? ""} />
        </div>

        <section className="mt-4 md:mt-0">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Flame className="size-4" /> Transaction history
          </h2>
          {history.length === 0 ? (
            <Empty className="border py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Coins />
                </EmptyMedia>
                <EmptyTitle>No transactions yet</EmptyTitle>
                <EmptyDescription>
                  Claim your daily bonus or sell a book to get started.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {history.map((entry) => {
                // Escrow-account entries are informative but noisy; show the
                // available-balance perspective plus escrow holds.
                if (entry.account === "escrow" && entry.type !== "ESCROW_HOLD") {
                  return null;
                }
                const positive = entry.amount > 0;
                const isEscrowHold = entry.account === "escrow";
                return (
                  <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full",
                        isEscrowHold
                          ? "bg-coin/15 text-coin"
                          : positive
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-red-500/15 text-red-600",
                      )}
                    >
                      {isEscrowHold ? (
                        <Lock className="size-4" />
                      ) : positive ? (
                        <ArrowDownLeft className="size-4" />
                      ) : (
                        <ArrowUpRight className="size-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {TYPE_LABELS[entry.type] ?? entry.type}
                        {isEscrowHold && " (pending)"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.note ?? format(entry.createdAt, "d MMM yyyy, h:mm a")}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isEscrowHold
                          ? "text-coin"
                          : positive
                            ? "text-emerald-600"
                            : "text-red-600",
                      )}
                    >
                      {positive ? "+" : ""}
                      {entry.amount}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

"use client";

import { useTransition } from "react";
import { Flame, Gift } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { claimDailyBonus } from "@/app/wallet/actions";
import { Spinner } from "@/components/ui/spinner";

export function ClaimDailyBonus({ streak }: { streak: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card p-4">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Gift className="size-4 text-primary" /> Daily bonus
        </p>
        <p className="text-xs text-muted-foreground">
          {streak > 1 ? (
            <span className="inline-flex items-center gap-1">
              <Flame className="size-3 text-orange-500" /> {streak}-day streak
            </span>
          ) : (
            "Claim free coins every day you visit"
          )}
        </p>
      </div>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await claimDailyBonus();
            if (result.error) toast.info(result.error);
            else if (result.granted === 0)
              toast.info("Daily earn cap reached — try again tomorrow.");
            else toast.success(`+${result.granted} coins! Streak: ${result.streak} days`);
          })
        }
      >
        {pending && <Spinner />}
        Claim
      </Button>
    </div>
  );
}

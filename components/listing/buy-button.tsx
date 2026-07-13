"use client";

import { useState, useTransition } from "react";
import { Coins, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buyListing } from "@/app/listing/actions";
import { Spinner } from "@/components/ui/spinner";

export function BuyButton({
  listingId,
  priceCoins,
  balance,
}: {
  listingId: string;
  priceCoins: number;
  balance: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const affordable = balance >= priceCoins;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" className="flex-1" />}>
        <Coins className="size-4" />
        Buy for {priceCoins}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm purchase</DialogTitle>
          <DialogDescription>
            {priceCoins} coins will be held in escrow and released to the
            seller only after you confirm receiving the book at the meetup.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted p-3 text-sm">
          <div className="flex justify-between">
            <span>Your balance</span>
            <span className="font-medium">{balance} coins</span>
          </div>
          <div className="flex justify-between">
            <span>This book</span>
            <span className="font-medium">−{priceCoins} coins</span>
          </div>
          <div className="mt-1 flex justify-between border-t pt-1">
            <span>After purchase</span>
            <span className="font-semibold">{balance - priceCoins} coins</span>
          </div>
        </div>
        {!affordable && (
          <p className="text-sm text-destructive">
            You need {priceCoins - balance} more coins — sell a book or claim
            your daily bonus.
          </p>
        )}
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-primary" />
          Escrow protected: cancel anytime before handover for an instant refund.
        </p>
        <DialogFooter>
          <Button
            disabled={!affordable || pending}
            onClick={() =>
              startTransition(async () => {
                const result = await buyListing(listingId);
                if (result?.error) toast.error(result.error);
              })
            }
          >
            {pending && <Spinner />}
            Confirm & hold in escrow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

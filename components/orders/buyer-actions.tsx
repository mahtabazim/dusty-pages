"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, QrCode, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { IsbnScanner } from "@/components/sell/isbn-scanner";
import { cancelOrderAction, confirmHandover } from "@/app/orders/actions";
import { Spinner } from "@/components/ui/spinner";

export function BuyerActions({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [pending, startTransition] = useTransition();

  function complete(token?: string) {
    startTransition(async () => {
      const result = await confirmHandover(orderId, token);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Handover confirmed — coins released to the seller!");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      {scanning && (
        <IsbnScanner
          onDetected={() => {}}
          onRawDetected={(text) => {
            const match = text.match(/^bb:handover:([\w-]+):([\w-]+)$/);
            if (match && match[1] === orderId) {
              setScanning(false);
              complete(match[2]);
            }
          }}
          onClose={() => setScanning(false)}
        />
      )}
      <Button size="lg" className="w-full" disabled={pending} onClick={() => setScanning(true)}>
        <QrCode className="size-4" />
        Scan seller&apos;s QR to confirm
      </Button>
      <Dialog>
        <DialogTrigger
          render={<Button variant="outline" size="lg" className="w-full" disabled={pending} />}
        >
          <CheckCircle2 className="size-4" />
          Confirm without scanning
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm you received the book?</DialogTitle>
            <DialogDescription>
              Only confirm after checking the book in person. This releases the
              escrowed coins to the seller and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={pending} onClick={() => complete()}>
              {pending && <Spinner />}
              Yes, release the coins
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await cancelOrderAction(orderId);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Order cancelled — coins refunded.");
              router.refresh();
            }
          })
        }
      >
        <XCircle className="size-4" />
        Cancel order (instant refund)
      </Button>
    </div>
  );
}

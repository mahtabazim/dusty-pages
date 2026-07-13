"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coins, ShieldBan, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { adjustUserCoins, setUserBanned } from "@/app/admin/actions";
import { Spinner } from "@/components/ui/spinner";

export function UserAdminActions({
  userId,
  banned,
}: {
  userId: string;
  banned: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={<Button variant="outline" size="icon-sm" aria-label="Adjust coins" />}
        >
          <Coins className="size-4" />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust coins</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              type="number"
              placeholder="Amount (negative to deduct)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Input
              placeholder="Reason (shown to the user)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={pending || !amount || !note.trim()}
              onClick={() =>
                startTransition(async () => {
                  const result = await adjustUserCoins(userId, Number(amount), note);
                  if (result.error) toast.error(result.error);
                  else {
                    toast.success("Balance adjusted");
                    setOpen(false);
                    router.refresh();
                  }
                })
              }
            >
              {pending && <Spinner />}
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button
        variant={banned ? "outline" : "destructive"}
        size="icon-sm"
        aria-label={banned ? "Unban user" : "Ban user"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await setUserBanned(userId, !banned);
            if (result.error) toast.error(result.error);
            else {
              toast.success(banned ? "User unbanned" : "User banned");
              router.refresh();
            }
          })
        }
      >
        {banned ? <ShieldCheck className="size-4" /> : <ShieldBan className="size-4" />}
      </Button>
    </div>
  );
}

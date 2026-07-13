"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reportListing } from "@/app/listing/actions";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const REASONS = [
  { value: "pirated", label: "Pirated / photocopy" },
  { value: "not_a_book", label: "Not a book" },
  { value: "wrong_info", label: "Misleading details" },
  { value: "offensive", label: "Offensive content" },
  { value: "spam", label: "Spam or scam" },
  { value: "other", label: "Other" },
];

export function ReportDialog({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground" />
        }
      >
        <Flag className="size-3.5" />
        Report listing
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this listing</DialogTitle>
        </DialogHeader>
        <ToggleGroup
          variant="outline"
          size="sm"
          className="flex-wrap"
          value={reason ? [reason] : []}
          onValueChange={(value) => {
            const next = value.at(-1);
            if (typeof next === "string") setReason(next);
          }}
        >
          {REASONS.map((r) => (
            <ToggleGroupItem key={r.value} value={r.value}>
              {r.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Textarea
          placeholder="Anything else we should know? (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={!reason || pending}
            onClick={() =>
              startTransition(async () => {
                const result = await reportListing(listingId, reason!, details || undefined);
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Thanks — our moderators will take a look.");
                  setOpen(false);
                }
              })
            }
          >
            {pending && <Spinner />}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

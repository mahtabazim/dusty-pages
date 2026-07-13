"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ImagePlus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { raiseDispute } from "@/app/orders/actions";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const REASONS = [
  "Book condition doesn't match the listing",
  "Wrong book / edition",
  "Seller didn't show up",
  "Buyer didn't show up",
  "Suspected fraud",
  "Other",
];

export function DisputeDialog({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function addEvidence(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("folder", "evidence");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvidence((urls) => [...urls, data.url].slice(0, 5));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="w-full text-destructive" />
        }
      >
        <AlertTriangle className="size-4" />
        Raise a dispute
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Raise a dispute</DialogTitle>
          <DialogDescription>
            The coins stay frozen in escrow while an admin reviews the case.
          </DialogDescription>
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
            <ToggleGroupItem key={r} value={r}>
              {r}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <Textarea
          placeholder="Describe what happened…"
          rows={3}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">
            {uploading ? (
              <Spinner />
            ) : (
              <ImagePlus className="size-4" />
            )}
            Add photo evidence
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) addEvidence(f);
              }}
            />
          </label>
          {evidence.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {evidence.length} photo{evidence.length > 1 ? "s" : ""} attached
            </span>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={!reason || pending}
            onClick={() =>
              startTransition(async () => {
                const result = await raiseDispute(orderId, {
                  reason: reason!,
                  details: details || undefined,
                  evidenceUrls: evidence,
                });
                if (result.error) toast.error(result.error);
                else {
                  toast.success("Dispute raised — an admin will review it.");
                  setOpen(false);
                  router.refresh();
                }
              })
            }
          >
            {pending && <Spinner />}
            Submit dispute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

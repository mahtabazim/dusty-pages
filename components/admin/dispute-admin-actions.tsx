"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveDisputeAction } from "@/app/admin/actions";
import { Spinner } from "@/components/ui/spinner";

export function DisputeAdminActions({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function run(outcome: "release" | "refund" | "split") {
    startTransition(async () => {
      const result = await resolveDisputeAction(disputeId, outcome, note);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`Dispute resolved (${outcome})`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Resolution note (sent to both parties)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="xs" disabled={pending} onClick={() => run("release")}>
          Release to seller
        </Button>
        <Button size="xs" variant="secondary" disabled={pending} onClick={() => run("refund")}>
          Refund buyer
        </Button>
        <Button size="xs" variant="outline" disabled={pending} onClick={() => run("split")}>
          Split 50/50
        </Button>
        {pending && <Spinner className="text-muted-foreground" />}
      </div>
    </div>
  );
}

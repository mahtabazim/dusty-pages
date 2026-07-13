"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { updateListingStatus } from "@/app/listing/actions";

export function SellerPanel({
  listingId,
  status,
}: {
  listingId: string;
  status: string;
}) {
  const [pending, startTransition] = useTransition();

  function run(action: "deactivate" | "relist" | "mark_sold") {
    startTransition(async () => {
      const result = await updateListingStatus(listingId, action);
      if (result.error) toast.error(result.error);
      else toast.success("Listing updated");
    });
  }

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      <p className="text-sm font-medium">Manage your listing</p>
      <div className="flex flex-wrap gap-2">
        {(status === "active" || status === "deactivated" || status === "expired") && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            render={<Link href={`/listing/${listingId}/edit`} />}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
        {status === "active" && (
          <>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => run("mark_sold")}>
              Mark as sold
            </Button>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => run("deactivate")}>
              Deactivate
            </Button>
          </>
        )}
        {(status === "deactivated" || status === "expired" || status === "sold") && (
          <Button variant="outline" size="sm" disabled={pending} onClick={() => run("relist")}>
            Relist
          </Button>
        )}
        {status === "reserved" && (
          <p className="text-sm text-muted-foreground">
            Order in progress — manage it from your orders page.
          </p>
        )}
        {pending && <Spinner className="text-muted-foreground" />}
      </div>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { handleReport } from "@/app/admin/actions";
import { Spinner } from "@/components/ui/spinner";

export function ReportAdminActions({
  reportId,
  targetType,
}: {
  reportId: string;
  targetType: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(decision: "dismiss" | "hide_listing" | "ban_user") {
    startTransition(async () => {
      const result = await handleReport(reportId, decision);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Report handled");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="xs" variant="outline" disabled={pending} onClick={() => run("dismiss")}>
        Dismiss
      </Button>
      {targetType === "listing" && (
        <Button size="xs" variant="secondary" disabled={pending} onClick={() => run("hide_listing")}>
          Hide listing
        </Button>
      )}
      <Button size="xs" variant="destructive" disabled={pending} onClick={() => run("ban_user")}>
        Ban user
      </Button>
      {pending && <Spinner className="text-muted-foreground" />}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { BellPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveSearch } from "@/app/search/actions";
import { Spinner } from "@/components/ui/spinner";

export function SaveSearchButton({
  params,
}: {
  params: Record<string, string | undefined>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await saveSearch(params);
          toast.success("Search saved — we'll notify you about new matches.");
        })
      }
    >
      {pending ? <Spinner className="size-3.5" /> : <BellPlus className="size-3.5" />}
      Notify me
    </Button>
  );
}

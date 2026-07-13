"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteSavedSearch } from "@/app/search/actions";
import { Spinner } from "@/components/ui/spinner";

export function DeleteSavedSearch({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete saved search"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteSavedSearch(id);
          router.refresh();
        })
      }
    >
      {pending ? (
        <Spinner />
      ) : (
        <Trash2 className="size-4 text-muted-foreground" />
      )}
    </Button>
  );
}

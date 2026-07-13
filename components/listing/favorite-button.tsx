"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFavorite } from "@/app/listing/actions";
import { cn } from "@/lib/utils";

export function FavoriteButton({
  listingId,
  initial,
}: {
  listingId: string;
  initial: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [liked, setLiked] = useOptimistic(initial);

  return (
    <Button
      variant="outline"
      size="icon-lg"
      aria-label={liked ? "Remove from favorites" : "Add to favorites"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setLiked(!liked);
          await toggleFavorite(listingId);
        })
      }
    >
      <Heart className={cn("size-5", liked && "fill-red-500 text-red-500")} />
    </Button>
  );
}

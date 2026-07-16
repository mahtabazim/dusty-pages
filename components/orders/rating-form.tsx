"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitRating } from "@/app/orders/actions";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export function RatingForm({
  orderId,
  rateeName,
}: {
  orderId: string;
  rateeName: string;
}) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <p className="text-sm font-medium">How was your trade with {rateeName}?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setStars(n)}
          >
            <Star
              className={cn(
                "size-7 transition-colors",
                n <= stars
                  ? "fill-star text-star"
                  : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Share a few words (optional)"
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button
        size="sm"
        disabled={stars === 0 || pending}
        onClick={() =>
          startTransition(async () => {
            const result = await submitRating(orderId, stars, comment || undefined);
            if (result.error) toast.error(result.error);
            else {
              toast.success("Thanks for rating!");
              router.refresh();
            }
          })
        }
      >
        {pending && <Spinner />}
        Submit rating
      </Button>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addBookReview } from "@/app/listing/actions";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export function BookReviewForm({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [stars, setStars] = useState(0);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2 rounded-xl border border-dashed bg-card p-3">
      <p className="text-sm font-medium">Read this book? Review it & earn coins</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setStars(n)}>
            <Star
              className={cn(
                "size-6",
                n <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        rows={2}
        placeholder="What did you think of it? (min 20 characters)"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Button
        size="sm"
        disabled={pending || stars === 0 || body.trim().length < 20}
        onClick={() =>
          startTransition(async () => {
            const result = await addBookReview(listingId, stars, body);
            if (result.error) toast.error(result.error);
            else {
              toast.success(
                result.coins
                  ? `Review posted — +${result.coins} coins!`
                  : "Review posted!",
              );
              setStars(0);
              setBody("");
              router.refresh();
            }
          })
        }
      >
        {pending && <Spinner />}
        Post review
      </Button>
    </div>
  );
}

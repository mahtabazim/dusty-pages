import { desc, eq, or, and, isNotNull } from "drizzle-orm";
import { Star } from "lucide-react";
import { format } from "date-fns";
import { db } from "@/lib/db";
import { bookReviews, user } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookReviewForm } from "./book-review-form";

/** Community reviews for the book (matched by ISBN across listings). */
export async function BookReviews({
  listingId,
  isbn,
  canReview,
}: {
  listingId: string;
  isbn: string | null;
  canReview: boolean;
}) {
  const reviews = await db
    .select({ review: bookReviews, author: { name: user.name, image: user.image } })
    .from(bookReviews)
    .innerJoin(user, eq(bookReviews.userId, user.id))
    .where(
      isbn
        ? or(
            eq(bookReviews.listingId, listingId),
            and(isNotNull(bookReviews.isbn), eq(bookReviews.isbn, isbn)),
          )
        : eq(bookReviews.listingId, listingId),
    )
    .orderBy(desc(bookReviews.createdAt))
    .limit(10);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">
        Reader reviews {reviews.length > 0 && `(${reviews.length})`}
      </h2>
      {reviews.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No reviews of this book yet — be the first and earn coins!
        </p>
      )}
      {reviews.map(({ review, author }) => (
        <div key={review.id} className="rounded-xl border bg-card p-3">
          <div className="flex items-center gap-2">
            <Avatar className="size-7">
              <AvatarImage src={author.image ?? undefined} />
              <AvatarFallback className="text-xs">
                {author.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{author.name}</span>
            <span className="ml-auto inline-flex items-center gap-0.5 text-sm">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {review.stars}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {format(review.createdAt, "d MMM yyyy")}
          </p>
        </div>
      ))}
      {canReview && <BookReviewForm listingId={listingId} />}
    </section>
  );
}

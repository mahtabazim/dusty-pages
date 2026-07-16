import { notFound } from "next/navigation";
import { and, avg, count, desc, eq } from "drizzle-orm";
import { BadgeCheck, Star, Users } from "lucide-react";
import { format } from "date-fns";
import { db } from "@/lib/db";
import {
  follows,
  listings,
  orders,
  ratings,
  user,
} from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { formatResponseTime, getAvgResponseMinutes } from "@/lib/seller-stats";
import { TopBar } from "@/components/top-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LISTING_GRID, ListingCard } from "@/components/listing-card";
import { FollowButton } from "@/components/profile/follow-button";

export default async function SellerPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getSession();

  const [seller] = await db.select().from(user).where(eq(user.id, id));
  if (!seller || seller.banned) notFound();

  const [
    [{ soldCount }],
    [ratingStats],
    [{ followerCount }],
    activeListings,
    reviews,
    myFollow,
  ] = await Promise.all([
    db
      .select({ soldCount: count() })
      .from(orders)
      .where(and(eq(orders.sellerId, id), eq(orders.status, "completed"))),
    db
      .select({ average: avg(ratings.stars), total: count() })
      .from(ratings)
      .where(eq(ratings.rateeId, id)),
    db
      .select({ followerCount: count() })
      .from(follows)
      .where(eq(follows.followedId, id)),
    db
      .select({
        id: listings.id,
        title: listings.title,
        author: listings.author,
        coverUrl: listings.coverUrl,
        priceCoins: listings.priceCoins,
        condition: listings.condition,
        city: listings.city,
        area: listings.area,
        createdAt: listings.createdAt,
      })
      .from(listings)
      .where(and(eq(listings.sellerId, id), eq(listings.status, "active")))
      .orderBy(desc(listings.createdAt))
      .limit(24),
    db
      .select({ rating: ratings, rater: { name: user.name, image: user.image } })
      .from(ratings)
      .innerJoin(user, eq(ratings.raterId, user.id))
      .where(eq(ratings.rateeId, id))
      .orderBy(desc(ratings.createdAt))
      .limit(10),
    session
      ? db
          .select()
          .from(follows)
          .where(
            and(eq(follows.followerId, session.user.id), eq(follows.followedId, id)),
          )
      : Promise.resolve([]),
  ]);

  const ratingAvg = ratingStats.average ? Number(ratingStats.average).toFixed(1) : null;
  const avgResponseMinutes = await getAvgResponseMinutes(id).catch(() => null);

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-4">
        <section className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarImage src={seller.image ?? undefined} />
            <AvatarFallback className="text-lg">
              {seller.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1.5 text-lg font-semibold">
              {seller.name}
              {seller.emailVerified && <BadgeCheck className="size-4 text-primary" />}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[seller.area, seller.city].filter(Boolean).join(", ") || "Location not set"} ·
              member since {format(seller.createdAt, "MMM yyyy")}
            </p>
            <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
              {ratingAvg && (
                <span className="inline-flex items-center gap-0.5">
                  <Star className="size-3 fill-star text-star" />
                  {ratingAvg} ({ratingStats.total})
                </span>
              )}
              <span>{soldCount} sold</span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" /> {followerCount} follower
                {followerCount === 1 ? "" : "s"}
              </span>
              {avgResponseMinutes != null && (
                <span>{formatResponseTime(avgResponseMinutes)}</span>
              )}
            </p>
          </div>
          {session && session.user.id !== id && (
            <FollowButton sellerId={id} following={myFollow.length > 0} />
          )}
        </section>

        {seller.bio && <p className="text-sm text-muted-foreground">{seller.bio}</p>}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            Books for sale ({activeListings.length})
          </h2>
          {activeListings.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No active listings right now. Follow to get notified about new books!
            </p>
          ) : (
            <div className={LISTING_GRID}>
              {activeListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        {reviews.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
              Reviews ({ratingStats.total})
            </h2>
            <ul className="space-y-2">
              {reviews.map(({ rating, rater }) => (
                <li key={rating.id} className="rounded-xl border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarImage src={rater.image ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {rater.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{rater.name}</span>
                    <span className="ml-auto inline-flex items-center gap-0.5 text-sm">
                      <Star className="size-3.5 fill-star text-star" />
                      {rating.stars}
                    </span>
                  </div>
                  {rating.comment && (
                    <p className="mt-2 text-sm text-muted-foreground">{rating.comment}</p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {format(rating.createdAt, "d MMM yyyy")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}

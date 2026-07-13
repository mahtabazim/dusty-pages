import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { and, avg, count, eq, sql } from "drizzle-orm";
import {
  BadgeCheck,
  BookOpen,
  Coins,
  MapPin,
  MessageCircle,
  ShieldAlert,
  Star,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { db } from "@/lib/db";
import {
  favorites,
  listings,
  orders,
  ratings,
  user,
  wallets,
} from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { formatDistance, haversineKm } from "@/lib/geo";
import { TopBar } from "@/components/top-bar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BuyButton } from "@/components/listing/buy-button";
import { FavoriteButton } from "@/components/listing/favorite-button";
import { ReportDialog } from "@/components/listing/report-dialog";
import { SellerPanel } from "@/components/listing/seller-panel";
import { BookReviews } from "@/components/listing/book-reviews";
import { CONDITION_LABELS } from "@/components/listing-card";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const [listing] = await db
    .select({
      title: listings.title,
      author: listings.author,
      priceCoins: listings.priceCoins,
      condition: listings.condition,
      city: listings.city,
      coverUrl: listings.coverUrl,
      status: listings.status,
    })
    .from(listings)
    .where(eq(listings.id, id))
    .catch(() => []);
  if (!listing) return { title: "Book not found" };

  const title = listing.author
    ? `${listing.title} by ${listing.author}`
    : listing.title;
  const description = `${CONDITION_LABELS[listing.condition]} copy for ${listing.priceCoins} coins${listing.city ? ` in ${listing.city}` : ""} on DustyPages.`;
  return {
    title,
    description,
    robots: listing.status === "active" ? undefined : { index: false },
    openGraph: {
      title,
      description,
      ...(listing.coverUrl ? { images: [listing.coverUrl] } : {}),
    },
  };
}

export default async function ListingPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await getSession();

  const [row] = await db
    .select({
      listing: listings,
      seller: {
        id: user.id,
        name: user.name,
        image: user.image,
        city: user.city,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
      },
    })
    .from(listings)
    .innerJoin(user, eq(listings.sellerId, user.id))
    .where(eq(listings.id, id));
  if (!row) notFound();
  const { listing, seller } = row;

  const isOwner = session?.user.id === seller.id;
  const hidden = listing.status === "hidden" || listing.status === "deactivated";
  if (hidden && !isOwner && session?.user.role !== "admin") notFound();

  const [[sellerStats], [ratingStats], favoriteRows, walletRows] =
    await Promise.all([
      db
        .select({ soldCount: count() })
        .from(orders)
        .where(and(eq(orders.sellerId, seller.id), eq(orders.status, "completed"))),
      db
        .select({ average: avg(ratings.stars), total: count() })
        .from(ratings)
        .where(eq(ratings.rateeId, seller.id)),
      session
        ? db
            .select()
            .from(favorites)
            .where(
              and(eq(favorites.userId, session.user.id), eq(favorites.listingId, id)),
            )
        : Promise.resolve([]),
      session
        ? db
            .select({ balance: wallets.balance })
            .from(wallets)
            .where(eq(wallets.userId, session.user.id))
        : Promise.resolve([]),
    ]);

  // Fire-and-forget view counter (not for the owner).
  if (!isOwner) {
    db.update(listings)
      .set({ viewCount: sql`${listings.viewCount} + 1` })
      .where(eq(listings.id, id))
      .catch(() => {});
  }

  const ratingAvg = ratingStats.average ? Number(ratingStats.average).toFixed(1) : null;

  const distanceKm =
    session?.user.latitude != null &&
    session?.user.longitude != null &&
    listing.latitude != null &&
    listing.longitude != null
      ? haversineKm(
          session.user.latitude,
          session.user.longitude,
          listing.latitude,
          listing.longitude,
        )
      : null;

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-4 pb-28 md:pb-8">
        {listing.status !== "active" && (
          <div className="mb-3 rounded-lg bg-muted px-4 py-2 text-sm font-medium">
            {listing.status === "reserved" && "An order is in progress for this book."}
            {listing.status === "sold" && "This book has been sold."}
            {listing.status === "hidden" && "This listing is hidden pending review."}
            {listing.status === "deactivated" && "This listing is deactivated."}
            {listing.status === "expired" && "This listing has expired."}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[280px_1fr] lg:grid-cols-[340px_1fr]">
          <div className="relative mx-auto aspect-3/4 w-56 overflow-hidden rounded-xl border bg-muted md:w-full">
            {listing.coverUrl ? (
              <Image
                src={listing.coverUrl}
                alt={listing.title}
                fill
                sizes="280px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="size-14 text-muted-foreground/40" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-xl font-semibold leading-tight">{listing.title}</h1>
                {session && !isOwner && (
                  <FavoriteButton listingId={listing.id} initial={favoriteRows.length > 0} />
                )}
              </div>
              {listing.author && (
                <p className="text-muted-foreground">{listing.author}</p>
              )}
            </div>

            <p className="flex items-center gap-1.5 text-2xl font-bold text-primary">
              <Coins className="size-6 text-amber-600 dark:text-amber-400" />
              {listing.priceCoins} coins
            </p>

            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">{CONDITION_LABELS[listing.condition]}</Badge>
              <Badge variant="outline">{listing.language}</Badge>
              {listing.edition && <Badge variant="outline">Edition: {listing.edition}</Badge>}
              {listing.publishedYear && <Badge variant="outline">{listing.publishedYear}</Badge>}
              {listing.mrpInr && <Badge variant="outline">MRP ₹{listing.mrpInr}</Badge>}
            </div>

            <p className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {[listing.area, listing.city].filter(Boolean).join(", ") || "Location not set"}
              {distanceKm != null && (
                <>
                  <span aria-hidden>·</span>
                  <span className="font-medium text-foreground">
                    {formatDistance(distanceKm)} away
                  </span>
                </>
              )}
              <span aria-hidden>·</span>
              listed {formatDistanceToNow(listing.createdAt, { addSuffix: true })}
              <span aria-hidden>·</span>
              {listing.viewCount} views
            </p>

            {listing.description && (
              <div>
                <h2 className="mb-1 text-sm font-semibold">Description</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Seller card */}
            <Link
              href={`/seller/${seller.id}`}
              className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent/50"
            >
              <Avatar className="size-11">
                <AvatarImage src={seller.image ?? undefined} />
                <AvatarFallback>{seller.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 font-medium">
                  {seller.name}
                  {seller.emailVerified && (
                    <BadgeCheck className="size-4 text-primary" aria-label="Verified" />
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ratingAvg ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      {ratingAvg} ({ratingStats.total})
                    </span>
                  ) : (
                    "No ratings yet"
                  )}{" "}
                  · {sellerStats.soldCount} sold · member since{" "}
                  {format(seller.createdAt, "MMM yyyy")}
                </p>
              </div>
            </Link>

            <Alert>
              <ShieldAlert />
              <AlertTitle>Escrow protected</AlertTitle>
              <AlertDescription>
                Meet in a public place and check the book before confirming the
                handover. Coins stay in escrow until you confirm.
              </AlertDescription>
            </Alert>

            {isOwner ? (
              <SellerPanel listingId={listing.id} status={listing.status} />
            ) : listing.status === "active" && session ? (
              <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-card/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
                <div className="mx-auto flex max-w-3xl gap-2">
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    render={<Link href={`/chats/start/${listing.id}`} />}
                  >
                    <MessageCircle className="size-4" />
                    Chat & offer
                  </Button>
                  <BuyButton
                    listingId={listing.id}
                    priceCoins={listing.priceCoins}
                    balance={walletRows[0]?.balance ?? 0}
                  />
                </div>
              </div>
            ) : listing.status === "active" ? (
              <Button size="lg" className="w-full" render={<Link href="/login" />}>
                Log in to buy or chat
              </Button>
            ) : null}

            {session && !isOwner && <ReportDialog listingId={listing.id} />}
          </div>
        </div>

        <div className="mt-8 max-w-3xl">
          <BookReviews
            listingId={listing.id}
            isbn={listing.isbn}
            canReview={!!session && !isOwner}
          />
        </div>
      </main>
    </>
  );
}

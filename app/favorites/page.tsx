import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Heart } from "lucide-react";
import { db } from "@/lib/db";
import { favorites, listings } from "@/lib/db/schema";
import { requireUser } from "@/lib/session";
import { TopBar } from "@/components/top-bar";
import { LISTING_GRID, ListingCard } from "@/components/listing-card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const session = await requireUser();

  const rows = await db
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
    .from(favorites)
    .innerJoin(listings, eq(favorites.listingId, listings.id))
    .where(eq(favorites.userId, session.user.id))
    .orderBy(desc(favorites.createdAt))
    .limit(60);

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-4">
        <h1 className="mb-3 flex items-center gap-2 text-xl font-semibold">
          <Heart className="size-5 text-red-500" /> Favorites
        </h1>
        {rows.length === 0 ? (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Heart />
              </EmptyMedia>
              <EmptyTitle>No favorites yet</EmptyTitle>
              <EmptyDescription>
                Tap the heart on any book to save it here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className={LISTING_GRID}>
            {rows.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

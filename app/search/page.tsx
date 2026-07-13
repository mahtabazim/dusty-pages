import type { Metadata } from "next";
import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL } from "drizzle-orm";
import { SearchX } from "lucide-react";
import { db } from "@/lib/db";
import { categories, listings } from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { listingDistanceKm } from "@/lib/geo";
import { TopBar } from "@/components/top-bar";
import { ListingCard } from "@/components/listing-card";
import { SearchFilters } from "@/components/search/search-filters";
import { SaveSearchButton } from "@/components/search/save-search-button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = { title: "Search books" };

type Params = {
  q?: string;
  category?: string;
  min?: string;
  max?: string;
  condition?: string;
  language?: string;
  city?: string;
  sort?: string;
};

export default async function SearchPage(props: {
  searchParams: Promise<Params>;
}) {
  const params = await props.searchParams;
  const session = await getSession();

  const conditions: SQL[] = [eq(listings.status, "active")];
  if (params.q) {
    const q = `%${params.q}%`;
    conditions.push(
      or(ilike(listings.title, q), ilike(listings.author, q), eq(listings.isbn, params.q))!,
    );
  }
  if (params.category) conditions.push(eq(listings.categorySlug, params.category));
  if (params.min) conditions.push(gte(listings.priceCoins, Number(params.min)));
  if (params.max) conditions.push(lte(listings.priceCoins, Number(params.max)));
  if (params.condition) {
    conditions.push(
      eq(listings.condition, params.condition as (typeof listings.condition.enumValues)[number]),
    );
  }
  if (params.language) conditions.push(ilike(listings.language, params.language));
  if (params.city) conditions.push(ilike(listings.city, `%${params.city}%`));

  const userCity = params.city ?? session?.user.city ?? null;
  const userLat = session?.user.latitude ?? null;
  const userLng = session?.user.longitude ?? null;
  const hasCoords = userLat != null && userLng != null;
  const distanceExpr = hasCoords ? listingDistanceKm(userLat, userLng) : null;

  const orderBy = (() => {
    switch (params.sort) {
      case "price_asc":
        return [asc(listings.priceCoins)];
      case "price_desc":
        return [desc(listings.priceCoins)];
      case "popular":
        return [desc(listings.viewCount)];
      case "nearest":
        // True distance when the user shared their location; city match as a
        // fallback signal otherwise.
        if (distanceExpr) return [sql`${distanceExpr} asc nulls last`];
        return userCity
          ? [
              sql`CASE WHEN ${listings.city} = ${userCity} THEN 0 ELSE 1 END`,
              desc(listings.createdAt),
            ]
          : [desc(listings.createdAt)];
      default:
        return [desc(listings.createdAt)];
    }
  })();

  const [results, cats] = await Promise.all([
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
        distanceKm: distanceExpr ?? sql<number | null>`null`,
      })
      .from(listings)
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(60),
    db
      .select({ slug: categories.slug, name: categories.name })
      .from(categories)
      .where(eq(categories.active, true))
      .orderBy(asc(categories.sortOrder)),
  ]);
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl space-y-4 px-4 py-4">
        <SearchFilters categories={cats} initial={params} />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {results.length === 60 ? "60+" : results.length} book
            {results.length === 1 ? "" : "s"} found
          </p>
          {session && (params.q || params.category) && (
            <SaveSearchButton params={params} />
          )}
        </div>
        {results.length === 0 ? (
          <Empty className="border py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>No books match</EmptyTitle>
              <EmptyDescription>
                Try widening your filters — or save this search and we&apos;ll
                notify you when a match is listed.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

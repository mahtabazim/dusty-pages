import Link from "next/link";
import { desc, eq, sql, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { banners, categories, listings } from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { TopBar } from "@/components/top-bar";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  BookOpen,
  Coins,
  Flame,
  GraduationCap,
  HandCoins,
  Sparkles,
  Star,
} from "lucide-react";
import { CategoryIcon } from "@/components/icons";

const COLLECTIONS = [
  { label: "Under 50 coins", icon: Coins, href: "/search?max=50&sort=price_asc" },
  { label: "Like-new picks", icon: Sparkles, href: "/search?condition=like_new" },
  { label: "Exam season", icon: GraduationCap, href: "/search?category=competitive-exams" },
  { label: "Textbooks", icon: BookOpen, href: "/search?category=academic" },
  { label: "Most wanted", icon: Flame, href: "/search?sort=popular" },
];

export default async function HomePage() {
  const session = await getSession();
  const userCity = session?.user.city ?? null;

  const [cats, activeBanners, feed] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.active, true))
      .orderBy(asc(categories.sortOrder)),
    db
      .select()
      .from(banners)
      .where(eq(banners.active, true))
      .orderBy(asc(banners.sortOrder))
      .limit(5),
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
      .where(eq(listings.status, "active"))
      .orderBy(
          sql`CASE WHEN ${listings.city} = ${userCity} THEN 0 ELSE 1 END`,
        desc(listings.createdAt),
      )
      .limit(24),
  ]);

  return (
    <>
      <TopBar />
      
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-4">
        {!session && (
          <section className="rounded-2xl bg-primary px-6 py-10 text-primary-foreground md:px-12 md:py-14">
            <div className="mx-auto max-w-2xl space-y-4 text-center">
              <Badge variant="secondary">No money. Just books & coins.</Badge>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Swap your finished books for your next great read
              </h1>
              <p className="text-sm opacity-90 md:text-base">
                Sell used books to readers near you, earn coins, and spend them
                on books from the community — with escrow-protected meetups.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="lg" variant="secondary" render={<Link href="/signup" />}>
                  Join free — get 100 coins
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  render={<Link href="/search" />}
                >
                  Browse books
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3 text-xs opacity-90 md:text-sm">
                <span className="flex flex-col items-center gap-1">
                  <BookOpen className="size-5" /> List in 1 minute
                </span>
                <span className="flex flex-col items-center gap-1">
                  <HandCoins className="size-5" /> Earn coins selling
                </span>
                <span className="flex flex-col items-center gap-1">
                  <Star className="size-5" /> Trusted local meetups
                </span>
              </div>
            </div>
          </section>
        )}

        {activeBanners.length > 0 && (
          <div className="flex gap-3 overflow-x-auto ">
            {activeBanners.map((b) => (
              <Link
                key={b.id}
                href={b.url ?? "#"}
                className="min-w-[280px] flex-1 rounded-xl bg-accent px-5 py-4 font-medium"
              >
                {b.title}
              </Link>
            ))}
          </div>
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            Browse categories
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hidden">
            {cats.map((c) => (
              <Link
                key={c.slug}
                href={`/search?category=${c.slug}`}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                <CategoryIcon slug={c.slug} className="size-4 text-primary" />
                {c.name}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            Curated collections
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hidden">
            {COLLECTIONS.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                <c.icon className="size-4 text-primary" />
                {c.label}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
            {userCity ? `Books near ${userCity}` : "Fresh arrivals"}
          </h2>
          {feed.length === 0 ? (
            <Empty className="border py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Coins />
                </EmptyMedia>
                <EmptyTitle>No books listed yet</EmptyTitle>
                <EmptyDescription>
                  Be the first — <Link href="/sell">sell a book</Link> and earn
                  bonus coins!
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {feed.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      </main>
      <div className="sticky bottom-4">
        <a href="https://peerlist.io/mdmahtab/project/dustypages" target="_blank" rel="noreferrer">
				<img
					src="https://peerlist.io/api/v1/projects/embed/PRJHDNDA987P6D97R27NNMLEJA7KMP?showUpvote=false&theme=light"
					alt="DustyPages"
          width={'auto'}
          height={'72px'}
				/>
			</a>
      </div>
    </>
  );
}
